import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Trash2, Printer, ClipboardCheck, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";
import {
  DEFAULT_LABEL_SETTINGS,
  LABEL_PRESETS,
  barPattern,
  loadLabelSettings,
  saveLabelSettings,
  type LabelSettings,
} from "@/lib/label-settings";


type P = { id: string; name: string; price: number; stock: number; pack: string; brand: string };

const REASONS = [
  { v: "damage", t: "নষ্ট/ভাঙা" },
  { v: "expiry", t: "মেয়াদোত্তীর্ণ" },
  { v: "lost", t: "হারানো/চুরি" },
  { v: "found", t: "অতিরিক্ত পাওয়া" },
  { v: "correction", t: "সংশোধন" },
];

function useProductSearch(q: string) {
  return useQuery({
    queryKey: ["stockops-search", q],
    enabled: q.trim().length > 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,price,stock,pack,brand")
        .eq("active", true)
        .or(`name.ilike.%${q}%,en.ilike.%${q}%,brand.ilike.%${q}%`)
        .limit(12);
      if (error) throw error;
      return (data ?? []) as P[];
    },
  });
}

/* ---------------- স্টক অ্যাডজাস্টমেন্ট ---------------- */
export function StockAdjustments() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [reason, setReason] = useState("correction");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<{ product_id: string; product_name: string; change: string; stock: number }[]>([]);
  const { data: found } = useProductSearch(q);

  const { data: history } = useQuery({
    queryKey: ["adjustments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_adjustments")
        .select("*, stock_adjustment_items(*)")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const apply = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("apply_stock_adjustment", {
        _reason: reason,
        _note: note,
        _items: items.map((i) => ({ product_id: i.product_id, change: Number(i.change) || 0, note: "" })),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("স্টক সমন্বয় প্রয়োগ হয়েছে");
      setItems([]);
      setNote("");
      void qc.invalidateQueries({ queryKey: ["adjustments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold">
          <SlidersHorizontal className="h-4 w-4 text-primary" /> নতুন স্টক সমন্বয়
        </p>
        <div className="mb-2 grid gap-2 sm:grid-cols-3">
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm">
            {REASONS.map((r) => (
              <option key={r.v} value={r.v}>
                {r.t}
              </option>
            ))}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="নোট" className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm sm:col-span-2" />
        </div>

        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="পণ্য খুঁজুন…" className="min-h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm" />
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {(found ?? []).map((p) => (
            <button
              key={p.id}
              onClick={() => setItems((it) => (it.some((x) => x.product_id === p.id) ? it : [...it, { product_id: p.id, product_name: p.name, change: "0", stock: p.stock }]))}
              className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold hover:border-primary"
            >
              {p.name} · {bn(p.stock)}
            </button>
          ))}
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((i, idx) => (
            <li key={i.product_id} className="flex items-center gap-2 px-3 py-2 text-xs">
              <span className="min-w-0 flex-1 truncate font-semibold">{i.product_name}</span>
              <span className="text-muted-foreground">বর্তমান {bn(i.stock)}</span>
              <input
                type="number"
                value={i.change}
                onChange={(e) => setItems((it) => it.map((x, n) => (n === idx ? { ...x, change: e.target.value } : x)))}
                className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-center"
              />
              <span className="w-16 text-right font-bold">= {bn(Math.max(i.stock + (Number(i.change) || 0), 0))}</span>
              <button onClick={() => setItems((it) => it.filter((_, n) => n !== idx))} aria-label="সরান" className="text-sale">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="p-3 text-center text-xs text-muted-foreground">পণ্য যোগ করুন</li>}
        </ul>

        <button
          disabled={items.length === 0 || apply.isPending}
          onClick={() => apply.mutate()}
          className="mt-2 min-h-11 w-full rounded-lg bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          সমন্বয় প্রয়োগ করুন
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <p className="border-b border-border px-3 py-2 text-xs font-bold">সমন্বয়ের ইতিহাস</p>
        <ul className="divide-y divide-border text-xs">
          {(history ?? []).map((h) => (
            <li key={h.id} className="px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground">{h.adj_no}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
                  {REASONS.find((r) => r.v === h.reason)?.t ?? h.reason}
                </span>
                <span className="truncate">{h.note}</span>
                <span className="ml-auto text-muted-foreground">{new Date(h.created_at).toLocaleString("bn-BD")}</span>
              </div>
              <div className="pl-2 text-[11px] text-muted-foreground">
                {(h.stock_adjustment_items ?? []).map((i: { id: string; product_name: string; change: number; after_qty: number }) => (
                  <span key={i.id} className="mr-3">
                    {i.product_name} ({i.change > 0 ? "+" : ""}
                    {bn(i.change)} → {bn(i.after_qty)})
                  </span>
                ))}
              </div>
            </li>
          ))}
          {(history ?? []).length === 0 && <li className="p-4 text-center text-muted-foreground">কোনো সমন্বয় নেই</li>}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- ফিজিক্যাল স্টক কাউন্ট ---------------- */
export function StockCount() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const { data: found } = useProductSearch(q);

  const { data: counts } = useQuery({
    queryKey: ["stock-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_counts").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rows } = useQuery({
    queryKey: ["stock-count-items", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_count_items").select("*").eq("count_id", activeId!).order("product_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("stock_counts")
        .insert({ count_no: `SC-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}` })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      setActiveId(d.id);
      void qc.invalidateQueries({ queryKey: ["stock-counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async (p: P) => {
      const { error } = await supabase.from("stock_count_items").insert({
        count_id: activeId!,
        product_id: p.id,
        product_name: p.name,
        system_qty: p.stock,
        counted_qty: p.stock,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["stock-count-items", activeId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const setCounted = useMutation({
    mutationFn: async (v: { id: string; qty: number }) => {
      const { error } = await supabase.from("stock_count_items").update({ counted_qty: v.qty }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["stock-count-items", activeId] }),
  });

  const applyCount = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("apply_stock_count", { _count_id: activeId! });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      toast.success(`${bn(n)} টি পণ্যের স্টক মিলিয়ে দেওয়া হয়েছে`);
      void qc.invalidateQueries({ queryKey: ["stock-counts"] });
      void qc.invalidateQueries({ queryKey: ["stock-count-items", activeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const diffTotal = (rows ?? []).reduce((a, r) => a + (r.counted_qty - r.system_qty), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => create.mutate()} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground">
          নতুন কাউন্ট শিট
        </button>
        <select value={activeId ?? ""} onChange={(e) => setActiveId(e.target.value || null)} className="min-h-11 min-w-56 rounded-lg border border-border bg-card px-3 text-sm">
          <option value="">— কাউন্ট শিট নির্বাচন —</option>
          {(counts ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.count_no} · {c.status === "applied" ? "প্রয়োগকৃত" : "খসড়া"}
            </option>
          ))}
        </select>
      </div>

      {activeId && (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="পণ্য যোগ করতে খুঁজুন…" className="min-h-11 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(found ?? []).map((p) => (
              <button key={p.id} onClick={() => addItem.mutate(p)} className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold hover:border-primary">
                + {p.name}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card">
            <p className="flex items-center justify-between border-b border-border px-3 py-2 text-xs font-bold">
              <span className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" /> কাউন্ট শিট
              </span>
              <span className={diffTotal === 0 ? "text-muted-foreground" : "text-sale"}>পার্থক্য {bn(diffTotal)}</span>
            </p>
            <ul className="divide-y divide-border text-xs">
              {(rows ?? []).map((r) => (
                <li key={r.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-semibold">{r.product_name}</span>
                  <span className="text-muted-foreground">সিস্টেম {bn(r.system_qty)}</span>
                  <input
                    type="number"
                    defaultValue={r.counted_qty}
                    onBlur={(e) => setCounted.mutate({ id: r.id, qty: Number(e.target.value) })}
                    className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-center"
                  />
                  <span className={`w-14 text-right font-bold ${r.counted_qty === r.system_qty ? "text-muted-foreground" : "text-sale"}`}>
                    {r.counted_qty - r.system_qty > 0 ? "+" : ""}
                    {bn(r.counted_qty - r.system_qty)}
                  </span>
                </li>
              ))}
              {(rows ?? []).length === 0 && <li className="p-4 text-center text-muted-foreground">পণ্য যোগ করুন</li>}
            </ul>
          </div>

          <button
            disabled={(rows ?? []).length === 0 || applyCount.isPending}
            onClick={() => applyCount.mutate()}
            className="min-h-11 w-full rounded-lg bg-navy text-sm font-bold text-navy-foreground disabled:opacity-50"
          >
            কাউন্ট প্রয়োগ করে স্টক মিলিয়ে দিন
          </button>
        </>
      )}
    </div>
  );
}

/* ---------------- বারকোড / লেবেল প্রিন্ট ---------------- */
export function LabelPrint() {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<{ p: P; copies: number }[]>([]);
  const [cfg, setCfg] = useState<LabelSettings>(DEFAULT_LABEL_SETTINGS);
  const { data: found } = useProductSearch(q);

  useEffect(() => setCfg(loadLabelSettings()), []);

  const set = (patch: Partial<LabelSettings>) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    saveLabelSettings(next);
  };

  const applyPreset = (v: string) => {
    const p = LABEL_PRESETS.find((x) => x.v === v);
    if (!p) return;
    set(v === "custom" ? { preset: v } : { preset: v, widthMm: p.w, heightMm: p.h, columns: p.cols });
  };

  const totalLabels = sel.reduce((a, s) => a + s.copies, 0);

  return (
    <div className="space-y-4">
      <style>{`@media print{
        body *{visibility:hidden}
        #label-sheet,#label-sheet *{visibility:visible}
        #label-sheet{position:absolute;left:0;top:0;width:100%}
        @page{size:auto;margin:4mm}
      }`}</style>

      <div className="rounded-xl border border-border bg-card p-3 print:hidden">
        <p className="mb-2 flex items-center gap-2 text-xs font-bold">
          <SlidersHorizontal className="h-4 w-4 text-primary" /> প্রিন্টার ও লেবেল সাইজ সেটিংস (এই ডিভাইসে সেভ থাকে)
        </p>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <label className="text-[11px] font-semibold text-muted-foreground">
            লেবেল প্রিসেট
            <select value={cfg.preset} onChange={(e) => applyPreset(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-2 text-sm">
              {LABEL_PRESETS.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.t}
                </option>
              ))}
            </select>
          </label>
          {(
            [
              { k: "widthMm" as const, t: "প্রস্থ (মিমি)" },
              { k: "heightMm" as const, t: "উচ্চতা (মিমি)" },
              { k: "gapMm" as const, t: "গ্যাপ (মিমি)" },
              { k: "columns" as const, t: "কলাম" },
              { k: "fontPt" as const, t: "ফন্ট (pt)" },
            ]
          ).map((fld) => (
            <label key={fld.k} className="text-[11px] font-semibold text-muted-foreground">
              {fld.t}
              <input
                type="number"
                min={1}
                value={cfg[fld.k]}
                onChange={(e) => set({ [fld.k]: Math.max(1, Number(e.target.value)), preset: "custom" } as Partial<LabelSettings>)}
                className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-2 text-sm"
              />
            </label>
          ))}
          <label className="text-[11px] font-semibold text-muted-foreground sm:col-span-2">
            প্রিন্টারের নাম (রেফারেন্স)
            <input
              value={cfg.printerName}
              onChange={(e) => set({ printerName: e.target.value })}
              placeholder="যেমন: Xprinter XP-365B"
              className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold sm:col-span-3">
            {(
              [
                { k: "showPrice" as const, t: "মূল্য" },
                { k: "showPack" as const, t: "প্যাক" },
                { k: "showBarcode" as const, t: "বারকোড" },
                { k: "showShop" as const, t: "দোকানের নাম" },
              ]
            ).map((o) => (
              <label key={o.k} className="flex items-center gap-1.5">
                <input type="checkbox" checked={cfg[o.k]} onChange={(e) => set({ [o.k]: e.target.checked } as Partial<LabelSettings>)} /> {o.t}
              </label>
            ))}
            <button
              onClick={() => {
                saveLabelSettings(DEFAULT_LABEL_SETTINGS);
                setCfg(DEFAULT_LABEL_SETTINGS);
                toast.success("ডিফল্ট সেটিংস ফিরিয়ে আনা হয়েছে");
              }}
              className="rounded-lg border border-border px-3 py-2"
            >
              রিসেট
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 print:hidden">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="লেবেলের জন্য পণ্য খুঁজুন…" className="min-h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(found ?? []).map((p) => (
            <button
              key={p.id}
              onClick={() => setSel((s) => (s.some((x) => x.p.id === p.id) ? s : [...s, { p, copies: 4 }]))}
              className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold hover:border-primary"
            >
              + {p.name}
            </button>
          ))}
        </div>
        <ul className="mt-2 divide-y divide-border rounded-lg border border-border text-xs">
          {sel.map((s, i) => (
            <li key={s.p.id} className="flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-semibold">{s.p.name}</span>
              <input
                type="number"
                min={1}
                value={s.copies}
                onChange={(e) => setSel((all) => all.map((x, n) => (n === i ? { ...x, copies: Math.max(1, Number(e.target.value)) } : x)))}
                className="h-9 w-16 rounded-lg border border-border bg-background px-2 text-center"
              />
              <button onClick={() => setSel((all) => all.filter((_, n) => n !== i))} aria-label="সরান" className="text-sale">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {sel.length === 0 && <li className="p-3 text-center text-muted-foreground">পণ্য নির্বাচন করুন</li>}
        </ul>
        <button
          disabled={sel.length === 0}
          onClick={() => window.print()}
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          <Printer className="h-4 w-4" /> {bn(totalLabels)} টি লেবেল প্রিন্ট করুন
          {cfg.printerName ? ` · ${cfg.printerName}` : ""}
        </button>
      </div>

      <div
        id="label-sheet"
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cfg.columns}, ${cfg.widthMm}mm)`,
          gap: `${cfg.gapMm}mm`,
          fontSize: `${cfg.fontPt}pt`,
        }}
      >
        {sel.flatMap((s) =>
          Array.from({ length: s.copies }, (_, i) => (
            <div
              key={`${s.p.id}-${i}`}
              className="flex flex-col justify-between overflow-hidden rounded border border-border bg-card p-1 text-center"
              style={{ width: `${cfg.widthMm}mm`, height: `${cfg.heightMm}mm` }}
            >
              {cfg.showShop && <p className="truncate text-[0.7em] text-muted-foreground">ঔষধওয়ালা</p>}
              <p className="truncate font-bold leading-tight">{s.p.name}</p>
              {cfg.showPack && <p className="truncate text-[0.75em] text-muted-foreground">{s.p.pack}</p>}
              {cfg.showPrice && <p className="font-bold text-primary">৳{bn(Number(s.p.price))}</p>}
              {cfg.showBarcode && (
                <>
                  <div className="mx-auto flex h-[22%] w-full items-end justify-center gap-[1px]">
                    {barPattern(s.p.id).map((w, b) => (
                      <span key={b} className="bg-navy" style={{ width: `${w}px`, height: "100%" }} />
                    ))}
                  </div>
                  <p className="truncate font-mono text-[0.65em] tracking-[0.15em]">{s.p.id.slice(0, 14).toUpperCase()}</p>
                </>
              )}
            </div>
          )),
        )}
      </div>
    </div>
  );
}

