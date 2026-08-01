import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, ShoppingCart, PackageX, RotateCcw, Star, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";

type Item = {
  id: string;
  tab: string;
  icon: "orders" | "inventory" | "returns" | "reviews" | "rx";
  title: string;
  sub: string;
  at?: string;
};

const ICONS = {
  orders: ShoppingCart,
  inventory: PackageX,
  returns: RotateCcw,
  reviews: Star,
  rx: FileText,
} as const;

async function load(): Promise<Item[]> {
  const [orders, lowStock, returns, reviews, rx] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_no, customer_name, total, status, created_at")
      .in("status", ["pending", "confirmed"])
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("products")
      .select("id, name, stock, low_stock_threshold")
      .eq("active", true)
      .lte("stock", 5)
      .order("stock", { ascending: true })
      .limit(5),
    supabase
      .from("order_returns")
      .select("id, order_no, reason, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("product_reviews")
      .select("id, product_id, rating, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("prescriptions")
      .select("id, phone, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const items: Item[] = [];
  for (const o of orders.data ?? [])
    items.push({
      id: `o-${o.id}`,
      tab: "orders",
      icon: "orders",
      title: `নতুন অর্ডার #${o.order_no}`,
      sub: `${o.customer_name} · ৳${bn(Math.round(Number(o.total || 0)))}`,
      at: o.created_at,
    });
  for (const p of lowStock.data ?? [])
    items.push({
      id: `p-${p.id}`,
      tab: "inventory",
      icon: "inventory",
      title: `স্টক কম: ${p.name}`,
      sub: `বাকি ${bn(Number(p.stock || 0))} টি`,
    });
  for (const r of returns.data ?? [])
    items.push({
      id: `r-${r.id}`,
      tab: "returns",
      icon: "returns",
      title: `রিটার্ন অনুরোধ #${r.order_no}`,
      sub: r.reason || "কারণ উল্লেখ নেই",
      at: r.created_at,
    });
  const reviewRows = reviews.data ?? [];
  const reviewNames = new Map<string, string>();
  if (reviewRows.length > 0) {
    const { data: rp } = await supabase
      .from("products")
      .select("id, name")
      .in("id", reviewRows.map((r) => r.product_id));
    for (const p of rp ?? []) reviewNames.set(p.id, p.name);
  }
  for (const rv of reviewRows)
    items.push({
      id: `rv-${rv.id}`,
      tab: "reviews",
      icon: "reviews",
      title: "নতুন রিভিউ মডারেশন বাকি",
      sub: `রেটিং ${bn(Number(rv.rating || 0))} · ${reviewNames.get(rv.product_id) ?? rv.product_id}`,
      at: rv.created_at,
    });
  for (const p of rx.data ?? [])
    items.push({
      id: `rx-${p.id}`,
      tab: "rx",
      icon: "rx",
      title: "নতুন প্রেসক্রিপশন আপলোড",
      sub: p.phone || "ফোন নেই",
      at: p.created_at,
    });

  return items;
}

export function AdminNotifications({ onSelect }: { onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const q = useQuery({ queryKey: ["admin-notifications"], queryFn: load, refetchInterval: 60000 });
  const items = q.data ?? [];

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary"
        aria-label="নোটিফিকেশন"
      >
        <Bell className="h-4 w-4" />
        {items.length > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-sale px-1 text-[9px] font-bold text-primary-foreground">
            {bn(items.length)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 max-h-[70vh] w-[19rem] overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-bold">নোটিফিকেশন</span>
            <button onClick={() => void q.refetch()} className="text-[11px] text-muted-foreground hover:text-foreground">
              রিফ্রেশ
            </button>
          </div>
          {q.isLoading && <p className="p-4 text-center text-[11px] text-muted-foreground">লোড হচ্ছে...</p>}
          {!q.isLoading && items.length === 0 && (
            <p className="p-6 text-center text-[11px] text-muted-foreground">নতুন কিছু নেই 🎉</p>
          )}
          <ul>
            {items.map((it) => {
              const Icon = ICONS[it.icon];
              return (
                <li key={it.id}>
                  <button
                    onClick={() => {
                      onSelect(it.tab);
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-2 border-b border-border px-3 py-2.5 text-left hover:bg-secondary/60"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-semibold">{it.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{it.sub}</span>
                      {it.at && (
                        <span className="block text-[10px] text-muted-foreground">
                          {new Date(it.at).toLocaleString("bn-BD")}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
