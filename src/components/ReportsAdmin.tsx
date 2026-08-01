import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Download, RefreshCw, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function download(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

type OrderRow = {
  order_no: string;
  created_at: string;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
};

export function ReportsAdmin() {
  const today = new Date();
  const start30 = new Date(today.getTime() - 29 * 864e5);
  const [from, setFrom] = useState(iso(start30));
  const [to, setTo] = useState(iso(today));

  const orders = useQuery({
    queryKey: ["admin-reports-orders", from, to],
    queryFn: async (): Promise<OrderRow[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("order_no, created_at, total, status, payment_method, payment_status")
        .gte("created_at", `${from}T00:00:00.000Z`)
        .lte("created_at", `${to}T23:59:59.999Z`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
  });

  const items = useQuery({
    queryKey: ["admin-reports-items", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("name, qty, price, order_id, orders!inner(created_at, status)")
        .gte("orders.created_at", `${from}T00:00:00.000Z`)
        .lte("orders.created_at", `${to}T23:59:59.999Z`)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const lowStock = useQuery({
    queryKey: ["admin-reports-lowstock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, en, brand, stock, low_stock_threshold, price, active")
        .eq("active", true)
        .lte("stock", 20)
        .order("stock", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []).filter((p: any) => Number(p.stock) <= Number(p.low_stock_threshold || 10));
    },
  });

  const trend = useMemo(() => {
    const map = new Map<string, { day: string; sales: number; orders: number }>();
    for (let d = new Date(`${from}T00:00:00Z`); iso(d) <= to; d = new Date(d.getTime() + 864e5)) {
      map.set(iso(d), { day: iso(d), sales: 0, orders: 0 });
    }
    for (const o of orders.data ?? []) {
      if (o.status === "cancelled") continue;
      const k = o.created_at.slice(0, 10);
      const row = map.get(k);
      if (!row) continue;
      row.sales += Number(o.total || 0);
      row.orders += 1;
    }
    return [...map.values()];
  }, [orders.data, from, to]);

  const totals = useMemo(() => {
    const live = (orders.data ?? []).filter((o) => o.status !== "cancelled");
    const sales = live.reduce((s, o) => s + Number(o.total || 0), 0);
    const cancelled = (orders.data ?? []).filter((o) => o.status === "cancelled").length;
    const paid = live.filter((o) => o.payment_status === "paid").reduce((s, o) => s + Number(o.total || 0), 0);
    return {
      sales,
      paid,
      due: sales - paid,
      count: live.length,
      cancelled,
      avg: live.length ? sales / live.length : 0,
    };
  }, [orders.data]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; amount: number }>();
    for (const it of items.data ?? []) {
      if (it.orders?.status === "cancelled") continue;
      const cur = map.get(it.name) ?? { name: it.name, qty: 0, amount: 0 };
      cur.qty += Number(it.qty || 0);
      cur.amount += Number(it.qty || 0) * Number(it.price || 0);
      map.set(it.name, cur);
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [items.data]);

  const closing = useMemo(() => {
    const key = iso(today);
    const day = (orders.data ?? []).filter((o) => o.created_at.slice(0, 10) === key && o.status !== "cancelled");
    const by = (m: string) => day.filter((o) => o.payment_method === m).reduce((s, o) => s + Number(o.total || 0), 0);
    return {
      count: day.length,
      total: day.reduce((s, o) => s + Number(o.total || 0), 0),
      cod: by("cod"),
      bkash: by("bkash"),
      nagad: by("nagad"),
      card: by("card"),
    };
  }, [orders.data]);

  const loading = orders.isLoading || items.isLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">শুরুর তারিখ</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-base" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">শেষ তারিখ</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-base" />
        </div>
        <button
          onClick={() => { void orders.refetch(); void items.refetch(); void lowStock.refetch(); }}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> রিফ্রেশ
        </button>
        <button
          onClick={() =>
            download(`sales-${from}-to-${to}.csv`, [
              ["তারিখ", "অর্ডার সংখ্যা", "বিক্রয় (৳)"],
              ...trend.map((t) => [t.day, t.orders, t.sales]),
            ])
          }
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-3 text-sm text-primary-foreground"
        >
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { t: "মোট বিক্রয়", v: `৳${bn(Math.round(totals.sales))}` },
          { t: "পরিশোধিত", v: `৳${bn(Math.round(totals.paid))}` },
          { t: "বকেয়া (COD)", v: `৳${bn(Math.round(totals.due))}` },
          { t: "গড় অর্ডার মূল্য", v: `৳${bn(Math.round(totals.avg))}` },
        ].map((k) => (
          <div key={k.t} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{k.t}</p>
            <p className="mt-1 text-lg font-bold">{k.v}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-border bg-card p-3">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-primary" /> বিক্রয় ট্রেন্ড
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v: any, n: any) => [n === "sales" ? `৳${bn(Math.round(Number(v)))}` : bn(Number(v)), n === "sales" ? "বিক্রয়" : "অর্ডার"]} />
              <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-3">
          <h3 className="mb-3 text-sm font-semibold">সর্বাধিক বিক্রীত পণ্য (শীর্ষ ১০)</h3>
          {topProducts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">এই সময়ে কোন বিক্রয় নেই</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={110} fontSize={10} />
                  <Tooltip formatter={(v: any) => bn(Number(v))} />
                  <Bar dataKey="qty" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-destructive" /> লো-স্টক অ্যালার্ট
            </h3>
            <button
              onClick={() =>
                download("low-stock.csv", [
                  ["পণ্য", "কোম্পানি", "স্টক", "সীমা"],
                  ...(lowStock.data ?? []).map((p: any) => [p.name, p.brand, p.stock, p.low_stock_threshold]),
                ])
              }
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
          <div className="max-h-72 overflow-auto">
            {(lowStock.data ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">সব পণ্যের স্টক ঠিক আছে ✅</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2">পণ্য</th>
                    <th className="py-2">কোম্পানি</th>
                    <th className="py-2 text-right">স্টক</th>
                  </tr>
                </thead>
                <tbody>
                  {(lowStock.data ?? []).map((p: any) => (
                    <tr key={p.id} className="border-t border-border/60">
                      <td className="py-2 pr-2">{p.name}</td>
                      <td className="py-2 pr-2 text-xs text-muted-foreground">{p.brand}</td>
                      <td className={`py-2 text-right font-semibold ${Number(p.stock) === 0 ? "text-destructive" : "text-amber-600"}`}>
                        {bn(Number(p.stock))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">আজকের ক্লোজিং রিপোর্ট ({iso(today)})</h3>
          <button
            onClick={() =>
              download(`closing-${iso(today)}.csv`, [
                ["বিবরণ", "পরিমাণ"],
                ["মোট অর্ডার", closing.count],
                ["মোট বিক্রয়", closing.total],
                ["ক্যাশ অন ডেলিভারি", closing.cod],
                ["bKash", closing.bkash],
                ["Nagad", closing.nagad],
                ["কার্ড", closing.card],
              ])
            }
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {[
            { t: "অর্ডার", v: bn(closing.count) },
            { t: "মোট", v: `৳${bn(Math.round(closing.total))}` },
            { t: "COD", v: `৳${bn(Math.round(closing.cod))}` },
            { t: "bKash", v: `৳${bn(Math.round(closing.bkash))}` },
            { t: "Nagad", v: `৳${bn(Math.round(closing.nagad))}` },
            { t: "কার্ড", v: `৳${bn(Math.round(closing.card))}` },
          ].map((k) => (
            <div key={k.t} className="rounded-lg border border-border/60 p-2">
              <p className="text-xs text-muted-foreground">{k.t}</p>
              <p className="text-sm font-bold">{k.v}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          বাতিল অর্ডার: {bn(totals.cancelled)} • নির্বাচিত সময়ের মোট অর্ডার: {bn(totals.count)}
        </p>
      </section>
    </div>
  );
}
