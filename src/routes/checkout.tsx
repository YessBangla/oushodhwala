import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { bn } from "@/data/catalog";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "চেকআউট — ঔষধওয়ালা" },
      { name: "description", content: "ঠিকানা ও পেমেন্ট মাধ্যম বেছে নিয়ে আপনার ঔষধের অর্ডার সম্পন্ন করুন।" },
      { property: "og:title", content: "চেকআউট — ঔষধওয়ালা" },
      { property: "og:description", content: "bKash, Nagad, কার্ড বা ক্যাশ অন ডেলিভারিতে পেমেন্ট।" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

const payments = [
  { id: "cod", t: "ক্যাশ অন ডেলিভারি", d: "পণ্য হাতে পেয়ে টাকা দিন", e: "💵" },
  { id: "bkash", t: "bKash", d: "মোবাইল ব্যাংকিং", e: "📱" },
  { id: "nagad", t: "Nagad", d: "মোবাইল ব্যাংকিং", e: "📲" },
  { id: "card", t: "কার্ড", d: "ক্রেডিট / ডেবিট কার্ড", e: "💳" },
];

function Checkout() {
  const { cart, subtotal, addresses, activeAddress, setActiveAddress, addAddress, placeOrder } = useStore();
  const navigate = useNavigate();
  const [payment, setPayment] = useState("cod");
  const [note, setNote] = useState("");
  const [slot, setSlot] = useState("যত দ্রুত সম্ভব");
  const [form, setForm] = useState({ label: "", area: "", details: "", phone: "" });
  const [showForm, setShowForm] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);

  const delivery = subtotal >= 500 || subtotal === 0 ? 0 : 60;
  const total = subtotal + delivery;
  const addr = addresses.find((a) => a.id === activeAddress) ?? addresses[0];

  if (placed) {
    return (
      <div className="pt-16 text-center">
        <p className="text-4xl">✅</p>
        <h1 className="mt-3 text-lg font-bold">অর্ডার সফল হয়েছে!</h1>
        <p className="mt-1 text-xs text-muted-foreground">অর্ডার নম্বর: {placed}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link to="/orders" className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            অর্ডার ট্র্যাক করুন
          </Link>
          <Link to="/" className="rounded-lg border border-border px-4 py-2 text-xs font-semibold">
            হোমে ফিরুন
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="pt-16 text-center">
        <h1 className="text-base font-bold">চেকআউট করার জন্য কার্টে পণ্য নেই</h1>
        <Link to="/products" search={{ q: "", category: "all", sort: "popular" }} className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          কেনাকাটা করুন
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">চেকআউট</h1>

      <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-bold">ডেলিভারি ঠিকানা</p>
            <div className="mt-2 space-y-2">
              {addresses.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-2.5">
                  <input type="radio" checked={activeAddress === a.id} onChange={() => setActiveAddress(a.id)} className="mt-1" />
                  <span className="text-xs">
                    <span className="block font-semibold">{a.label} · {a.area}</span>
                    <span className="block text-muted-foreground">{a.details} · {a.phone}</span>
                  </span>
                </label>
              ))}
            </div>
            {showForm ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(["label", "area", "details", "phone"] as const).map((k) => (
                  <input
                    key={k}
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    placeholder={{ label: "লেবেল (বাসা/অফিস)", area: "এলাকা, শহর", details: "রোড, বাড়ি, ফ্ল্যাট", phone: "মোবাইল নম্বর" }[k]}
                    className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
                  />
                ))}
                <button
                  onClick={() => {
                    if (form.area && form.phone) {
                      addAddress({ ...form, label: form.label || "নতুন" });
                      setForm({ label: "", area: "", details: "", phone: "" });
                      setShowForm(false);
                    }
                  }}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                >
                  ঠিকানা সংরক্ষণ
                </button>
              </div>
            ) : (
              <button onClick={() => setShowForm(true)} className="mt-2 text-xs font-semibold text-primary underline">
                + নতুন ঠিকানা যোগ করুন
              </button>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-bold">ডেলিভারি সময়</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["যত দ্রুত সম্ভব", "আজ সন্ধ্যা ৬-৯", "আগামীকাল সকাল ৯-১২"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlot(s)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                    slot === s ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-bold">পেমেন্ট মাধ্যম</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {payments.map((m) => (
                <label key={m.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs ${payment === m.id ? "border-primary" : "border-border"}`}>
                  <input type="radio" checked={payment === m.id} onChange={() => setPayment(m.id)} />
                  <span className="text-base">{m.e}</span>
                  <span>
                    <span className="block font-semibold">{m.t}</span>
                    <span className="block text-[10px] text-muted-foreground">{m.d}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-bold">বিশেষ নির্দেশনা</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="যেমন: কল করে আসবেন, গেট নম্বর ২"
              className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-xs outline-none"
            />
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-bold">সারাংশ</p>
          <ul className="mt-2 space-y-1 text-xs">
            {cart.map((l) => (
              <li key={l.id} className="flex justify-between gap-2">
                <span className="truncate text-muted-foreground">{l.name} × {bn(l.qty)}</span>
                <span className="font-semibold">৳{bn(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-muted-foreground">ডেলিভারি</span>
            <span className="font-semibold">{delivery === 0 ? "ফ্রি" : `৳${bn(delivery)}`}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-bold">
            <span>সর্বমোট</span>
            <span className="text-primary-dark">৳{bn(total)}</span>
          </div>
          <button
            onClick={() => {
              const order = placeOrder({
                items: cart,
                total,
                payment: payments.find((x) => x.id === payment)?.t ?? "COD",
                address: addr ? `${addr.area} — ${addr.details}` : "",
                phone: addr?.phone ?? "",
              });
              setPlaced(order.id);
              void navigate;
            }}
            className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
          >
            অর্ডার নিশ্চিত করুন
          </button>
        </aside>
      </div>
    </div>
  );
}
