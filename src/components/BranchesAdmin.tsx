import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Store, ArrowLeftRight, Search, Trash2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";

/* ---------------- ব্রাঞ্চ ---------------- */
export function BranchesAdmin() {
  const qc = useQueryClient();
  const [f, setF] = useState({ code: "", name: "", name_en: "", address: "", phone: "" });

  const { data } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("branches").insert(f);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("শাখা যুক্ত হয়েছে");
      setF({ code: "", name: "", name_en: "", address: "", phone: "" });
      void qc.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (v: { id: string; active: boolean }) => {
      const { error } = await supabase.from("branches").update({ active: v.active }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["branches"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-6">
        <input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="কোড" className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm" />
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="শাখার নাম" className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm" />
        <input value={f.name_en} onChange={(e) => setF({ ...f, name_en: e.target.value })} placeholder="Branch name" className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm" />
        <input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="ঠিকানা" className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm" />
        <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="ফোন" className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm" />
        <button disabled={!f.code || !f.name} onClick={() => add.mutate()} className="min-h-11 rounded-lg bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50">
          যোগ করুন
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((b) => (
          <div key={b.id} className="rounded-xl border border-border bg-card p-3">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Store className="h-4 w-4 text-primary" /> {b.name}
              {b.is_main && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">প্রধান</span>}
            </p>
            <p className="text-[11px] text-muted-foreground">{b.name_en}</p>
            <p className="mt-1 text-xs">{b.address}</p>
            <p className="text-xs text-muted-foreground">{b.phone}</p>
            <button
              onClick={() => toggle.mutate({ id: b.id, active: !b.active })}
              className={`mt-2 rounded-lg px-3 py-1.5 text-[11px] font-bold ${b.active ? "bg-secondary text-primary-dark" : "bg-muted text-muted-foreground"}`}
            >
              {b.active ? "সক্রিয়" : "নিষ্ক্রিয়"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- স্টক ট্রান্সফার ---------------- */
export function StockTransfers() {
  const qc = useQueryClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<{ product_id: string; product_name: string; qty: number }[]>([]);

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("id,name,active").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: found } = useQuery({
    queryKey: ["transfer-search", q],
    enabled: q.trim().length > 1,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name,stock").eq("active", true).ilike("name", `%${q}%`).limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: list } = useQuery({
    queryKey: ["transfers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_transfers")
        .select("*, stock_transfer_items(*)")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const fb = (branches ?? []).find((b) => b.id === from);
      const tb = (branches ?? []).find((b) => b.id === to);
      const { data, error } = await supabase
        .from("stock_transfers")
        .insert({
          transfer_no: `TR-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          from_branch_id: from,
          to_branch_id: to,
          from_branch_name: fb?.name ?? "",
          to_branch_name: tb?.name ?? "",
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("stock_transfer_items").insert(items.map((i) => ({ ...i, transfer_id: data.id })));
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("ট্রান্সফার পাঠানো হয়েছে");
      setItems([]);
      void qc.invalidateQueries({ queryKey: ["transfers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (v: { id: string; status: string }) => {
      const { error } = await supabase.rpc("transfer_set_status", { _transfer_id: v.id, _status: v.status });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["transfers"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold">
          <ArrowLeftRight className="h-4 w-4 text-primary" /> নতুন ট্রান্সফার
        </p>
        <div className="mb-2 grid gap-2 sm:grid-cols-2">
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="">— যে শাখা থেকে —</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select value={to} onChange={(e) => setTo(e.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="">— যে শাখায় —</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="পণ্য খুঁজুন…" className="min-h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm" />
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {(found ?? []).map((p) => (
            <button
              key={p.id}
              onClick={() => setItems((it) => (it.some((x) => x.product_id === p.id) ? it : [...it, { product_id: p.id, product_name: p.name, qty: 1 }]))}
              className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold hover:border-primary"
            >
              + {p.name} ({bn(p.stock)})
            </button>
          ))}
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border text-xs">
          {items.map((i, idx) => (
            <li key={i.product_id} className="flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-semibold">{i.product_name}</span>
              <input
                type="number"
                min={1}
                value={i.qty}
                onChange={(e) => setItems((it) => it.map((x, n) => (n === idx ? { ...x, qty: Math.max(1, Number(e.target.value)) } : x)))}
                className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-center"
              />
              <button onClick={() => setItems((it) => it.filter((_, n) => n !== idx))} aria-label="সরান" className="text-sale">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="p-3 text-center text-muted-foreground">পণ্য যোগ করুন</li>}
        </ul>

        <button
          disabled={!from || !to || from === to || items.length === 0 || create.isPending}
          onClick={() => create.mutate()}
          className="mt-2 min-h-11 w-full rounded-lg bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          ট্রান্সফার পাঠান
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <p className="border-b border-border px-3 py-2 text-xs font-bold">ট্রান্সফার তালিকা</p>
        <ul className="divide-y divide-border text-xs">
          {(list ?? []).map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="font-mono text-muted-foreground">{t.transfer_no}</span>
              <span className="font-semibold">
                {t.from_branch_name} → {t.to_branch_name}
              </span>
              <span className="text-muted-foreground">{bn((t.stock_transfer_items ?? []).length)} আইটেম</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
                {t.status === "sent" ? "পাঠানো" : t.status === "received" ? "গৃহীত" : t.status === "cancelled" ? "বাতিল" : "খসড়া"}
              </span>
              {t.status === "sent" && (
                <span className="ml-auto flex gap-1">
                  <button onClick={() => setStatus.mutate({ id: t.id, status: "received" })} className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
                    গ্রহণ
                  </button>
                  <button onClick={() => setStatus.mutate({ id: t.id, status: "cancelled" })} className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold">
                    বাতিল
                  </button>
                </span>
              )}
            </li>
          ))}
          {(list ?? []).length === 0 && <li className="p-4 text-center text-muted-foreground">কোনো ট্রান্সফার নেই</li>}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- ডেলিভারি জোন ---------------- */
export function DeliveryZonesAdmin() {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", name_en: "", district: "ঢাকা", thana: "", fee: "40", express_fee: "90", free_above: "1000", eta_minutes: "60" });

  const { data } = useQuery({
    queryKey: ["delivery-zones-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_zones").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("delivery_zones").insert({
        name: f.name,
        name_en: f.name_en,
        district: f.district,
        thana: f.thana,
        fee: Number(f.fee) || 0,
        express_fee: Number(f.express_fee) || 0,
        free_above: Number(f.free_above) || 0,
        eta_minutes: Number(f.eta_minutes) || 60,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("জোন যুক্ত হয়েছে");
      setF({ ...f, name: "", name_en: "", thana: "" });
      void qc.invalidateQueries({ queryKey: ["delivery-zones-admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async (v: { id: string; patch: { fee?: number; express_fee?: number; free_above?: number; eta_minutes?: number; active?: boolean } }) => {
      const { error } = await supabase.from("delivery_zones").update(v.patch).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["delivery-zones-admin"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-4 lg:grid-cols-8">
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="জোনের নাম" className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm" />
        <input value={f.name_en} onChange={(e) => setF({ ...f, name_en: e.target.value })} placeholder="Zone (EN)" className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm" />
        <input value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })} placeholder="জেলা" className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm" />
        <input value={f.thana} onChange={(e) => setF({ ...f, thana: e.target.value })} placeholder="থানা" className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm" />
        <input type="number" value={f.fee} onChange={(e) => setF({ ...f, fee: e.target.value })} placeholder="চার্জ" className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm" />
        <input type="number" value={f.express_fee} onChange={(e) => setF({ ...f, express_fee: e.target.value })} placeholder="এক্সপ্রেস" className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm" />
        <input type="number" value={f.eta_minutes} onChange={(e) => setF({ ...f, eta_minutes: e.target.value })} placeholder="মিনিট" className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm" />
        <button disabled={!f.name} onClick={() => add.mutate()} className="min-h-11 rounded-lg bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50">
          যোগ
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-xs">
          <thead className="bg-secondary/40 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">জোন</th>
              <th className="px-3 py-2 text-left">এলাকা</th>
              <th className="px-3 py-2 text-right">চার্জ</th>
              <th className="px-3 py-2 text-right">এক্সপ্রেস</th>
              <th className="px-3 py-2 text-right">ফ্রি ডেলিভারি</th>
              <th className="px-3 py-2 text-right">সময়</th>
              <th className="px-3 py-2 text-center">অবস্থা</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(data ?? []).map((z) => (
              <tr key={z.id}>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {z.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{z.name_en}</span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {z.district} {z.thana && `· ${z.thana}`}
                </td>
                {(["fee", "express_fee", "free_above", "eta_minutes"] as const).map((k) => (
                  <td key={k} className="px-3 py-2 text-right">
                    <input
                      type="number"
                      defaultValue={Number(z[k])}
                      onBlur={(e) => save.mutate({ id: z.id, patch: { [k]: Number(e.target.value) } as { fee?: number } })}
                      className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-right"
                    />
                  </td>
                ))}
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => save.mutate({ id: z.id, patch: { active: !z.active } })}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${z.active ? "bg-secondary text-primary-dark" : "bg-muted text-muted-foreground"}`}
                  >
                    {z.active ? "সক্রিয়" : "বন্ধ"}
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
