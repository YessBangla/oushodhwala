import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDismissable } from "@/hooks/useDismissable";

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
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [nonce, setNonce] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const { ref: box } = useDismissable<HTMLDivElement>(open, close, { restoreFocus: false });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const term = q.trim();
    setActive(-1);
    if (term.length < 2) {
      setHits([]);
      setBusy(false);
      setError(false);
      return;
    }
    setBusy(true);
    setError(false);
    const id = setTimeout(async () => {
      const like = `%${term}%`;
      try {
        const [orders, products, customers] = await Promise.all([
          supabase
            .from("orders")
            .select("order_no, customer_name, phone, total, status")
            .or(`order_no.ilike.${like},customer_name.ilike.${like},phone.ilike.${like}`)
            .limit(5),
          supabase.from("products").select("id, name, en, stock").or(`name.ilike.${like},en.ilike.${like}`).limit(5),
          supabase.from("profiles").select("id, name, phone").or(`name.ilike.${like},phone.ilike.${like}`).limit(5),
        ]);

        if (orders.error || products.error || customers.error) throw new Error("search failed");

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
      } catch {
        setHits([]);
        setError(true);
      } finally {
        setBusy(false);
        setOpen(true);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [q, nonce]);

  const choose = (h: Hit) => {
    onSelect(h.tab);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!hits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a <= 0 ? hits.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      const hit = hits[active];
      if (hit) choose(hit);
    }
  };

  return (
    <div ref={box} className="relative mx-auto hidden w-full max-w-lg md:block">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={input}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.trim().length >= 2 && setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls="admin-search-results"
        aria-activedescendant={active >= 0 ? `admin-hit-${active}` : undefined}
        aria-autocomplete="list"
        aria-label="অ্যাডমিন সার্চ"
        placeholder="অর্ডার, প্রোডাক্ট, কাস্টমার খুঁজুন…  (Ctrl+K)"
        className="h-10 w-full rounded-full border border-border bg-secondary/60 pl-10 pr-9 text-xs outline-none transition focus:border-primary focus:bg-card focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_16%,transparent)]"
      />
      {busy ? (
        <Loader2 className="absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-primary" />
      ) : (
        q && (
          <button
            onClick={() => {
              setQ("");
              setHits([]);
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
            aria-label="মুছুন"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )
      )}

      {open && q.trim().length >= 2 && (
        <div
          id="admin-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elevated)]"
        >
          {busy && (
            <div className="space-y-2 p-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="h-4 w-14 animate-pulse rounded-full bg-muted" />
                  <span className="h-3 flex-1 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          )}
          {!busy && error && (
            <div className="px-3 py-5 text-center">
              <p className="text-[11px] font-semibold text-sale">সার্চ ব্যর্থ হয়েছে।</p>
              <button
                onClick={() => setNonce((n) => n + 1)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-bold text-primary"
              >
                <RefreshCw className="h-3.5 w-3.5" /> আবার চেষ্টা করুন
              </button>
            </div>
          )}
          {!busy && !error && hits.length === 0 && (
            <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">কিছু পাওয়া যায়নি।</p>
          )}
          {!busy &&
            !error &&
            hits.map((h, i) => (
              <button
                key={`${h.kind}-${h.title}-${i}`}
                id={`admin-hit-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(h)}
                className={`flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left last:border-0 ${
                  i === active ? "bg-secondary" : "hover:bg-secondary"
                }`}
              >
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary-dark">
                  {KIND_BN[h.kind]}
                </span>
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
