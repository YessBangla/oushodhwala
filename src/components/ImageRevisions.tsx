import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  approveRevisions,
  autoFetchAlternates,
  getRevisionSummary,
  listImageAudit,
  listRevisions,
  rejectRevisions,
  rollbackRevisions,
} from "@/lib/revisions.functions";

const STATUS_LABEL: Record<string, string> = {
  pending: "অপেক্ষমাণ",
  approved: "অনুমোদিত",
  rejected: "বাতিল",
  rolled_back: "রোলব্যাক করা",
};

const METHOD_LABEL: Record<string, string> = {
  "unwatermark": "ওয়াটারমার্ক মুছে ফেলা",
  "alt-source": "বিকল্প সোর্সের ছবি",
};

const ACTION_LABEL: Record<string, string> = {
  approve: "অনুমোদন",
  reject: "বাতিল",
  rollback: "রোলব্যাক",
  "fetch-alt": "বিকল্প ছবি আনা",
};

const TONE: Record<string, string> = {
  pending: "bg-secondary text-muted-foreground",
  approved: "bg-primary/10 text-primary",
  rejected: "bg-destructive/10 text-destructive",
  rolled_back: "bg-sale/10 text-sale",
};

function Frame({ url, label }: { url: string; label: string }) {
  return (
    <div className="flex-1">
      <p className="mb-1 text-[11px] text-muted-foreground">{label}</p>
      <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-card">
        {url ? (
          <img src={url} alt={label} loading="lazy" className="absolute inset-0 h-full w-full object-contain p-1" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">ছবি নেই</div>
        )}
      </div>
    </div>
  );
}

export function ImageRevisions() {
  const qc = useQueryClient();
  const [view, setView] = useState<"gallery" | "audit">("gallery");
  const [status, setStatus] = useState("pending");
  const [method, setMethod] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<string[]>([]);
  const [altBatch, setAltBatch] = useState(20);

  const summaryFn = useServerFn(getRevisionSummary);
  const listFn = useServerFn(listRevisions);
  const auditFn = useServerFn(listImageAudit);
  const approveFn = useServerFn(approveRevisions);
  const rejectFn = useServerFn(rejectRevisions);
  const rollbackFn = useServerFn(rollbackRevisions);
  const altFn = useServerFn(autoFetchAlternates);

  const summary = useQuery({ queryKey: ["rev-summary"], queryFn: () => summaryFn({}) });
  const list = useQuery({
    queryKey: ["rev-list", status, method, q, page],
    queryFn: () => listFn({ data: { status, method, q, limit: 24, offset: page * 24 } }),
  });
  const audit = useQuery({
    queryKey: ["rev-audit", q],
    queryFn: () => auditFn({ data: { q, limit: 60 } }),
    enabled: view === "audit",
  });

  const refresh = () => {
    setSel([]);
    void qc.invalidateQueries({ queryKey: ["rev-summary"] });
    void qc.invalidateQueries({ queryKey: ["rev-list"] });
    void qc.invalidateQueries({ queryKey: ["rev-audit"] });
  };

  const approve = useMutation({
    mutationFn: (ids: string[]) => approveFn({ data: { ids } }),
    onSuccess: (r: any) => { toast.success(`${r.applied}টি ছবি লাইভ হলো`); refresh(); },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  });
  const reject = useMutation({
    mutationFn: (ids: string[]) => rejectFn({ data: { ids } }),
    onSuccess: (r: any) => { toast.success(`${r.rejected}টি বাতিল হলো`); refresh(); },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  });
  const rollback = useMutation({
    mutationFn: (ids: string[]) => rollbackFn({ data: { ids } }),
    onSuccess: (r: any) => { toast.success(`${r.restored}টি আগের ছবিতে ফেরানো হলো`); refresh(); },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  });
  const autoAlt = useMutation({
    mutationFn: () => altFn({ data: { limit: altBatch } }),
    onSuccess: (r: any) => { toast.success(`${r.scanned}টি যাচাই — ${r.queued}টি বিকল্প ছবি যুক্ত হলো`); refresh(); },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  });

  const rows: any[] = (list.data as any)?.rows ?? [];
  const count = (list.data as any)?.count ?? 0;
  const s: any = summary.data ?? {};
  const allSelected = rows.length > 0 && sel.length === rows.length;

  const stat = (label: string, value: number | string, tone = "") => (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {stat("অপেক্ষমাণ", s.counts?.pending ?? 0)}
        {stat("অনুমোদিত", s.counts?.approved ?? 0, "text-primary")}
        {stat("বাতিল", s.counts?.rejected ?? 0, "text-destructive")}
        {stat("রোলব্যাক", s.counts?.rolled_back ?? 0, "text-sale")}
        {stat("এখনো ওয়াটারমার্কযুক্ত", s.watermarked ?? 0)}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["gallery", "audit"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-lg px-3 py-1.5 text-sm ${view === v ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {v === "gallery" ? "রিভিউ গ্যালারি" : "অডিট লগ"}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(0); }}
          placeholder="পণ্যের নাম/আইডি খুঁজুন"
          className="h-9 min-w-[180px] flex-1 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <button onClick={refresh} className="rounded-lg bg-secondary px-3 py-1.5 text-sm">রিফ্রেশ</button>
      </div>

      {view === "gallery" && (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="h-9 rounded-lg border border-border bg-background px-2 text-sm">
              {["pending", "approved", "rejected", "rolled_back", "all"].map((v) => (
                <option key={v} value={v}>{v === "all" ? "সব" : STATUS_LABEL[v]}</option>
              ))}
            </select>
            <select value={method} onChange={(e) => { setMethod(e.target.value); setPage(0); }} className="h-9 rounded-lg border border-border bg-background px-2 text-sm">
              <option value="all">সব পদ্ধতি</option>
              <option value="unwatermark">ওয়াটারমার্ক মুছে ফেলা</option>
              <option value="alt-source">বিকল্প সোর্স</option>
            </select>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <input
                type="number" min={5} max={40} value={altBatch}
                onChange={(e) => setAltBatch(Number(e.target.value) || 20)}
                className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-sm"
              />
              <button
                onClick={() => autoAlt.mutate()}
                disabled={autoAlt.isPending}
                className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                {autoAlt.isPending ? "খোঁজা হচ্ছে…" : "বিকল্প সোর্স থেকে অটো-ফেচ"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSel(allSelected ? [] : rows.map((r) => r.id))}
              className="rounded-lg bg-secondary px-3 py-1.5 text-sm"
            >
              {allSelected ? "নির্বাচন বাতিল" : "সব নির্বাচন"}
            </button>
            <span className="text-sm text-muted-foreground">{sel.length}টি নির্বাচিত • মোট {count}</span>
            <div className="ml-auto flex gap-2">
              <button
                disabled={!sel.length || approve.isPending}
                onClick={() => approve.mutate(sel)}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
              >অনুমোদন</button>
              <button
                disabled={!sel.length || reject.isPending}
                onClick={() => reject.mutate(sel)}
                className="rounded-lg bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive disabled:opacity-40"
              >বাতিল</button>
              <button
                disabled={!sel.length || rollback.isPending}
                onClick={() => rollback.mutate(sel)}
                className="rounded-lg bg-sale/10 px-3 py-1.5 text-sm font-medium text-sale disabled:opacity-40"
              >রোলব্যাক</button>
            </div>
          </div>

          {list.isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">লোড হচ্ছে…</p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">কোনো রিভিশন নেই</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((r) => {
                const checked = sel.includes(r.id);
                return (
                  <div key={r.id} className={`rounded-xl border p-3 ${checked ? "border-primary" : "border-border"} bg-card`}>
                    <div className="mb-2 flex items-start gap-2">
                      <input
                        type="checkbox" checked={checked}
                        onChange={() => setSel((p) => (checked ? p.filter((i) => i !== r.id) : [...p, r.id]))}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{r.product_name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{r.product_id} • {r.field === "box" ? "বক্স" : "ঔষধ"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${TONE[r.status] ?? ""}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
                    </div>
                    <div className="flex gap-2">
                      <Frame url={r.before_url} label="আগে" />
                      <Frame url={r.after_url} label="পরে" />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {METHOD_LABEL[r.method] ?? r.method}{r.source ? ` • ${r.source}` : ""}{r.note ? ` • ${r.note}` : ""}
                    </p>
                    <div className="mt-2 flex gap-2">
                      {r.status === "pending" && (
                        <>
                          <button onClick={() => approve.mutate([r.id])} className="flex-1 rounded-lg bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground">অনুমোদন</button>
                          <button onClick={() => reject.mutate([r.id])} className="flex-1 rounded-lg bg-secondary px-2 py-1.5 text-xs font-medium">বাতিল</button>
                        </>
                      )}
                      {r.status === "approved" && (
                        <button onClick={() => rollback.mutate([r.id])} className="flex-1 rounded-lg bg-sale/10 px-2 py-1.5 text-xs font-medium text-sale">রোলব্যাক</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-lg bg-secondary px-3 py-1.5 text-sm disabled:opacity-40">আগের</button>
            <span className="text-sm text-muted-foreground">পৃষ্ঠা {page + 1}</span>
            <button disabled={(page + 1) * 24 >= count} onClick={() => setPage((p) => p + 1)} className="rounded-lg bg-secondary px-3 py-1.5 text-sm disabled:opacity-40">পরের</button>
          </div>
        </>
      )}

      {view === "audit" && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2">সময়</th><th className="p-2">পণ্য</th><th className="p-2">অ্যাকশন</th>
                <th className="p-2">স্লট</th><th className="p-2">আগের ছবি</th><th className="p-2">নতুন ছবি</th>
              </tr>
            </thead>
            <tbody>
              {((audit.data as any)?.rows ?? []).map((a: any) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="whitespace-nowrap p-2 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("bn-BD")}</td>
                  <td className="p-2"><span className="block max-w-[180px] truncate">{a.product_name}</span><span className="text-[11px] text-muted-foreground">{a.product_id}</span></td>
                  <td className="p-2">{ACTION_LABEL[a.action] ?? a.action}</td>
                  <td className="p-2">{a.field === "box" ? "বক্স" : "ঔষধ"}</td>
                  <td className="p-2">{a.from_url ? <a href={a.from_url} target="_blank" rel="noreferrer" className="text-primary underline">দেখুন</a> : "—"}</td>
                  <td className="p-2">{a.to_url ? <a href={a.to_url} target="_blank" rel="noreferrer" className="text-primary underline">দেখুন</a> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {audit.isLoading && <p className="p-4 text-center text-sm text-muted-foreground">লোড হচ্ছে…</p>}
          {!audit.isLoading && ((audit.data as any)?.rows ?? []).length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">কোনো লগ নেই</p>
          )}
        </div>
      )}
    </div>
  );
}
