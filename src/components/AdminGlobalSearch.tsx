import { useEffect, useRef, useState } from "react";
import { Search, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Hit = { kind: "order" | "product" | "customer"; tab: string; title: string; sub: string };

const KIND_BN: Record<Hit["kind"], string> = {
  order: "অর্ডার",
  product: "প্রোডাক্ট",
  customer: "কাস্টমার",
};

export function AdminGlobalSearch({ onSelect }: { onSelect: (tab: string) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    const id = setTimeout(async () => {
      const like = `%${term}%`;
      const [orders, products, customers] = await Promise.all([
        supabase
          .from("orders")
          .select("order_no, customer_name, phone, total, status")
          .or(`order_no.ilike.${like},customer_name.ilike.${like},phone.ilike.${like}`)
          .limit(5),
        supabase.from("products").select("id, name, en, stock").or(`name.ilike.${like},en.ilike.${like}`).limit(5),
        supabase.from("profiles").select("id, name, phone").or(`name.ilike.${like},phone.ilike.${like}`).limit(5),
      ]);

      const out: Hit[] = [
        ...(orders.data ?? []).map((o: any) => ({
          kind: "order" as const,
          tab: "orders",
          title: `#${o.order_no}`,
          sub: `${o.customer_name ?? ""} · ৳${Math.round(Number(o.total || 0))}`,
        })),
        ...(products.data ?? []).map((p: any) => ({
          kind: "product" as const,
          tab: "products",
          title: p.name ?? p.en ?? "",
          sub: `স্টক ${p.stock ?? 0}`,
        })),
        ...(customers.data ?? []).map((c: any) => ({
          kind: "customer" as const,
          tab: "customers",
          title: c.name || "নামহীন",
          sub: c.phone ?? "",
        })),
      ];
      setHits(out);
      setBusy(false);
      setOpen(true);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <div ref={box} className="relative mx-auto hidden w-full max-w-md md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={input}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length > 0 && setOpen(true)}
        placeholder="অর্ডার, প্রোডাক্ট, কাস্টমার খুঁজুন…  (Ctrl+K)"
        className="h-9 w-full rounded-full border border-border bg-secondary/60 pl-9 pr-8 text-xs outline-none focus:border-primary focus:bg-card"
      />
      {busy ? (
        <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : (
        q && (
          <button
            onClick={() => {
              setQ("");
              setHits([]);
              setOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label="মুছুন"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )
      )}

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {hits.length === 0 && !busy && <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">কিছু পাওয়া যায়নি।</p>}
          {hits.map((h, i) => (
            <button
              key={`${h.kind}-${h.title}-${i}`}
              onClick={() => {
                onSelect(h.tab);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left last:border-0 hover:bg-secondary"
            >
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary-dark">{KIND_BN[h.kind]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">{h.title}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{h.sub}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
