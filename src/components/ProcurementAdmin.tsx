import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";

type Supplier = {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  payment_terms: string;
  active: boolean;
};

type POItem = { product_id: string; product_name: string; qty: number; cost: number; batch_no: string; expiry: string };

const money = (n: number) => `৳${bn(Math.round(n))}`;

/* ────────────────────────── সাপ্লায়ার ────────────────────────── */

export function SuppliersAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", contact_person: "", phone: "", email: "", address: "", payment_terms: "" });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Supplier[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("সাপ্লায়ারের নাম দিন");
      const { error } = await supabase.from("suppliers").insert({ ...form, name: form.name.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("সাপ্লায়ার যোগ হয়েছে");
      setForm({ name: "", contact_person: "", phone: "", email: "", address: "", payment_terms: "" });
      void qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("suppliers").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["suppliers"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-bold">নতুন সাপ্লায়ার</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ["name", "কোম্পানি/সাপ্লায়ারের নাম"],
              ["contact_person", "যোগাযোগকারী ব্যক্তি"],
              ["phone", "মোবাইল"],
              ["email", "ইমেইল"],
              ["payment_terms", "পেমেন্ট শর্ত (যেমন ৩০ দিন)"],
              ["address", "ঠিকানা"],
            ] as const
          ).map(([k, ph]) => (
            <input
              key={k}
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              placeholder={ph}
              className="min-h-11 rounded-lg border border-border bg-background px-3 text-base sm:text-sm"
            />
          ))}
        </div>
        <button
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="mt-3 min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          সংরক্ষণ করুন
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-secondary text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="p-3">নাম</th>
              <th className="p-3">যোগাযোগ</th>
              <th className="p-3">শর্ত</th>
              <th className="p-3">অবস্থা</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-muted-foreground">
                  লোড হচ্ছে...
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-muted-foreground">
                  এখনো কোনো সাপ্লায়ার নেই
                </td>
              </tr>
            )}
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3 font-semibold">{s.name}</td>
                <td className="p-3">
                  {s.contact_person} {s.phone && `· ${s.phone}`}
                </td>
                <td className="p-3">{s.payment_terms || "—"}</td>
                <td className="p-3">
                  <button
                    onClick={() => toggle.mutate({ id: s.id, active: !s.active })}
                    className={`rounded px-2 py-1 text-[11px] font-semibold ${
                      s.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ────────────────────────── ক্রয় আদেশ (PO) ────────────────────────── */

export function PurchaseOrdersAdmin() {
  const qc = useQueryClient();
  const [supplierId, setSupplierId] = useState("");
  const [expected, setExpected] = useState("");
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState("");
  const [items, setItems] = useState<POItem[]>([]);
  const [q, setQ] = useState("");

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", "active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id,name").eq("active", true).order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const { data: found = [] } = useQuery({
    queryKey: ["po-product-search", q],
    enabled: q.trim().length > 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,price")
        .or(`name.ilike.%${q}%,en.ilike.%${q}%`)
        .limit(8);
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; price: number }[];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, purchase_order_items(*)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const subtotal = items.reduce((s, i) => s + i.qty * i.cost, 0);

  const create = useMutation({
    mutationFn: async () => {
      if (!supplierId) throw new Error("সাপ্লায়ার নির্বাচন করুন");
      if (items.length === 0) throw new Error("অন্তত একটি পণ্য যোগ করুন");
      const { error } = await supabase.rpc("admin_create_purchase_order", {
        _supplier_id: supplierId,
        _items: items,
        _expected: expected || null,
        _discount: discount,
        _note: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ক্রয় আদেশ তৈরি হয়েছে");
      setItems([]);
      setNote("");
      setDiscount(0);
      void qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const receive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_receive_purchase_order", { _po_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("মাল গ্রহণ সম্পন্ন — স্টক আপডেট হয়েছে");
      void qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      void qc.invalidateQueries({ queryKey: ["catalog"] });
      void qc.invalidateQueries({ queryKey: ["stock-batches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-bold">নতুন ক্রয় আদেশ</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-base sm:text-sm"
          >
            <option value="">সাপ্লায়ার নির্বাচন</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-base sm:text-sm"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="নোট"
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-base sm:text-sm"
          />
        </div>

        <div className="relative mt-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="পণ্য খুঁজে যোগ করুন..."
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base sm:text-sm"
          />
          {found.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg">
              {found.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setItems((cur) =>
                      cur.some((i) => i.product_id === p.id)
                        ? cur
                        : [...cur, { product_id: p.id, product_name: p.name, qty: 10, cost: Number(p.price) * 0.8, batch_no: "", expiry: "" }],
                    );
                    setQ("");
                  }}
                  className="block w-full px-3 py-2 text-left text-xs hover:bg-secondary"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-3 space-y-2">
            {items.map((it, idx) => (
              <div key={it.product_id} className="grid gap-2 rounded-lg border border-border p-2 sm:grid-cols-[1fr_5rem_6rem_7rem_8rem_2rem]">
                <span className="self-center truncate text-xs font-semibold">{it.product_name}</span>
                <input
                  type="number"
                  value={it.qty}
                  onChange={(e) =>
                    setItems(items.map((x, i) => (i === idx ? { ...x, qty: Number(e.target.value) } : x)))
                  }
                  placeholder="পরিমাণ"
                  className="min-h-11 rounded-lg border border-border bg-background px-2 text-base sm:text-sm"
                />
                <input
                  type="number"
                  value={it.cost}
                  onChange={(e) =>
                    setItems(items.map((x, i) => (i === idx ? { ...x, cost: Number(e.target.value) } : x)))
                  }
                  placeholder="ক্রয় মূল্য"
                  className="min-h-11 rounded-lg border border-border bg-background px-2 text-base sm:text-sm"
                />
                <input
                  value={it.batch_no}
                  onChange={(e) =>
                    setItems(items.map((x, i) => (i === idx ? { ...x, batch_no: e.target.value } : x)))
                  }
                  placeholder="ব্যাচ নং"
                  className="min-h-11 rounded-lg border border-border bg-background px-2 text-base sm:text-sm"
                />
                <input
                  type="date"
                  value={it.expiry}
                  onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, expiry: e.target.value } : x)))}
                  className="min-h-11 rounded-lg border border-border bg-background px-2 text-base sm:text-sm"
                />
                <button
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                  className="min-h-11 text-sale"
                  aria-label="বাদ দিন"
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span>সাবটোটাল: <b>{money(subtotal)}</b></span>
              <label className="flex items-center gap-1">
                ছাড়:
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="min-h-11 w-24 rounded-lg border border-border bg-background px-2 text-base sm:text-sm"
                />
              </label>
              <span>মোট: <b className="text-primary">{money(Math.max(subtotal - discount, 0))}</b></span>
              <button
                onClick={() => create.mutate()}
                disabled={create.isPending}
                className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                ক্রয় আদেশ তৈরি করুন
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {orders.length === 0 && <p className="text-xs text-muted-foreground">এখনো কোনো ক্রয় আদেশ নেই।</p>}
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold">{o.po_no}</span>
              <span className="text-xs text-muted-foreground">{o.supplier_name}</span>
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                  o.status === "received" ? "bg-primary/10 text-primary" : "bg-accent/20 text-navy"
                }`}
              >
                {o.status === "received" ? "গৃহীত" : "অর্ডার করা"}
              </span>
              <span className="ml-auto text-sm font-bold">{money(Number(o.total))}</span>
            </div>
            <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
              {(o.purchase_order_items ?? []).map((it: { id: string; product_name: string; qty: number; cost: number; batch_no: string; expiry: string | null }) => (
                <li key={it.id}>
                  {it.product_name} — {bn(it.qty)} × {money(Number(it.cost))}
                  {it.batch_no && ` · ব্যাচ ${it.batch_no}`}
                  {it.expiry && ` · মেয়াদ ${it.expiry}`}
                </li>
              ))}
            </ul>
            {o.status !== "received" && (
              <button
                onClick={() => receive.mutate(o.id)}
                disabled={receive.isPending}
                className="mt-3 min-h-11 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                মাল গ্রহণ ও স্টকে যোগ করুন
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────── ব্যাচ, মেয়াদ ও স্টক লেজার ────────────────────── */

export function BatchesAdmin() {
  const qc = useQueryClient();
  const [days, setDays] = useState(90);
  const [adj, setAdj] = useState({ product_id: "", change: 0, reason: "" });
  const [q, setQ] = useState("");

  const { data: expiring = [] } = useQuery({
    queryKey: ["stock-batches", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_expiring_batches", { _days: days });
      if (error) throw error;
      return (data ?? []) as { id: string; product_name: string; batch_no: string; expiry: string; qty: number; days_left: number }[];
    },
  });

  const { data: moves = [] } = useQuery({
    queryKey: ["stock-movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: found = [] } = useQuery({
    queryKey: ["adj-product-search", q],
    enabled: q.trim().length > 1,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name").ilike("name", `%${q}%`).limit(8);
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const adjust = useMutation({
    mutationFn: async () => {
      if (!adj.product_id) throw new Error("পণ্য নির্বাচন করুন");
      if (!adj.change) throw new Error("পরিমাণ দিন (যেমন -৫)");
      const { error } = await supabase.rpc("admin_adjust_stock", {
        _product_id: adj.product_id,
        _change: adj.change,
        _reason: adj.reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("স্টক সমন্বয় হয়েছে");
      setAdj({ product_id: "", change: 0, reason: "" });
      setQ("");
      void qc.invalidateQueries({ queryKey: ["stock-movements"] });
      void qc.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold">মেয়াদ সতর্কতা</p>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-base sm:text-sm"
          >
            {[30, 60, 90, 180].map((d) => (
              <option key={d} value={d}>
                আগামী {bn(d)} দিন
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="p-3">পণ্য</th>
                <th className="p-3">ব্যাচ</th>
                <th className="p-3">মেয়াদ</th>
                <th className="p-3">পরিমাণ</th>
              </tr>
            </thead>
            <tbody>
              {expiring.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">
                    এই সময়ের মধ্যে মেয়াদোত্তীর্ণ হওয়ার মতো কোনো ব্যাচ নেই
                  </td>
                </tr>
              )}
              {expiring.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="p-3 font-semibold">{b.product_name}</td>
                  <td className="p-3">{b.batch_no || "—"}</td>
                  <td className={`p-3 ${b.days_left <= 30 ? "font-bold text-sale" : ""}`}>
                    {b.expiry} ({bn(b.days_left)} দিন)
                  </td>
                  <td className="p-3">{bn(b.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-bold">স্টক সমন্বয় (ক্ষতি / সংশোধন)</p>
        <div className="grid gap-2 sm:grid-cols-4">
          <div className="relative">
            <input
              value={adj.product_id ? adj.product_id : q}
              onChange={(e) => {
                setQ(e.target.value);
                setAdj({ ...adj, product_id: "" });
              }}
              placeholder="পণ্য খুঁজুন"
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base sm:text-sm"
            />
            {!adj.product_id && found.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg">
                {found.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setAdj({ ...adj, product_id: p.id });
                      setQ(p.name);
                    }}
                    className="block w-full px-3 py-2 text-left text-xs hover:bg-secondary"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="number"
            value={adj.change}
            onChange={(e) => setAdj({ ...adj, change: Number(e.target.value) })}
            placeholder="+/- পরিমাণ"
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-base sm:text-sm"
          />
          <input
            value={adj.reason}
            onChange={(e) => setAdj({ ...adj, reason: e.target.value })}
            placeholder="কারণ"
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-base sm:text-sm"
          />
          <button
            onClick={() => adjust.mutate()}
            disabled={adjust.isPending}
            className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            সমন্বয় করুন
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-secondary text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="p-3">তারিখ</th>
              <th className="p-3">পণ্য</th>
              <th className="p-3">পরিবর্তন</th>
              <th className="p-3">ব্যালেন্স</th>
              <th className="p-3">ধরন</th>
              <th className="p-3">নোট</th>
            </tr>
          </thead>
          <tbody>
            {moves.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  কোনো স্টক লেনদেন নেই
                </td>
              </tr>
            )}
            {moves.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="p-3">{new Date(m.created_at).toLocaleDateString("bn-BD")}</td>
                <td className="p-3 font-semibold">{m.product_name}</td>
                <td className={`p-3 font-bold ${m.change < 0 ? "text-sale" : "text-primary"}`}>
                  {m.change > 0 ? "+" : ""}
                  {bn(m.change)}
                </td>
                <td className="p-3">{bn(m.balance)}</td>
                <td className="p-3">{m.kind === "purchase" ? "ক্রয়" : "সমন্বয়"}</td>
                <td className="p-3 text-muted-foreground">{m.ref || m.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
