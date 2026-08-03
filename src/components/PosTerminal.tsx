import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Trash2, Printer, ShoppingBag, CloudOff, RefreshCw, AlertTriangle, ScanLine, PauseCircle, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";
import { ProductImage } from "@/components/ProductImage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { enqueue, isOnline, loadQueue, removeRef, clearSynced, syncQueue, type QueuedSale } from "@/lib/pos-offline";

type P = {
  id: string;
  name: string;
  en: string;
  price: number;
  stock: number;
  pack: string;
  category: string;
  brand: string;
  image_url?: string | null;
  medicine_image_url?: string | null;
  emoji?: string | null;
};
type Line = { product_id: string; product_name: string; price: number; qty: number };

const METHODS = [
  { v: "cash", t: "নগদ" },
  { v: "bkash", t: "বিকাশ" },
  { v: "nagad", t: "নগদ (Nagad)" },
  { v: "card", t: "কার্ড" },
  { v: "due", t: "বাকি" },
];


/** কাউন্টার/সরাসরি বিক্রয় টার্মিনাল */
export function PosTerminal() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [discount, setDiscount] = useState("0");
  const [discMode, setDiscMode] = useState<"amount" | "percent">("amount");
  const [vat, setVat] = useState("0");
  const [barcode, setBarcode] = useState("");
  const [cat, setCat] = useState("all");
  const [held, setHeld] = useState<{ id: string; name: string; lines: Line[] }[]>([]);
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState("cash");

  const { data: results, isFetching } = useQuery({
    queryKey: ["pos-search", q, cat],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id,name,en,price,stock,pack,category,brand,image_url,medicine_image_url,emoji")
        .eq("active", true);
      if (q.trim().length > 1) query = query.or(`name.ilike.%${q}%,en.ilike.%${q}%,generic.ilike.%${q}%`);
      if (cat !== "all") query = query.eq("category", cat);
      const { data, error } = await query.order("stock", { ascending: false }).limit(24);
      if (error) throw error;
      return (data ?? []) as P[];
    },
  });

  const { data: cats = [] } = useQuery({
    queryKey: ["pos-cats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("slug,bn").limit(40);
      if (error) throw error;
      return (data ?? []) as { slug: string; bn: string }[];
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["pos-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_sales")
        .select("id,invoice_no,customer_name,total,method,created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = (p: P) =>
    setLines((ls) => {
      const i = ls.findIndex((l) => l.product_id === p.id);
      if (i >= 0) {
        const copy = [...ls];
        copy[i] = { ...copy[i]!, qty: copy[i]!.qty + 1 };
        return copy;
      }
      return [...ls, { product_id: p.id, product_name: p.name, price: Number(p.price), qty: 1 }];
    });

  const setQty = (id: string, qty: number) =>
    setLines((ls) => ls.map((l) => (l.product_id === id ? { ...l, qty: Math.max(1, qty) } : l)));

  const sub = useMemo(() => lines.reduce((a, l) => a + l.price * l.qty, 0), [lines]);
  const disc = discMode === "percent" ? Math.round(((sub * (Number(discount) || 0)) / 100) * 100) / 100 : Number(discount) || 0;
  const vatAmt = Math.round(((sub - disc) * (Number(vat) || 0)) / 100 * 100) / 100;
  const total = Math.max(sub - disc + vatAmt, 0);
  const due = Math.max(total - (Number(paid) || 0), 0);
  const change = Math.max((Number(paid) || 0) - total, 0);
  /** সার্ভারে মোট = সাবটোটাল − ডিসকাউন্ট, তাই ভ্যাট নেট অ্যাডজাস্টমেন্ট হিসেবে পাঠানো হয় */
  const netDiscount = disc - vatAmt;

  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedSale[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setOnline(isOnline());
    setQueue(loadQueue());
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const pending = queue.filter((s) => s.status !== "synced");

  const runSync = async (silent = false) => {
    if (loadQueue().every((s) => s.status === "synced")) {
      setQueue(loadQueue());
      if (!silent) toast.info("সিংক করার মতো কিছু নেই");
      return;
    }
    setSyncing(true);
    try {
      const r = await syncQueue();
      setQueue(loadQueue());
      void qc.invalidateQueries({ queryKey: ["pos-recent"] });
      if (!silent || r.synced || r.failed) {
        toast.success(
          `সিংক: নতুন ${bn(r.synced)} · আগেই ছিল ${bn(r.duplicate)} · ব্যর্থ ${bn(r.failed)}${
            r.conflicts ? ` · স্টক কনফ্লিক্ট ${bn(r.conflicts)}` : ""
          }`,
        );
      }
    } finally {
      setSyncing(false);
    }
  };

  // অনলাইনে ফিরলে স্বয়ংক্রিয় সিংক
  useEffect(() => {
    if (online && loadQueue().some((s) => s.status !== "synced")) void runSync(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const reset = () => {
    setLines([]);
    setName("");
    setPhone("");
    setDiscount("0");
    setVat("0");
    setPaid("");
  };

  /** বারকোড/SKU স্ক্যান — এন্টার চাপলে সরাসরি কার্টে যোগ */
  async function scan(code: string) {
    const c = code.trim();
    if (!c) return;
    const { data } = await supabase
      .from("products")
      .select("id,name,en,price,stock,pack,category,brand,image_url,medicine_image_url,emoji")
      .eq("active", true)
      .or(`id.eq.${/^[0-9a-f-]{36}$/i.test(c) ? c : "00000000-0000-0000-0000-000000000000"},name.ilike.%${c}%,en.ilike.%${c}%`)
      .limit(1);
    const p = (data ?? [])[0] as P | undefined;
    if (!p) {
      toast.error("পণ্য মেলেনি: " + c);
      return;
    }
    add(p);
    setBarcode("");
  }

  const hold = () => {
    if (!lines.length) return;
    setHeld((h) => [...h, { id: String(Date.now()), name: name || `হোল্ড ${h.length + 1}`, lines }]);
    setLines([]);
    toast.success("বিক্রয় হোল্ড করা হয়েছে");
  };

  const resume = (id: string) => {
    const item = held.find((h) => h.id === id);
    if (!item) return;
    setLines(item.lines);
    setName(item.name);
    setHeld((h) => h.filter((x) => x.id !== id));
  };

  const sell = useMutation({
    mutationFn: async () => {
      const sale = enqueue({
        items: lines,
        customer_name: name,
        phone,
        discount: netDiscount,
        paid: Number(paid) || total,
        method,
        note: "",
      });
      setQueue(loadQueue());
      if (!isOnline()) return { offline: true as const, invoice_no: "" };
      const r = await syncQueue();
      setQueue(loadQueue());
      const done = loadQueue().find((s) => s.ref === sale.ref);
      if (done?.status === "failed") throw new Error(done.error || "সিংক ব্যর্থ");
      return { offline: false as const, invoice_no: done?.invoice_no ?? "", conflicts: done?.conflicts ?? [], r };
    },
    onSuccess: (d) => {
      if (d.offline) toast.warning("অফলাইন — বিক্রয় কিউতে সংরক্ষিত, অনলাইনে এলে সিংক হবে");
      else {
        toast.success(`বিক্রয় সম্পন্ন — ইনভয়েস ${d.invoice_no}`);
        if (d.conflicts?.length) toast.warning(`স্টক কনফ্লিক্ট: ${d.conflicts.join("; ")}`);
      }
      reset();
      void qc.invalidateQueries({ queryKey: ["pos-recent"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="পণ্যের নাম বা জেনেরিক দিয়ে খুঁজুন…"
            className="min-h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm"
          />
        </div>

        <div className="relative">
          <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void scan(barcode);
            }}
            placeholder="বারকোড স্ক্যান বা SKU লিখে এন্টার…"
            className="min-h-11 w-full rounded-xl border border-primary/40 bg-card pl-9 pr-3 font-mono text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">ক্যাটাগরি</p>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="h-10 min-w-[200px] flex-1 rounded-lg text-xs font-semibold sm:max-w-xs">
              <SelectValue placeholder="সব ক্যাটাগরি" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">সব ক্যাটাগরি</SelectItem>
              {cats.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.bn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-primary-dark">
            {bn((results ?? []).length)} পণ্য
          </span>
        </div>



        {held.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-2">
            <span className="text-[11px] font-bold text-muted-foreground">হোল্ড করা বিক্রয়:</span>
            {held.map((h) => (
              <button
                key={h.id}
                onClick={() => resume(h.id)}
                className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-[11px] font-bold text-primary-dark"
              >
                <PlayCircle className="h-3.5 w-3.5" /> {h.name} · {bn(h.lines.length)}
              </button>
            ))}
          </div>
        )}


        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {isFetching && <p className="col-span-full text-xs text-muted-foreground">খোঁজা হচ্ছে…</p>}
          {(results ?? []).map((p) => (
            <button
              key={p.id}
              onClick={() => add(p)}
              className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
            >
              <div className="relative bg-secondary/40 p-2">
                <div className="mx-auto h-20 w-20 overflow-hidden rounded-xl bg-card">
                  <ProductImage
                    src={p.image_url || p.medicine_image_url}
                    alt={p.name}
                    emoji={p.emoji || "💊"}
                    ratio="square"
                    imgClassName="p-1"
                    emojiClassName="text-2xl"
                  />
                </div>
                <span className="absolute right-2 top-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {bn(p.stock)}
                </span>
              </div>
              <div className="min-w-0 flex-1 space-y-1 border-t border-border p-2.5">
                {p.category && (
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {cats.find((c) => c.slug === p.category)?.bn ?? p.category}
                  </p>
                )}
                <p className="truncate text-xs font-bold leading-tight text-navy">{p.name}</p>
                {p.brand && (
                  <span className="inline-block max-w-full truncate rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-primary-dark">
                    {p.brand}
                  </span>
                )}
                <p className="truncate text-[10px] text-muted-foreground">{p.pack}</p>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-sm font-extrabold text-primary">৳{bn(p.price)}</p>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-base font-bold leading-none text-primary-foreground transition-transform group-hover:scale-110">
                    +
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>



        <div className="rounded-xl border border-border bg-card">
          <p className="border-b border-border px-3 py-2 text-xs font-bold">কার্ট ({bn(lines.length)})</p>
          {lines.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">পণ্য খুঁজে যোগ করুন</p>
          ) : (
            <ul className="divide-y divide-border">
              {lines.map((l) => (
                <li key={l.product_id} className="flex items-center gap-2 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">{l.product_name}</span>
                  <input
                    type="number"
                    min={1}
                    value={l.qty}
                    onChange={(e) => setQty(l.product_id, Number(e.target.value))}
                    className="h-9 w-16 rounded-lg border border-border bg-background px-2 text-center text-xs"
                  />
                  <span className="w-20 text-right text-xs font-bold">৳{bn(l.price * l.qty)}</span>
                  <button
                    onClick={() => setLines((ls) => ls.filter((x) => x.product_id !== l.product_id))}
                    aria-label="সরান"
                    className="text-sale"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card">
          <p className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 text-xs font-bold">
            {online ? (
              <span className="flex items-center gap-1.5 text-primary">● অনলাইন</span>
            ) : (
              <span className="flex items-center gap-1.5 text-sale">
                <CloudOff className="h-3.5 w-3.5" /> অফলাইন মোড
              </span>
            )}
            <span className="text-muted-foreground">অপেক্ষমাণ {bn(pending.length)}</span>
            <button
              onClick={() => void runSync()}
              disabled={syncing || !online}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} /> এখনই সিংক
            </button>
            <button
              onClick={() => {
                clearSynced();
                setQueue(loadQueue());
              }}
              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold"
            >
              সিংককৃত মুছুন
            </button>
          </p>
          <ul className="divide-y divide-border text-xs">
            {queue
              .slice()
              .reverse()
              .slice(0, 12)
              .map((s) => (
                <li key={s.ref} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{s.ref}</span>
                  <span className="font-semibold">{s.customer_name || "ওয়াক-ইন"}</span>
                  <span className="text-muted-foreground">{bn(s.items.length)} আইটেম</span>
                  <span className="font-bold text-primary">
                    ৳{bn(Math.max(s.items.reduce((a, l) => a + l.price * l.qty, 0) - s.discount, 0))}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      s.status === "synced"
                        ? "bg-secondary text-primary-dark"
                        : s.status === "failed"
                          ? "bg-sale/10 text-sale"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.status === "synced" ? `সিংক · ${s.invoice_no}` : s.status === "failed" ? "ব্যর্থ" : "অপেক্ষমাণ"}
                  </span>
                  {!!s.conflicts?.length && (
                    <span className="flex items-center gap-1 text-[10px] text-sale">
                      <AlertTriangle className="h-3 w-3" /> {s.conflicts.join("; ")}
                    </span>
                  )}
                  {s.error && <span className="text-[10px] text-sale">{s.error}</span>}
                  <button
                    onClick={() => {
                      removeRef(s.ref);
                      setQueue(loadQueue());
                    }}
                    aria-label="কিউ থেকে সরান"
                    className="ml-auto text-sale"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            {queue.length === 0 && <li className="p-3 text-center text-muted-foreground">কিউ খালি</li>}
          </ul>
          <p className="border-t border-border px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
            মার্জ নিয়ম: প্রতিটি বিক্রয়ের ইউনিক রেফারেন্স সার্ভারে যাচাই হয় — একই বিক্রয় দুইবার পোস্ট হয় না। স্টকের
            ক্ষেত্রে সার্ভারই চূড়ান্ত; অফলাইনে স্টক বদলে গেলে বিক্রয় বাতিল না করে ঘাটতি ইনভয়েস নোটে লিখে রাখা হয়,
            যা পরে স্টক অ্যাডজাস্টমেন্টে মেলানো যায়।
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <p className="border-b border-border px-3 py-2 text-xs font-bold">সাম্প্রতিক POS ইনভয়েস</p>

          <ul className="divide-y divide-border text-xs">
            {(recent ?? []).map((r) => (
              <li key={r.id} className="flex items-center justify-between px-3 py-2">
                <span className="font-semibold">{r.invoice_no}</span>
                <span className="text-muted-foreground">{r.customer_name || "ওয়াক-ইন"}</span>
                <span className="font-bold text-primary">৳{bn(Number(r.total))}</span>
              </li>
            ))}
            {(recent ?? []).length === 0 && <li className="p-3 text-center text-muted-foreground">কোনো বিক্রয় নেই</li>}
          </ul>
        </div>
      </section>

      <aside className="space-y-2 rounded-xl border border-border bg-card p-3">
        <p className="flex items-center gap-2 text-sm font-bold">
          <ShoppingBag className="h-4 w-4 text-primary" /> চেকআউট
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="গ্রাহকের নাম (ঐচ্ছিক)"
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="মোবাইল (ঐচ্ছিক)"
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1">
              ছাড়
              <button
                onClick={() => setDiscMode((m) => (m === "amount" ? "percent" : "amount"))}
                className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-primary-dark"
              >
                {discMode === "amount" ? "৳" : "%"}
              </button>
            </span>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="text-[11px] font-semibold text-muted-foreground">
            ভ্যাট (%)
            <input
              type="number"
              value={vat}
              onChange={(e) => setVat(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
        </div>
        <label className="block text-[11px] font-semibold text-muted-foreground">পরিশোধিত (৳)</label>
        <input
          type="number"
          value={paid}
          onChange={(e) => setPaid(e.target.value)}
          placeholder={String(total)}
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        />

        <p className="text-[11px] font-semibold text-muted-foreground">পেমেন্ট মাধ্যম</p>
        <div className="grid grid-cols-3 gap-1.5">
          {METHODS.map((m) => (
            <button
              key={m.v}
              onClick={() => setMethod(m.v)}
              className={`min-h-11 rounded-lg px-2 text-[11px] font-bold ${
                method === m.v ? "bg-primary text-primary-foreground" : "border border-border text-navy"
              }`}
            >
              {m.t}
            </button>
          ))}
        </div>

        <dl className="space-y-1 border-t border-border pt-2 text-xs">
          <div className="flex justify-between">
            <dt>সাবটোটাল · {bn(lines.reduce((a, l) => a + l.qty, 0))} আইটেম</dt>
            <dd>৳{bn(sub)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>ছাড়</dt>
            <dd>-৳{bn(disc)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>ভ্যাট {bn(Number(vat) || 0)}%</dt>
            <dd>৳{bn(vatAmt)}</dd>
          </div>
          <div className="flex justify-between text-sm font-bold text-primary">
            <dt>সর্বমোট</dt>
            <dd>৳{bn(total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>বাকি</dt>
            <dd>৳{bn(due)}</dd>
          </div>
          <div className="flex justify-between font-bold">
            <dt>ফেরত</dt>
            <dd>৳{bn(change)}</dd>
          </div>
        </dl>

        <button
          disabled={lines.length === 0 || sell.isPending}
          onClick={() => sell.mutate()}
          className="min-h-12 w-full rounded-lg bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-50"
        >
          {sell.isPending ? "প্রক্রিয়াধীন…" : `বিল সম্পন্ন করুন · ৳${bn(total)}`}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={hold}
            disabled={lines.length === 0}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border text-xs font-semibold disabled:opacity-50"
          >
            <PauseCircle className="h-3.5 w-3.5" /> হোল্ড করুন
          </button>
          <button
            onClick={() => window.print()}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border text-xs font-semibold"
          >
            <Printer className="h-3.5 w-3.5" /> রসিদ প্রিন্ট
          </button>
        </div>

      </aside>
    </div>
  );
}
