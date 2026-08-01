import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UploadCloud, ImageOff, CheckCircle2, Link2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";
import { ProductImage } from "@/components/ProductImage";

const BUCKET = "product-images";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
const PAGE = 24;

type Row = { id: string; name: string; en: string; image_url: string; medicine_image_url: string };

type Filter = "missing" | "uploaded" | "external" | "all";

const FILTERS: { id: Filter; t: string }[] = [
  { id: "missing", t: "ছবি অনুপস্থিত" },
  { id: "uploaded", t: "ফাইল আপলোড আছে" },
  { id: "external", t: "লিংক থেকে লোড হচ্ছে" },
  { id: "all", t: "সব পণ্য" },
];

const STORAGE_MATCH = "/storage/v1/object";

function statusOf(url: string): Filter {
  if (!url) return "missing";
  return url.includes(STORAGE_MATCH) ? "uploaded" : "external";
}

async function signedUrl(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, TEN_YEARS);
  if (error) throw error;
  return data.signedUrl;
}

async function uploadForProduct(productId: string, file: File, field: "image_url" | "medicine_image_url" = "image_url") {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${productId}/${field === "image_url" ? "box" : "medicine"}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (upErr) throw upErr;
  const url = await signedUrl(path);
  const patch = field === "image_url" ? { image_url: url } : { medicine_image_url: url };
  const { error } = await supabase.from("products").update(patch).eq("id", productId);
  if (error) throw error;
  return url;
}

export function ProductImagesAdmin() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("missing");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const counts = useQuery({
    queryKey: ["prod-img-counts"],
    queryFn: async () => {
      const base = () => supabase.from("products").select("id", { count: "exact", head: true }).eq("active", true);
      const [total, missing, uploaded] = await Promise.all([
        base(),
        base().eq("image_url", ""),
        base().ilike("image_url", `%${STORAGE_MATCH}%`),
      ]);
      const t = total.count ?? 0;
      const m = missing.count ?? 0;
      const u = uploaded.count ?? 0;
      return { total: t, missing: m, uploaded: u, external: Math.max(t - m - u, 0) };
    },
  });

  const list = useQuery({
    queryKey: ["prod-img-list", filter, q, page],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id,name,en,image_url,medicine_image_url", { count: "exact" })
        .eq("active", true);
      if (filter === "missing") query = query.eq("image_url", "");
      if (filter === "uploaded") query = query.ilike("image_url", `%${STORAGE_MATCH}%`);
      if (filter === "external") query = query.neq("image_url", "").not("image_url", "ilike", `%${STORAGE_MATCH}%`);
      const term = q.trim().replace(/[%,()]/g, " ");
      if (term) query = query.or(`name.ilike.%${term}%,en.ilike.%${term}%,id.ilike.%${term}%`);
      const { data, count, error } = await query.order("name").range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as Row[], count: count ?? 0 };
    },
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["prod-img-counts"] });
    void qc.invalidateQueries({ queryKey: ["prod-img-list"] });
  };

  const c = counts.data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat t="মোট সক্রিয় পণ্য" v={bn(c?.total ?? 0)} />
        <Stat t="ছবি অনুপস্থিত" v={bn(c?.missing ?? 0)} tone="text-sale" />
        <Stat t="ফাইল আপলোড আছে" v={bn(c?.uploaded ?? 0)} tone="text-primary" />
        <Stat t="লিংক থেকে লোড হচ্ছে" v={bn(c?.external ?? 0)} />
      </div>

      <BulkUploader onDone={refresh} />

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as Filter);
              setPage(0);
            }}
            className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
          >
            {FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.t}
              </option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="পণ্যের নাম বা আইডি খুঁজুন"
            className="min-w-[9rem] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
          />
          <span className="text-[11px] text-muted-foreground">মোট {bn(list.data?.count ?? 0)} টি</span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {list.isLoading && <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>}
          {(list.data?.rows ?? []).map((r) => (
            <ProductRow key={r.id} row={r} onDone={refresh} />
          ))}
          {!list.isLoading && (list.data?.rows ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">কোনো পণ্য নেই।</p>
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
            disabled={(page + 1) * PAGE >= (list.data?.count ?? 0)}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
          >
            পরের
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductRow({ row, onDone }: { row: Row; onDone: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const st = statusOf(row.image_url);

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      await uploadForProduct(row.id, file);
      toast.success(`${row.name} — ছবি যুক্ত হয়েছে`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-2">
      <div className="w-14 shrink-0">
        <ProductImage src={row.image_url} alt={row.name} ratio="square" className="rounded-lg" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{row.name}</p>
        <p className="truncate text-[10px] text-muted-foreground">{row.id}</p>
        <span
          className={`mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
            st === "missing" ? "bg-sale/10 text-sale" : st === "uploaded" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
          }`}
        >
          {st === "missing" ? <ImageOff className="h-3 w-3" /> : st === "uploaded" ? <CheckCircle2 className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
          {FILTERS.find((f) => f.id === st)?.t}
        </span>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <button
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="shrink-0 rounded-lg border border-border px-2 py-1.5 text-[11px] font-semibold disabled:opacity-50"
      >
        {busy ? "..." : "আপলোড"}
      </button>
    </div>
  );
}

type BulkState = {
  running: boolean;
  total: number;
  done: number;
  ok: number;
  skipped: { file: string; reason: string }[];
};

function BulkUploader({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [field, setField] = useState<"image_url" | "medicine_image_url">("image_url");
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [s, setS] = useState<BulkState>({ running: false, total: 0, done: 0, ok: 0, skipped: [] });
  const cancelled = useRef(false);

  const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;

  const run = async (files: FileList) => {
    cancelled.current = false;
    setS({ running: true, total: files.length, done: 0, ok: 0, skipped: [] });

    // পণ্যের ইনডেক্স তৈরি (আইডি ও নাম দিয়ে ম্যাচ করার জন্য)
    const byId = new Map<string, Row>();
    const byName = new Map<string, Row>();
    for (let from = 0; from < 40000; from += 1000) {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,en,image_url,medicine_image_url")
        .eq("active", true)
        .range(from, from + 999);
      if (error) {
        toast.error(error.message);
        break;
      }
      const rows = (data ?? []) as Row[];
      for (const r of rows) {
        byId.set(r.id.toLowerCase(), r);
        if (r.en) byName.set(norm(r.en), r);
        if (r.name) byName.set(norm(r.name), r);
      }
      if (rows.length < 1000) break;
    }

    let ok = 0;
    const skipped: BulkState["skipped"] = [];
    for (let i = 0; i < files.length; i++) {
      if (cancelled.current) break;
      const file = files[i]!;
      const base = file.name.replace(/\.[^.]+$/, "");
      const match = byId.get(base.toLowerCase()) ?? byName.get(norm(base));
      if (!match) {
        skipped.push({ file: file.name, reason: "মিল পাওয়া যায়নি" });
      } else if (onlyMissing && field === "image_url" && match.image_url) {
        skipped.push({ file: file.name, reason: "আগে থেকেই ছবি আছে" });
      } else {
        try {
          const url = await uploadForProduct(match.id, file, field);
          match.image_url = field === "image_url" ? url : match.image_url;
          ok++;
        } catch (e) {
          skipped.push({ file: file.name, reason: (e as Error).message.slice(0, 80) });
        }
      }
      setS((prev) => ({ ...prev, done: i + 1, ok, skipped }));
    }

    setS((prev) => ({ ...prev, running: false }));
    toast.success(`আপলোড শেষ — সফল ${bn(ok)} টি, বাদ ${bn(skipped.length)} টি`);
    onDone();
  };

  const skippedTop = useMemo(() => s.skipped.slice(0, 30), [s.skipped]);

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <h3 className="flex items-center gap-1.5 text-xs font-bold">
        <UploadCloud className="h-4 w-4" /> বাল্ক ছবি আপলোড
      </h3>
      <p className="mt-1 text-[11px] text-muted-foreground">
        ফাইলের নাম পণ্যের আইডি বা ইংরেজি নামের সাথে মিল থাকলে স্বয়ংক্রিয়ভাবে সেই পণ্যে যুক্ত হবে। যেমন: <code>mx-12345.jpg</code> বা <code>Napa 500.jpg</code>
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={field}
          onChange={(e) => setField(e.target.value as typeof field)}
          className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
        >
          <option value="image_url">বক্সের ছবি</option>
          <option value="medicine_image_url">ঔষধের ছবি</option>
        </select>
        <label className="flex items-center gap-1.5 text-[11px]">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          শুধু ছবি নেই এমন পণ্যে
        </label>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void run(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          disabled={s.running}
          onClick={() => ref.current?.click()}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {s.running ? "আপলোড চলছে..." : "ছবি ফাইল নির্বাচন করুন"}
        </button>
        {s.running && (
          <button
            onClick={() => {
              cancelled.current = true;
            }}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold"
          >
            বন্ধ করুন
          </button>
        )}
      </div>

      {s.total > 0 && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {bn(s.done)}/{bn(s.total)} ({bn(pct)}%) — সফল {bn(s.ok)} টি, বাদ {bn(s.skipped.length)} টি
          </p>
          {skippedTop.length > 0 && (
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {skippedTop.map((k) => (
                <p key={k.file} className="truncate text-[10px] text-muted-foreground">
                  {k.file} — {k.reason}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function Stat({ t, v, tone }: { t: string; v: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] text-muted-foreground">{t}</p>
      <p className={`mt-1 text-base font-bold ${tone ?? "text-primary-dark"}`}>{v}</p>
    </div>
  );
}
