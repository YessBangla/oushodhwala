import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ShoppingCart,
  BanknoteIcon,
  Clock,
  Package,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const bn = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);

type OrderRow = {
  id: string;
  status: string;
  total: number | string;
  created_at: string;
  payment_method?: string | null;
};
type ProductRow = { id: string; name: string; stock: number; low_stock_threshold: number };

const STATUS_BN: Record<string, string> = {
  pending: "পেন্ডিং",
  confirmed: "কনফার্মড",
  processing: "প্রসেসিং",
  shipped: "শিপড",
  delivered: "ডেলিভারড",
  cancelled: "বাতিল",
};

const PIE_COLORS = [
  "var(--color-primary)",
  "var(--color-sale)",
  "oklch(0.62 0.14 240)",
  "oklch(0.72 0.13 90)",
  "oklch(0.55 0.10 300)",
  "oklch(0.60 0.02 160)",
];

export function AdminDashboard({
  orders,
  products,
  loading,
}: {
  orders: OrderRow[];
  products: ProductRow[];
  loading?: boolean;
}) {
  const d = useMemo(() => {
    const live = orders.filter((o) => o.status !== "cancelled");
    const revenue = live.reduce((t, o) => t + Number(o.total || 0), 0);

    const days: { key: string; label: string; revenue: number; orders: number }[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - i);
      const key = dt.toISOString().slice(0, 10);
      days.push({ key, label: bn(dt.getDate()), revenue: 0, orders: 0 });
    }
    const byKey = new Map(days.map((x) => [x.key, x]));
    for (const o of live) {
      const k = String(o.created_at).slice(0, 10);
      const row = byKey.get(k);
      if (row) {
        row.revenue += Number(o.total || 0);
        row.orders += 1;
      }
    }
    const half = Math.floor(days.length / 2);
    const prev = days.slice(0, half).reduce((t, x) => t + x.revenue, 0);
    const curr = days.slice(half).reduce((t, x) => t + x.revenue, 0);
    const trend = prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;

    const statusCount = new Map<string, number>();
    for (const o of orders) statusCount.set(o.status, (statusCount.get(o.status) ?? 0) + 1);
    const statusData = [...statusCount.entries()].map(([k, v]) => ({
      name: STATUS_BN[k] ?? k,
      value: v,
    }));

    const payCount = new Map<string, number>();
    for (const o of live) {
      const k = o.payment_method || "cod";
      payCount.set(k, (payCount.get(k) ?? 0) + Number(o.total || 0));
    }
    const payData = [...payCount.entries()]
      .map(([k, v]) => ({ name: k.toUpperCase(), value: Math.round(v) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const low = products
      .filter((p) => p.stock <= p.low_stock_threshold)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 6);

    return {
      revenue,
      trend,
      days,
      statusData,
      payData,
      low,
      totalOrders: orders.length,
      pending: orders.filter((o) => o.status === "confirmed" || o.status === "processing").length,
      products: products.length,
      lowCount: products.filter((p) => p.stock <= p.low_stock_threshold).length,
      out: products.filter((p) => p.stock <= 0).length,
      recent: orders.slice(0, 6),
      avg: live.length ? revenue / live.length : 0,
    };
  }, [orders, products]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={BanknoteIcon}
          label="মোট বিক্রি"
          value={`৳${bn(Math.round(d.revenue).toLocaleString("en-US"))}`}
          delta={d.trend}
          hint="গত ১৪ দিনের তুলনায়"
        />
        <Kpi
          icon={ShoppingCart}
          label="মোট অর্ডার"
          value={bn(d.totalOrders)}
          hint={`গড় অর্ডার ৳${bn(Math.round(d.avg))}`}
        />
        <Kpi icon={Clock} label="প্রসেসিং অর্ডার" value={bn(d.pending)} hint="কাজ বাকি" />
        <Kpi icon={Package} label="মোট প্রোডাক্ট" value={bn(d.products)} hint="ক্যাটালগে সক্রিয়" />
      </div>

      {/* charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="বিক্রির প্রবাহ"
          subtitle="গত ১৪ দিন"
          right={
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                d.trend >= 0 ? "bg-primary/10 text-primary" : "bg-sale/10 text-sale"
              }`}
            >
              {d.trend >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {bn(Math.abs(Math.round(d.trend)))}%
            </span>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.days} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <Tooltip content={<ChartTip prefix="৳" />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  fill="url(#revFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="অর্ডার স্ট্যাটাস" subtitle="বর্তমান বণ্টন">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={d.statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  stroke="none"
                >
                  {d.statusData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5">
            {d.statusData.map((s, i) => (
              <li key={s.name} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.name}</span>
                <span className="font-bold">{bn(s.value)}</span>
              </li>
            ))}
            {d.statusData.length === 0 && (
              <li className="text-xs text-muted-foreground">কোনো অর্ডার নেই</li>
            )}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="পেমেন্ট মেথড অনুযায়ী বিক্রি" subtitle="সর্বোচ্চ ৫টি">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.payData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <Tooltip content={<ChartTip prefix="৳" />} cursor={{ fill: "var(--color-muted)" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="স্টক সতর্কতা"
          subtitle={`কম স্টক ${bn(d.lowCount)} • শেষ ${bn(d.out)}`}
          right={
            d.out > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sale/10 px-2.5 py-1 text-[11px] font-bold text-sale">
                <XCircle className="h-3.5 w-3.5" /> {bn(d.out)}
              </span>
            ) : null
          }
        >
          <ul className="divide-y divide-border">
            {d.low.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <AlertTriangle
                  className={`h-4 w-4 shrink-0 ${p.stock <= 0 ? "text-sale" : "text-muted-foreground"}`}
                />
                <span className="min-w-0 flex-1 truncate text-xs">{p.name}</span>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    p.stock <= 0 ? "bg-sale/10 text-sale" : "bg-secondary text-foreground"
                  }`}
                >
                  {bn(p.stock)}
                </span>
              </li>
            ))}
            {d.low.length === 0 && (
              <li className="py-6 text-center text-xs text-muted-foreground">সব স্টক ঠিক আছে ✅</li>
            )}
          </ul>
        </Panel>

        <Panel title="সাম্প্রতিক অর্ডার" subtitle="সর্বশেষ ৬টি">
          <ul className="divide-y divide-border">
            {d.recent.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[11px] text-muted-foreground">
                    #{String(o.id).slice(0, 8)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {STATUS_BN[o.status] ?? o.status}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-bold text-primary">
                  ৳{bn(Math.round(Number(o.total || 0)))}
                </span>
              </li>
            ))}
            {d.recent.length === 0 && (
              <li className="py-6 text-center text-xs text-muted-foreground">কোনো অর্ডার নেই</li>
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  hint,
}: {
  icon: typeof ShoppingCart;
  label: string;
  value: string;
  delta?: number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 truncate text-2xl font-black tracking-tight">{value}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {typeof delta === "number" && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              delta >= 0 ? "bg-primary/10 text-primary" : "bg-sale/10 text-sale"
            }`}
          >
            {delta >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {bn(Math.abs(Math.round(delta)))}%
          </span>
        )}
        {hint && <span className="truncate text-[11px] text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  right,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card p-4 shadow-sm ${className ?? ""}`}
    >
      <header className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold">{title}</h2>
          {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

function ChartTip({
  active,
  payload,
  label,
  prefix,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number }[];
  label?: string | number;
  prefix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && <p className="mb-0.5 text-muted-foreground">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-bold">
          {p.name ? `${p.name}: ` : ""}
          {prefix ?? ""}
          {bn(Math.round(Number(p.value ?? 0)).toLocaleString("en-US"))}
        </p>
      ))}
    </div>
  );
}
