import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { bn } from "@/data/catalog";
import { ProductImage } from "@/components/ProductImage";
import {
  exportImageIssuesCsv,
  getImageAuditSummary,
  listImageIssues,
  listImportRuns,
  rescanImages,
  runImageImport,
} from "@/lib/images.functions";

const STATUS_LABEL: Record<string, string> = {
  ok: "ঠিক আছে",
  placeholder: "প্লেসহোল্ডার",
  duplicate: "ভুল ম্যাপিং সন্দেহ",
  missing: "ছবি নেই",
  broken: "লোড হয় না",
  unknown: "যাচাই হয়নি",
};

const STATUS_TONE: Record<string, string> = {
  ok: "bg-primary/10 text-primary",
  placeholder: "bg-secondary text-muted-foreground",
  duplicate: "bg-sale/10 text-sale",
  missing: "bg-sale/10 text-sale",
  broken: "bg-destructive/10 text-destructive",
};

export function ImageAudit() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [source, setSource] = useState<"medex" | "medeasy">("medex");
  const [batch, setBatch] = useState(25);

  const summaryFn = useServerFn(getImageAuditSummary);
  const issuesFn = useServerFn(listImageIssues);
  const csvFn = useServerFn(exportImageIssuesCsv);
  const rescanFn = useServerFn(rescanImages);
  const importFn = useServerFn(runImageImport);
  const runsFn = useServerFn(listImportRuns);

  const summary = useQuery({ queryKey: ["img-summary"], queryFn: () => summaryFn({}) });
  const issues = useQuery({
    queryKey: ["img-issues", status, q, page],
    queryFn: () => issuesFn({ data: { status, q, limit: 25, offset: page * 25 } }),
  });
  const runs = useQuery({ queryKey: ["img-runs"], queryFn: () => runsFn({}) });

  const refreshAll = () => {
    void qc.invalidateQueries({ queryKey: ["img-summary"] });
    void qc.invalidateQueries({ queryKey: ["img-issues"] });
    void qc.invalidateQueries({ queryKey: ["img-runs"] });
  };

  const doImport = useMutation({
    mutationFn: (mode: "missing" | "failed") => importFn({ data: { source, mode, limit: batch } }),
    onSuccess: (r) => {
      toast.success(`ইমপোর্ট শেষ — সফল ${bn(r.ok)} টি, ব্যর্থ ${bn(r.failed)} টি`);
      refreshAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doRescan = useMutation({
    mutationFn: () => rescanFn({ data: { limit: 60 } }),
    onSuccess: (r) => {
      toast.success(`যাচাই সম্পন্ন — ${bn(r.checked)} টি পণ্য, ভাঙা ${bn(r.broken)} টি`);
      refreshAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doCsv = useMutation({
    mutationFn: () => csvFn({ data: { status } }),
    onSuccess: (r) => {
      const blob = new Blob(["\ufeff" + r.csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `image-audit-${status}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`${bn(r.rows)} টি রেকর্ড CSV ডাউনলোড হয়েছে`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const c = summary.data?.counts ?? {};
  const total = summary.data?.total ?? 0;
  const okPct = total ? Math.round(((c["ok"] ?? 0) / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat t="মোট পণ্য" v={bn(total)} />
        <Stat t="সঠিক ছবি" v={`${bn(c["ok"] ?? 0)} (${bn(okPct)}%)`} />
        <Stat t="প্লেসহোল্ডার" v={bn(c["placeholder"] ?? 0)} warn />
        <Stat t="ভুল ম্যাপিং" v={bn(c["duplicate"] ?? 0)} warn />
        <Stat t="ছবি নেই" v={bn(c["missing"] ?? 0)} warn />
        <Stat t="লোড হয় না" v={bn(c["broken"] ?? 0)} warn />
      </div>
      <p className="text-[11px] text-muted-foreground">
        ঔষধের ছবি (দ্বিতীয় ছবি) আছে {bn(summary.data?.withMedicine ?? 0)} টি পণ্যের।
        {summary.data?.lastCheckedAt && ` শেষ যাচাই: ${new Date(summary.data.lastCheckedAt).toLocaleString("bn-BD")}`}
      </p>

      {/* import controls */}
      <div className="rounded-xl border border-border bg-card p-3">
        <h3 className="text-xs font-bold">ছবি ইমপোর্ট ও পুনরায় যাচাই</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as "medex" | "medeasy")}
            className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
          >
            <option value="medex">medex.com.bd (বক্স + ঔষধ)</option>
            <option value="medeasy">medeasy.health</option>
          </select>
          <select
            value={batch}
            onChange={(e) => setBatch(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
          >
            {[10, 25, 40].map((n) => (
              <option key={n} value={n}>{bn(n)} টি করে</option>
            ))}
          </select>
          <button
            disabled={doImport.isPending}
            onClick={() => doImport.mutate("missing")}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {doImport.isPending ? "ইমপোর্ট চলছে..." : "ছবি ইমপোর্ট করুন"}
          </button>
          <button
            disabled={doImport.isPending}
            onClick={() => doImport.mutate("failed")}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            ব্যর্থ রেকর্ড রিট্রাই ({bn(runs.data?.failureCount ?? 0)})
          </button>
          <button
            disabled={doRescan.isPending}
            onClick={() => doRescan.mutate()}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {doRescan.isPending ? "যাচাই হচ্ছে..." : "ছবি লোড যাচাই"}
          </button>
        </div>
      </div>

      {/* issue list */}
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
          >
            <option value="all">সব সমস্যা</option>
            {["placeholder", "duplicate", "missing", "broken", "ok"].map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="পণ্যের নাম খুঁজুন"
            className="min-w-[8rem] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
          />
          <button
            disabled={doCsv.isPending}
            onClick={() => doCsv.mutate()}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {doCsv.isPending ? "তৈরি হচ্ছে..." : "CSV ডাউনলোড"}
          </button>
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground">মোট {bn(issues.data?.count ?? 0)} টি রেকর্ড</p>

        <div className="mt-2 space-y-2">
          {issues.isLoading && <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>}
          {(issues.data?.rows ?? []).map((r: any) => (
            <div key={r.product_id} className="flex items-center gap-3 rounded-lg border border-border p-2">
              <div className="w-14 shrink-0">
                <ProductImage src={r.box_url} alt={r.product_name} ratio="square" className="rounded-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{r.product_name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{r.product_id} · {r.note || "—"}</p>
              </div>
              <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[r.status] ?? "bg-secondary"}`}>
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </div>
          ))}
          {!issues.isLoading && (issues.data?.rows ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">কোনো রেকর্ড নেই।</p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
          >
            আগের
          </button>
          <span className="text-[11px] text-muted-foreground">পৃষ্ঠা {bn(page + 1)}</span>
          <button
            disabled={(page + 1) * 25 >= (issues.data?.count ?? 0)}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
          >
            পরের
          </button>
        </div>
      </div>

      {/* logs */}
      <div className="rounded-xl border border-border bg-card p-3">
        <h3 className="text-xs font-bold">ইমপোর্ট লগ</h3>
        <div className="mt-2 space-y-1">
          {(runs.data?.runs ?? []).map((r: any) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-[11px]">
              <span className="font-semibold">{r.source}</span>
              <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("bn-BD")}</span>
              <span>মোট {bn(r.total)}</span>
              <span className="text-primary">সফল {bn(r.ok_count)}</span>
              <span className={r.fail_count > 0 ? "text-sale" : "text-muted-foreground"}>ব্যর্থ {bn(r.fail_count)}</span>
              <span className="ml-auto rounded bg-secondary px-1.5 py-0.5">{r.status}</span>
            </div>
          ))}
          {(runs.data?.runs ?? []).length === 0 && <p className="text-xs text-muted-foreground">এখনো কোনো ইমপোর্ট চালানো হয়নি।</p>}
        </div>

        <h3 className="mt-3 text-xs font-bold">ব্যর্থ রেকর্ড ({bn(runs.data?.failureCount ?? 0)})</h3>
        <div className="mt-2 space-y-1">
          {(runs.data?.failures ?? []).slice(0, 40).map((f: any) => (
            <div key={f.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-[11px]">
              <span className="min-w-0 flex-1 truncate font-semibold">{f.product_name || f.product_id}</span>
              <span className="truncate text-muted-foreground">{f.reason}</span>
              <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5">{bn(f.attempts)} বার</span>
            </div>
          ))}
          {(runs.data?.failures ?? []).length === 0 && <p className="text-xs text-muted-foreground">কোনো ব্যর্থ রেকর্ড নেই।</p>}
        </div>
      </div>
    </div>
  );
}

function Stat({ t, v, warn }: { t: string; v: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] text-muted-foreground">{t}</p>
      <p className={`mt-1 text-base font-bold ${warn ? "text-sale" : "text-primary-dark"}`}>{v}</p>
    </div>
  );
}
