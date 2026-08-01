import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";

type Row = {
  source: "order" | "appointment" | "diagnostic" | "service";
  ref: string;
  date: string;
  customer: string;
  amount: number;
  method: string;
  paid: boolean;
  status: string;
  refund: number;
};

const SOURCE_BN: Record<Row["source"], string> = {
  order: "ঔষধ অর্ডার",
  appointment: "ডাক্তার কনসালটেশন",
  diagnostic: "হোম ডায়াগনস্টিক",
  service: "হোম সার্ভিস",
};

const METHOD_BN: Record<string, string> = {
  cod: "ক্যাশ অন ডেলিভারি",
  bkash: "bKash",
  nagad: "Nagad",
  card: "কার্ড",
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function AccountsAdmin() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(iso(monthStart));
  const [to, setTo] = useState(iso(today));
  const [source, setSource] = useState<"all" | Row["source"]>("all");

  const q = useQuery({
    queryKey: ["admin-accounts", from, to],
    queryFn: async (): Promise<Row[]> => {
      const start = `${from}T00:00:00.000Z`;
      const end = `${to}T23:59:59.999Z`;
      const range = (t: any) => t.gte("created_at", start).lte("created_at", end);

      const [orders, appts, diags, svcs] = await Promise.all([
        range(supabase.from("orders").select("order_no, created_at, customer_name, total, payment_method, payment_status, status")),
        range(
          supabase
            .from("appointments")
            .select("invoice_no, created_at, patient_name, fee, payment_method, payment_status, status, refund_amount, refund_status"),
        ),
        range(supabase.from("diagnostic_bookings").select("booking_no, created_at, patient_name, total, payment_method, payment_status, status")),
        range(supabase.from("service_requests").select("request_no, created_at, patient_name, fee, payment_method, payment_status, status")),
      ]);

      const err = orders.error ?? appts.error ?? diags.error ?? svcs.error;
      if (err) throw err;

      const rows: Row[] = [
        ...(orders.data ?? []).map((o: any) => ({
          source: "order" as const,
          ref: o.order_no,
          date: o.created_at,
          customer: o.customer_name,
          amount: Number(o.total || 0),
          method: o.payment_method,
          paid: o.payment_status === "paid",
          status: o.status,
          refund: 0,
        })),
        ...(appts.data ?? []).map((a: any) => ({
          source: "appointment" as const,
          ref: a.invoice_no,
          date: a.created_at,
          customer: a.patient_name,
          amount: Number(a.fee || 0),
          method: a.payment_method,
          paid: a.payment_status === "paid",
          status: a.status,
          refund: a.refund_status === "refunded" ? Number(a.refund_amount || 0) : 0,
        })),
        ...(diags.data ?? []).map((d: any) => ({
          source: "diagnostic" as const,
          ref: d.booking_no,
          date: d.created_at,
          customer: d.patient_name,
          amount: Number(d.total || 0),
          method: d.payment_method,
          paid: d.payment_status === "paid",
          status: d.status,
          refund: 0,
        })),
        ...(svcs.data ?? []).map((s: any) => ({
          source: "service" as const,
          ref: s.request_no,
          date: s.created_at,
          customer: s.patient_name,
          amount: Number(s.fee || 0),
          method: s.payment_method,
          paid: s.payment_status === "paid",
          status: s.status,
          refund: 0,
        })),
      ];
      return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
    },
  });

  const rows = useMemo(() => (q.data ?? []).filter((r) => source === "all" || r.source === source), [q.data, source]);

  const t = useMemo(() => {
    const live = rows.filter((r) => r.status !== "cancelled");
    const gross = live.reduce((s, r) => s + r.amount, 0);
    const refunds = rows.reduce((s, r) => s + r.refund, 0);
    const collected = live.filter((r) => r.paid).reduce((s, r) => s + r.amount, 0);
    const due = live.filter((r) => !r.paid).reduce((s, r) => s + r.amount, 0);
    const cancelled = rows.filter((r) => r.status === "cancelled").reduce((s, r) => s + r.amount, 0);
    const byMethod = new Map<string, number>();
    for (const r of live) byMethod.set(r.method, (byMethod.get(r.method) ?? 0) + r.amount);
    const bySource = new Map<string, { count: number; amount: number }>();
    for (const r of live) {
      const cur = bySource.get(r.source) ?? { count: 0, amount: 0 };
      bySource.set(r.source, { count: cur.count + 1, amount: cur.amount + r.amount });
    }
    return { gross, refunds, collected, due, cancelled, net: gross - refunds, byMethod, bySource, count: live.length };
  }, [rows]);

  const exportCsv = () => {
    const head = ["source", "ref", "date", "customer", "amount", "method", "paid", "status", "refund"];
    const body = rows.map((r) => [r.source, r.ref, r.date, r.customer, r.amount, r.method, r.paid ? "paid" : "due", r.status, r.refund]);
    const csv = [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `accounts-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3">
        <label className="text-[11px] font-semibold">
          শুরু
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-border bg-muted px-2 py-1.5 text-xs" />
        </label>
        <label className="text-[11px] font-semibold">
          শেষ
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-lg border border-border bg-muted px-2 py-1.5 text-xs" />
        </label>
        <label className="text-[11px] font-semibold">
          খাত
          <select value={source} onChange={(e) => setSource(e.target.value as typeof source)} className="mt-1 block rounded-lg border border-border bg-muted px-2 py-1.5 text-xs">
            <option value="all">সব খাত</option>
            {Object.entries(SOURCE_BN).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => void q.refetch()} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold">
          <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
        </button>
        <button onClick={exportCsv} className="ml-auto flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
          <Download className="h-3.5 w-3.5" /> CSV এক্সপোর্ট
        </button>
      </div>

      {q.isLoading && <p className="py-6 text-center text-xs text-muted-foreground">হিসাব তৈরি হচ্ছে...</p>}
      {q.error && <p className="py-6 text-center text-xs text-destructive">{(q.error as Error).message}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="মোট বিক্রয় (গ্রস)" value={`৳${bn(Math.round(t.gross))}`} sub={`${bn(t.count)} টি লেনদেন`} />
        <Stat label="আদায় হয়েছে" value={`৳${bn(Math.round(t.collected))}`} sub="পেমেন্ট সম্পন্ন" />
        <Stat label="বকেয়া (COD সহ)" value={`৳${bn(Math.round(t.due))}`} sub="আদায় বাকি" />
        <Stat label="নিট আয়" value={`৳${bn(Math.round(t.net))}`} sub={`রিফান্ড ৳${bn(Math.round(t.refunds))} · বাতিল ৳${bn(Math.round(t.cancelled))}`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="flex items-center gap-1.5 text-xs font-bold">
            <Wallet className="h-4 w-4 text-primary" /> পেমেন্ট মাধ্যম অনুযায়ী
          </h3>
          <div className="mt-2 space-y-1.5">
            {[...t.byMethod.entries()].sort((a, b) => b[1] - a[1]).map(([m, v]) => (
              <div key={m} className="flex items-center gap-2 text-[11px]">
                <span className="w-40 font-semibold">{METHOD_BN[m] ?? m}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${t.gross ? (v / t.gross) * 100 : 0}%` }} />
                </div>
                <span className="w-20 text-right font-bold">৳{bn(Math.round(v))}</span>
              </div>
            ))}
            {t.byMethod.size === 0 && <p className="text-[11px] text-muted-foreground">এই সময়ে কোনো লেনদেন নেই।</p>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-xs font-bold">খাত অনুযায়ী আয়</h3>
          <div className="mt-2 space-y-1.5">
            {(Object.keys(SOURCE_BN) as Row["source"][]).map((s) => {
              const v = t.bySource.get(s) ?? { count: 0, amount: 0 };
              return (
                <div key={s} className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold">{SOURCE_BN[s]}</span>
                  <span className="text-muted-foreground">{bn(v.count)} টি</span>
                  <span className="font-bold">৳{bn(Math.round(v.amount))}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">খাত</th>
              <th className="px-3 py-2">রেফারেন্স</th>
              <th className="px-3 py-2">তারিখ</th>
              <th className="px-3 py-2">গ্রাহক</th>
              <th className="px-3 py-2">মাধ্যম</th>
              <th className="px-3 py-2">অবস্থা</th>
              <th className="px-3 py-2 text-right">টাকা</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.source}-${r.ref}`} className="border-t border-border">
                <td className="px-3 py-2">{SOURCE_BN[r.source]}</td>
                <td className="px-3 py-2 font-semibold">#{r.ref}</td>
                <td className="px-3 py-2 text-muted-foreground">{new Date(r.date).toLocaleDateString("bn-BD")}</td>
                <td className="px-3 py-2">{r.customer}</td>
                <td className="px-3 py-2">{METHOD_BN[r.method] ?? r.method}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.paid ? "bg-secondary text-primary-dark" : "bg-muted text-muted-foreground"}`}>
                    {r.status === "cancelled" ? "বাতিল" : r.paid ? "পরিশোধিত" : "বকেয়া"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-bold">৳{bn(Math.round(r.amount))}</td>
              </tr>
            ))}
            {!q.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  এই সময়সীমায় কোনো লেনদেন পাওয়া যায়নি।
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-primary">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
