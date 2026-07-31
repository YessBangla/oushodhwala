import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { bn } from "@/data/catalog";
import { catalogQueryKey } from "@/lib/catalog-db";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "অ্যাডমিন প্যানেল — ঔষধওয়ালা" },
      { name: "description", content: "প্রোডাক্ট, ইনভেন্টরি, ক্যাটাগরি, অফার ও অর্ডার ম্যানেজমেন্ট ড্যাশবোর্ড।" },
      { property: "og:title", content: "অ্যাডমিন প্যানেল — ঔষধওয়ালা" },
      { property: "og:description", content: "স্টক, অর্ডার ও ক্যাম্পেইন নিয়ন্ত্রণ করুন।" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: Admin,
});

const TABS = [
  { id: "dash", t: "ড্যাশবোর্ড" },
  { id: "orders", t: "অর্ডার" },
  { id: "inventory", t: "ইনভেন্টরি" },
  { id: "products", t: "প্রোডাক্ট" },
  { id: "categories", t: "ক্যাটাগরি" },
  { id: "offers", t: "অফার" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STATUS: Record<string, string> = {
  confirmed: "নিশ্চিত হয়েছে",
  processing: "প্রস্তুত হচ্ছে",
  shipped: "পথে আছে",
  delivered: "ডেলিভারি হয়েছে",
  cancelled: "বাতিল",
};

function Admin() {
  const { user, isAdmin, loading, refresh } = useAuth();
  const [tab, setTab] = useState<TabId>("dash");

  const { data: adminExists, refetch: refetchExists } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: async () => {
      const { data } = await supabase.rpc("admin_exists");
      return data === true;
    },
    enabled: !!user && !isAdmin,
  });

  if (loading) return <p className="pt-16 text-center text-sm text-muted-foreground">লোড হচ্ছে...</p>;

  if (!user) {
    return (
      <div className="pt-16 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-3 text-base font-bold">অ্যাডমিন প্যানেল</h1>
        <p className="mt-1 text-xs text-muted-foreground">চালিয়ে যেতে লগইন করুন।</p>
        <Link to="/auth" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          লগইন করুন
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="pt-16 text-center">
        <p className="text-4xl">⛔</p>
        <h1 className="mt-3 text-base font-bold">অ্যাডমিন অনুমতি নেই</h1>
        {adminExists === false && (
          <>
            <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
              এখনো কোনো অ্যাডমিন নেই। আপনি প্রথম অ্যাডমিন হিসেবে দায়িত্ব নিতে পারেন।
            </p>
            <button
              onClick={async () => {
                const { data, error } = await supabase.rpc("claim_first_admin");
                if (error) {
                  toast.error(error.message);
                  return;
                }
                if (data === true) {
                  toast.success("আপনি এখন অ্যাডমিন");
                  await refresh();
                } else {
                  toast.error("ইতিমধ্যে একজন অ্যাডমিন আছেন");
                  void refetchExists();
                }
              }}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              প্রথম অ্যাডমিন হোন
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">অ্যাডমিন প্যানেল</h1>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
              tab === t.id ? "border-primary bg-primary text-primary-foreground" : "border-border"
            }`}
          >
            {t.t}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "dash" && <Dashboard />}
        {tab === "orders" && <Orders />}
        {tab === "inventory" && <Inventory />}
        {tab === "products" && <Products />}
        {tab === "categories" && <Categories />}
        {tab === "offers" && <Offers />}
      </div>
    </div>
  );
}

/* ---------------- data hooks ---------------- */

function useProducts() {
  return useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

function useOrders() {
  return useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

/* ---------------- dashboard ---------------- */

function Dashboard() {
  const products = useProducts();
  const orders = useOrders();

  const stats = useMemo(() => {
    const os = orders.data ?? [];
    const ps = products.data ?? [];
    return {
      orders: os.length,
      revenue: os.filter((o) => o.status !== "cancelled").reduce((t, o) => t + Number(o.total), 0),
      pending: os.filter((o) => o.status === "confirmed" || o.status === "processing").length,
      products: ps.length,
      low: ps.filter((p) => p.stock <= p.low_stock_threshold).length,
      out: ps.filter((p) => p.stock <= 0).length,
    };
  }, [orders.data, products.data]);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Card t="মোট অর্ডার" v={bn(stats.orders)} />
      <Card t="মোট বিক্রি" v={`৳${bn(Math.round(stats.revenue))}`} />
      <Card t="প্রসেসিং" v={bn(stats.pending)} />
      <Card t="প্রোডাক্ট" v={bn(stats.products)} />
      <Card t="কম স্টক" v={bn(stats.low)} warn={stats.low > 0} />
      <Card t="স্টক শেষ" v={bn(stats.out)} warn={stats.out > 0} />
    </div>
  );
}

function Card({ t, v, warn }: { t: string; v: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl border bg-card p-3 ${warn ? "border-sale" : "border-border"}`}>
      <p className="text-[10px] text-muted-foreground">{t}</p>
      <p className={`mt-1 text-lg font-bold ${warn ? "text-sale" : "text-primary-dark"}`}>{v}</p>
    </div>
  );
}

/* ---------------- orders ---------------- */

function Orders() {
  const qc = useQueryClient();
  const { data, isLoading } = useOrders();
  const [filter, setFilter] = useState("all");

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.rpc("admin_set_order_status", { _order_id: id, _status: status });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("অর্ডার আপডেট হয়েছে — গ্রাহককে নোটিফিকেশন পাঠানো হয়েছে");
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
      void qc.invalidateQueries({ queryKey: catalogQueryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>;
  const list = (data ?? []).filter((o) => filter === "all" || o.status === filter);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {["all", ...Object.keys(STATUS)].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
              filter === s ? "border-primary text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {s === "all" ? "সব" : STATUS[s]}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="text-xs text-muted-foreground">কোনো অর্ডার নেই।</p>}
      <div className="space-y-2">
        {list.map((o) => (
          <article key={o.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold">#{o.order_no}</p>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">{STATUS[o.status] ?? o.status}</span>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px]">
                {o.payment_method.toUpperCase()} · {o.payment_status === "paid" ? "পরিশোধিত" : "বাকি"}
              </span>
              <p className="ml-auto text-sm font-bold text-primary-dark">৳{bn(Math.round(Number(o.total)))}</p>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {o.customer_name} · {o.phone} · {o.address}
            </p>
            <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString("bn-BD")} · {o.slot}</p>
            <ul className="mt-2 space-y-0.5 text-[11px]">
              {o.order_items.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span className="text-muted-foreground">{i.name} × {bn(i.qty)}</span>
                  <span>৳{bn(Math.round(Number(i.price) * i.qty))}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(STATUS).map(([k, label]) => (
                <button
                  key={k}
                  disabled={o.status === k || setStatus.isPending}
                  onClick={() => setStatus.mutate({ id: o.id, status: k })}
                  className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold disabled:opacity-40"
                >
                  {label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------------- inventory ---------------- */

function Inventory() {
  const qc = useQueryClient();
  const { data, isLoading } = useProducts();
  const [onlyLow, setOnlyLow] = useState(false);

  const save = useMutation({
    mutationFn: async ({ id, stock, low }: { id: string; stock: number; low: number }) => {
      const { error } = await supabase.from("products").update({ stock, low_stock_threshold: low }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("স্টক আপডেট হয়েছে");
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
      void qc.invalidateQueries({ queryKey: catalogQueryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>;
  const list = (data ?? []).filter((p) => !onlyLow || p.stock <= p.low_stock_threshold);

  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-xs font-semibold">
        <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
        শুধু কম স্টকের পণ্য
      </label>
      <div className="space-y-2">
        {list.map((p) => (
          <StockRow key={p.id} p={p} onSave={(stock, low) => save.mutate({ id: p.id, stock, low })} />
        ))}
      </div>
    </div>
  );
}

function StockRow({
  p,
  onSave,
}: {
  p: { id: string; name: string; emoji: string; stock: number; low_stock_threshold: number };
  onSave: (stock: number, low: number) => void;
}) {
  const [stock, setStock] = useState(String(p.stock));
  const [low, setLow] = useState(String(p.low_stock_threshold));
  const critical = p.stock <= p.low_stock_threshold;

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 ${critical ? "border-sale" : "border-border"}`}>
      <span className="text-lg">{p.emoji}</span>
      <p className="min-w-0 flex-1 truncate text-xs font-semibold">{p.name}</p>
      {p.stock <= 0 && <span className="rounded-full bg-sale px-2 py-0.5 text-[10px] font-bold text-sale-foreground">স্টক শেষ</span>}
      {p.stock > 0 && critical && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-sale">কম স্টক</span>}
      <label className="text-[10px] text-muted-foreground">
        স্টক
        <input
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          inputMode="numeric"
          className="ml-1 w-16 rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground outline-none"
        />
      </label>
      <label className="text-[10px] text-muted-foreground">
        সীমা
        <input
          value={low}
          onChange={(e) => setLow(e.target.value)}
          inputMode="numeric"
          className="ml-1 w-14 rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground outline-none"
        />
      </label>
      <button
        onClick={() => onSave(Number(stock) || 0, Number(low) || 0)}
        className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground"
      >
        সেভ
      </button>
    </div>
  );
}

/* ---------------- products ---------------- */

const emptyProduct = {
  id: "",
  name: "",
  en: "",
  brand: "",
  generic: "",
  form: "ট্যাবলেট",
  pack: "",
  price: 0,
  mrp: 0,
  category: "medicine",
  rx: false,
  emoji: "💊",
  description: "",
  stock: 0,
  low_stock_threshold: 10,
  active: true,
};

function Products() {
  const qc = useQueryClient();
  const { data, isLoading } = useProducts();
  const [edit, setEdit] = useState<typeof emptyProduct | null>(null);
  const [q, setQ] = useState("");

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-products"] });
    void qc.invalidateQueries({ queryKey: catalogQueryKey });
  };

  const upsert = useMutation({
    mutationFn: async (p: typeof emptyProduct) => {
      const { error } = await supabase.from("products").upsert(p);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("প্রোডাক্ট সংরক্ষিত হয়েছে");
      setEdit(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").update({ active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("প্রোডাক্ট নিষ্ক্রিয় করা হয়েছে");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>;
  const list = (data ?? []).filter((p) => (p.name + p.en + p.brand).toLowerCase().includes(q.toLowerCase()));

  if (edit) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-bold">{edit.id ? "প্রোডাক্ট সম্পাদনা" : "নতুন প্রোডাক্ট"}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(
            [
              ["id", "আইডি (ইউনিক)"],
              ["name", "বাংলা নাম"],
              ["en", "ইংরেজি নাম"],
              ["brand", "ব্র্যান্ড"],
              ["generic", "জেনেরিক"],
              ["form", "ফর্ম"],
              ["pack", "প্যাক"],
              ["emoji", "ইমোজি"],
              ["category", "ক্যাটাগরি স্লাগ"],
            ] as const
          ).map(([k, label]) => (
            <input
              key={k}
              value={String(edit[k])}
              disabled={k === "id" && !!data?.some((p) => p.id === edit.id) && edit.id !== ""}
              onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}
              placeholder={label}
              className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
            />
          ))}
          {(
            [
              ["price", "দাম"],
              ["mrp", "MRP"],
              ["stock", "স্টক"],
              ["low_stock_threshold", "কম স্টক সীমা"],
            ] as const
          ).map(([k, label]) => (
            <input
              key={k}
              value={String(edit[k])}
              inputMode="numeric"
              onChange={(e) => setEdit({ ...edit, [k]: Number(e.target.value) || 0 })}
              placeholder={label}
              className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
            />
          ))}
        </div>
        <textarea
          value={edit.description}
          onChange={(e) => setEdit({ ...edit, description: e.target.value })}
          rows={3}
          placeholder="বিবরণ"
          className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-xs outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={edit.rx} onChange={(e) => setEdit({ ...edit, rx: e.target.checked })} /> প্রেসক্রিপশন লাগবে
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> সক্রিয়
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            disabled={!edit.id || !edit.name || upsert.isPending}
            onClick={() => upsert.mutate(edit)}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            সংরক্ষণ
          </button>
          <button onClick={() => setEdit(null)} className="rounded-lg border border-border px-4 py-2 text-xs font-semibold">
            বাতিল
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="প্রোডাক্ট খুঁজুন"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
        />
        <button
          onClick={() => setEdit({ ...emptyProduct })}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
        >
          + নতুন
        </button>
      </div>
      <div className="space-y-2">
        {list.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
            <span className="text-lg">{p.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{p.name} {!p.active && <span className="text-muted-foreground">(নিষ্ক্রিয়)</span>}</p>
              <p className="text-[10px] text-muted-foreground">
                ৳{bn(Number(p.price))} · স্টক {bn(p.stock)} · {p.category}
              </p>
            </div>
            <button
              onClick={() =>
                setEdit({
                  id: p.id,
                  name: p.name,
                  en: p.en,
                  brand: p.brand,
                  generic: p.generic,
                  form: p.form,
                  pack: p.pack,
                  price: Number(p.price),
                  mrp: Number(p.mrp),
                  category: p.category,
                  rx: p.rx,
                  emoji: p.emoji,
                  description: p.description,
                  stock: p.stock,
                  low_stock_threshold: p.low_stock_threshold,
                  active: p.active,
                })
              }
              className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
            >
              সম্পাদনা
            </button>
            {p.active && (
              <button onClick={() => del.mutate(p.id)} className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold text-sale">
                নিষ্ক্রিয়
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- categories ---------------- */

function Categories() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState({ slug: "", bn: "", en: "", emoji: "🧴" });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-categories"] });
    void qc.invalidateQueries({ queryKey: catalogQueryKey });
  };

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("categories").upsert({ ...form, active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ক্যাটাগরি সংরক্ষিত");
      setForm({ slug: "", bn: "", en: "", emoji: "🧴" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ slug, active }: { slug: string; active: boolean }) => {
      const { error } = await supabase.from("categories").update({ active }).eq("slug", slug);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>;

  return (
    <div>
      <div className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-4">
        {(["slug", "bn", "en", "emoji"] as const).map((k) => (
          <input
            key={k}
            value={form[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            placeholder={{ slug: "slug", bn: "বাংলা নাম", en: "English", emoji: "ইমোজি" }[k]}
            className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
          />
        ))}
        <button
          disabled={!form.slug || !form.bn}
          onClick={() => add.mutate()}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-4"
        >
          ক্যাটাগরি যোগ / আপডেট
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {(data ?? []).map((c) => (
          <div key={c.slug} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
            <span className="text-lg">{c.emoji}</span>
            <p className="flex-1 text-xs font-semibold">{c.bn} <span className="text-muted-foreground">· {c.slug}</span></p>
            <button
              onClick={() => toggle.mutate({ slug: c.slug, active: !c.active })}
              className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
            >
              {c.active ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- offers ---------------- */

function Offers() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-offers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("offers").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState({
    code: "",
    title: "",
    subtitle: "",
    emoji: "🎟️",
    discount_pct: 10,
    min_order: 0,
    max_discount: 200,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-offers"] });
    void qc.invalidateQueries({ queryKey: catalogQueryKey });
  };

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("offers").upsert({ ...form, active: true }, { onConflict: "code" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("অফার সংরক্ষিত");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("offers").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>;

  return (
    <div>
      <div className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-3">
        {(["code", "title", "subtitle", "emoji"] as const).map((k) => (
          <input
            key={k}
            value={form[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            placeholder={{ code: "কুপন কোড", title: "শিরোনাম", subtitle: "বিবরণ", emoji: "ইমোজি" }[k]}
            className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
          />
        ))}
        {(["discount_pct", "min_order", "max_discount"] as const).map((k) => (
          <input
            key={k}
            value={String(form[k])}
            inputMode="numeric"
            onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) || 0 })}
            placeholder={{ discount_pct: "ছাড় %", min_order: "সর্বনিম্ন অর্ডার", max_discount: "সর্বোচ্চ ছাড়" }[k]}
            className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
          />
        ))}
        <button
          disabled={!form.code || !form.title}
          onClick={() => add.mutate()}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-3"
        >
          অফার যোগ / আপডেট
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {(data ?? []).map((o) => (
          <div key={o.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
            <span className="text-lg">{o.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{o.code} — {o.title}</p>
              <p className="text-[10px] text-muted-foreground">
                {bn(Number(o.discount_pct))}% · সর্বনিম্ন ৳{bn(Number(o.min_order))} · সর্বোচ্চ ৳{bn(Number(o.max_discount))}
              </p>
            </div>
            <button
              onClick={() => toggle.mutate({ id: o.id, active: !o.active })}
              className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
            >
              {o.active ? "বন্ধ" : "চালু"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
