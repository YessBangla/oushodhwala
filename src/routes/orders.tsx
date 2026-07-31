import { createFileRoute, Link } from "@tanstack/react-router";
import { bn } from "@/data/catalog";
import { useStore } from "@/lib/store";

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
  component: Orders,
});

const steps = ["নিশ্চিত হয়েছে", "প্রস্তুত হচ্ছে", "পথে আছে", "ডেলিভারি হয়েছে"];

function Orders() {
  const { orders, add } = useStore();

  if (orders.length === 0) {
    return (
      <div className="pt-16 text-center">
        <p className="text-4xl">🧾</p>
        <h1 className="mt-3 text-base font-bold">এখনো কোনো অর্ডার নেই</h1>
        <Link to="/products" search={{ q: "", category: "all", sort: "popular" }} className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          কেনাকাটা শুরু করুন
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">আমার অর্ডার</h1>
      <div className="mt-3 space-y-3">
        {orders.map((o) => (
          <article key={o.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold">#{o.id}</p>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">{o.status}</span>
              <p className="ml-auto text-sm font-bold text-primary-dark">৳{bn(o.total)}</p>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {new Date(o.date).toLocaleString("bn-BD")} · {o.payment} · {o.address}
            </p>

            <ol className="mt-3 flex items-center gap-1">
              {steps.map((s, i) => (
                <li key={s} className="flex-1">
                  <div className={`h-1 rounded-full ${i === 0 ? "bg-primary" : "bg-border"}`} />
                  <p className={`mt-1 text-[9px] ${i === 0 ? "font-semibold text-primary" : "text-muted-foreground"}`}>{s}</p>
                </li>
              ))}
            </ol>

            <ul className="mt-3 space-y-1 text-xs">
              {o.items.map((l) => (
                <li key={l.id} className="flex justify-between">
                  <span className="text-muted-foreground">{l.name} × {bn(l.qty)}</span>
                  <span className="font-semibold">৳{bn(l.price * l.qty)}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => o.items.forEach((l) => add({ id: l.id, kind: l.kind, name: l.name, price: l.price }, l.qty))}
              className="mt-3 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
            >
              আবার অর্ডার করুন
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
