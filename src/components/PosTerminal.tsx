import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Trash2, Printer, ShoppingBag, CloudOff, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";
import { enqueue, isOnline, loadQueue, removeRef, clearSynced, syncQueue, type QueuedSale } from "@/lib/pos-offline";

type P = { id: string; name: string; en: string; price: number; stock: number; pack: string };
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
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState("cash");

  const { data: results, isFetching } = useQuery({
    queryKey: ["pos-search", q],
    enabled: q.trim().length > 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,en,price,stock,pack")
        .eq("active", true)
        .or(`name.ilike.%${q}%,en.ilike.%${q}%,generic.ilike.%${q}%`)
        .limit(12);
      if (error) throw error;
      return (data ?? []) as P[];
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
  const disc = Number(discount) || 0;
  const total = Math.max(sub - disc, 0);
  const due = Math.max(total - (Number(paid) || 0), 0);

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
    setPaid("");
  };

  const sell = useMutation({
    mutationFn: async () => {
      const sale = enqueue({
        items: lines,
        customer_name: name,
        phone,
        discount: disc,
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

        <div className="grid gap-2 sm:grid-cols-2">
          {isFetching && <p className="text-xs text-muted-foreground">খোঁজা হচ্ছে…</p>}
          {(results ?? []).map((p) => (
            <button
              key={p.id}
              onClick={() => add(p)}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-left hover:border-primary"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{p.name}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {p.pack} · স্টক {bn(p.stock)}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold text-primary">৳{bn(p.price)}</span>
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
        <label className="block text-[11px] font-semibold text-muted-foreground">ছাড় (৳)</label>
        <input
          type="number"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        />
        <label className="block text-[11px] font-semibold text-muted-foreground">পরিশোধ (৳)</label>
        <input
          type="number"
          value={paid}
          onChange={(e) => setPaid(e.target.value)}
          placeholder={String(total)}
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        />
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        >
          {METHODS.map((m) => (
            <option key={m.v} value={m.v}>
              {m.t}
            </option>
          ))}
        </select>

        <dl className="space-y-1 border-t border-border pt-2 text-xs">
          <div className="flex justify-between">
            <dt>সাবটোটাল</dt>
            <dd>৳{bn(sub)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>ছাড়</dt>
            <dd>-৳{bn(disc)}</dd>
          </div>
          <div className="flex justify-between text-sm font-bold text-primary">
            <dt>মোট</dt>
            <dd>৳{bn(total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>বাকি</dt>
            <dd>৳{bn(due)}</dd>
          </div>
        </dl>

        <button
          disabled={lines.length === 0 || sell.isPending}
          onClick={() => sell.mutate()}
          className="min-h-11 w-full rounded-lg bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {sell.isPending ? "প্রক্রিয়াধীন…" : "বিক্রয় সম্পন্ন করুন"}
        </button>
        <button
          onClick={() => window.print()}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border text-xs font-semibold"
        >
          <Printer className="h-3.5 w-3.5" /> রসিদ প্রিন্ট
        </button>
      </aside>
    </div>
  );
}
