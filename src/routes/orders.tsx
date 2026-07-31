import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { bn } from "@/data/catalog";
import { useStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "আমার অর্ডার — ঔষধওয়ালা" },
      { name: "description", content: "আপনার সব অর্ডারের অবস্থা ও ট্র্যাকিং দেখুন এক জায়গায়।" },
      { property: "og:title", content: "আমার অর্ডার — ঔষধওয়ালা" },
      { property: "og:description", content: "অর্ডার ট্র্যাক করুন ও পুনরায় অর্ডার দিন।" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: Orders,
});

const STEPS = [
  { key: "confirmed", t: "নিশ্চিত হয়েছে" },
  { key: "processing", t: "প্রস্তুত হচ্ছে" },
  { key: "shipped", t: "পথে আছে" },
  { key: "delivered", t: "ডেলিভারি হয়েছে" },
];

const LABEL: Record<string, string> = {
  confirmed: "নিশ্চিত হয়েছে",
  processing: "প্রস্তুত হচ্ছে",
  shipped: "পথে আছে",
  delivered: "ডেলিভারি হয়েছে",
  cancelled: "বাতিল",
};

function Orders() {
  const { add } = useStore();
  const { user, loading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), order_events(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (loading || (user && isLoading)) {
    return <p className="pt-16 text-center text-sm text-muted-foreground">লোড হচ্ছে...</p>;
  }

  if (!user) {
    return (
      <div className="pt-16 text-center">
        <p className="text-4xl">🧾</p>
        <h1 className="mt-3 text-base font-bold">অর্ডার দেখতে লগইন করুন</h1>
        <Link to="/auth" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          লগইন করুন
        </Link>
      </div>
    );
  }

  const orders = data ?? [];

  if (orders.length === 0) {
    return (
      <div className="pt-16 text-center">
        <p className="text-4xl">🧾</p>
        <h1 className="mt-3 text-base font-bold">এখনো কোনো অর্ডার নেই</h1>
        <Link
          to="/products"
          search={{ q: "", category: "all", sort: "popular" }}
          className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          কেনাকাটা শুরু করুন
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">আমার অর্ডার</h1>
      <div className="mt-3 space-y-3">
        {orders.map((o) => {
          const idx = STEPS.findIndex((s) => s.key === o.status);
          const cancelled = o.status === "cancelled";
          return (
            <article key={o.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold">#{o.order_no}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cancelled ? "bg-sale text-sale-foreground" : "bg-secondary"}`}>
                  {LABEL[o.status] ?? o.status}
                </span>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px]">
                  {o.payment_method.toUpperCase()} · {o.payment_status === "paid" ? "পরিশোধিত" : "বাকি"}
                </span>
                <p className="ml-auto text-sm font-bold text-primary-dark">৳{bn(Math.round(Number(o.total)))}</p>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {new Date(o.created_at).toLocaleString("bn-BD")} · {o.slot} · {o.address}
              </p>

              {!cancelled && (
                <ol className="mt-3 flex items-center gap-1">
                  {STEPS.map((s, i) => (
                    <li key={s.key} className="flex-1">
                      <div className={`h-1 rounded-full ${i <= idx ? "bg-primary" : "bg-border"}`} />
                      <p className={`mt-1 text-[9px] ${i <= idx ? "font-semibold text-primary" : "text-muted-foreground"}`}>{s.t}</p>
                    </li>
                  ))}
                </ol>
              )}

              <ul className="mt-3 space-y-1 text-xs">
                {o.order_items.map((l) => (
                  <li key={l.id} className="flex justify-between">
                    <span className="text-muted-foreground">{l.name} × {bn(l.qty)}</span>
                    <span className="font-semibold">৳{bn(Math.round(Number(l.price) * l.qty))}</span>
                  </li>
                ))}
              </ul>

              {o.order_events.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-border pt-2 text-[10px] text-muted-foreground">
                  {[...o.order_events]
                    .sort((a, b) => a.created_at.localeCompare(b.created_at))
                    .map((e) => (
                      <li key={e.id}>
                        {new Date(e.created_at).toLocaleString("bn-BD")} — {LABEL[e.status] ?? e.status}
                        {e.note ? ` · ${e.note}` : ""}
                      </li>
                    ))}
                </ul>
              )}

              <button
                onClick={() =>
                  o.order_items.forEach((l) =>
                    add({ id: l.product_id, kind: l.kind as "product" | "lab", name: l.name, price: Number(l.price) }, l.qty),
                  )
                }
                className="mt-3 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
              >
                আবার অর্ডার করুন
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
