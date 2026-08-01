import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { bn } from "@/data/catalog";
import { useStore } from "@/lib/store";
import { useCatalog, catalogQueryKey, deliveryChargeFor } from "@/lib/catalog-db";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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

const ALL_PAYMENTS = [
  { id: "cod", t: "ক্যাশ অন ডেলিভারি", d: "পণ্য হাতে পেয়ে টাকা দিন", e: "💵", key: "cod" },
  { id: "bkash", t: "bKash", d: "মোবাইল ব্যাংকিং", e: "📱", key: "bkash" },
  { id: "nagad", t: "Nagad", d: "মোবাইল ব্যাংকিং", e: "📲", key: "nagad" },
  { id: "card", t: "কার্ড", d: "ক্রেডিট / ডেবিট কার্ড", e: "💳", key: "card" },
] as const;

function Checkout() {
  const { cart, subtotal, addresses, activeAddress, setActiveAddress, addAddress, clear, couponCode, setCouponCode } = useStore();
  const { offers, products, settings } = useCatalog();

  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [payRef, setPayRef] = useState("");
  const [payment, setPayment] = useState("cod");
  const [note, setNote] = useState("");
  const [slot, setSlot] = useState("যত দ্রুত সম্ভব");
  const [express, setExpress] = useState(false);
  const [form, setForm] = useState({ label: "", area: "", details: "", phone: "" });
  const [showForm, setShowForm] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);

  const appliedOffer = offers.find((o) => o.code === couponCode && subtotal >= o.minOrder) ?? null;
  const couponCut = appliedOffer
    ? Math.min(Math.round((subtotal * appliedOffer.discountPct) / 100), appliedOffer.maxDiscount || Infinity)
    : 0;
  const expressOn = settings.expressEnabled && express;
  const expressFee = expressOn ? settings.expressFee : 0;
  const delivery = deliveryChargeFor(subtotal - couponCut, settings) + expressFee;
  const effectiveSlot = expressOn ? `জরুরি ডেলিভারি (${settings.expressEta})` : slot;
  const total = Math.max(0, subtotal - couponCut + delivery);
  const payments = ALL_PAYMENTS.filter((m) => settings[m.key]);
  const method: string = payments.some((m) => m.id === payment) ? payment : (payments[0]?.id ?? "cod");


  const addr = addresses.find((a) => a.id === activeAddress) ?? addresses[0];

  const stockIssues = cart
    .filter((l) => l.kind === "product")
    .map((l) => ({ line: l, p: products.find((x) => x.id === l.id) }))
    .filter(({ line, p }) => p && p.stock < line.qty);

  const needsRef = method === "bkash" || method === "nagad" || method === "card";

  const submit = async () => {
    if (!user) {
      toast.error("অর্ডার করতে লগইন করুন");
      void navigate({ to: "/auth" });
      return;
    }
    if (!addr) {
      toast.error("ডেলিভারি ঠিকানা যোগ করুন");
      return;
    }
    if (stockIssues.length > 0) {
      toast.error("কিছু পণ্যের স্টক নেই — কার্ট আপডেট করুন");
      return;
    }
    setBusy(true);
    try {
      let ref = "";
      if (needsRef) {
        // সিমুলেটেড পেমেন্ট গেটওয়ে — কনফার্মেশনের পরে ট্রানজেকশন আইডি তৈরি হয়
        await new Promise((r) => setTimeout(r, 900));
        ref = payRef.trim() || `${method.toUpperCase()}${Math.floor(1e9 + Math.random() * 8e9)}`;
      }
      const { data, error } = await supabase.rpc("place_order", {
        _items: cart.map((l) => ({ id: l.id, kind: l.kind, name: l.name, price: l.price, qty: l.qty })),
        _customer_name: profile?.name || user.email || "গ্রাহক",
        _phone: addr.phone,
        _address: `${addr.label} · ${addr.area} — ${addr.details}${note.trim() ? ` (${note.trim()})` : ""}`,
        _slot: effectiveSlot,
        _delivery_fee: delivery,
        _discount: couponCut,
        _payment_method: method,
        _payment_ref: ref,
      });
      if (error) throw error;
      clear();
      setCouponCode(null);
      void qc.invalidateQueries({ queryKey: catalogQueryKey });
      void qc.invalidateQueries({ queryKey: ["my-orders"] });
      void qc.invalidateQueries({ queryKey: ["my-notifications"] });
      setPlaced(data?.order_no ?? "");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "অর্ডার সম্পন্ন হয়নি";
      if (msg.startsWith("OUT_OF_STOCK")) {
        const [, name, left] = msg.split(":");
        toast.error(`${name} এর পর্যাপ্ত স্টক নেই (বাকি ${left} টি)`);
        void qc.invalidateQueries({ queryKey: catalogQueryKey });
      } else if (msg.includes("AUTH_REQUIRED")) {
        toast.error("অর্ডার করতে লগইন করুন");
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

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
                <label key={m.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs ${method === m.id ? "border-primary" : "border-border"}`}>
                  <input type="radio" checked={method === m.id} onChange={() => setPayment(m.id)} />
                  <span className="text-base">{m.e}</span>
                  <span>
                    <span className="block font-semibold">{m.t}</span>
                    <span className="block text-[10px] text-muted-foreground">{m.d}</span>
                  </span>
                </label>
              ))}
            </div>
            {needsRef && (
              <div className="mt-2 rounded-lg bg-secondary p-3">
                <p className="text-[11px] font-semibold">
                  {method === "card" ? "কার্ড পেমেন্ট" : method === "bkash" ? "bKash পেমেন্ট" : "Nagad পেমেন্ট"} — সিমুলেটেড গেটওয়ে
                </p>
                <input
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder={method === "card" ? "কার্ডের শেষ ৪ সংখ্যা (ঐচ্ছিক)" : "ট্রানজেকশন আইডি (ঐচ্ছিক)"}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">খালি রাখলে স্বয়ংক্রিয়ভাবে একটি রেফারেন্স তৈরি হবে।</p>
              </div>
            )}
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
          {couponCut > 0 && (
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-muted-foreground">কুপন ছাড় ({couponCode})</span>
              <span className="font-semibold text-primary">− ৳{bn(couponCut)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-muted-foreground">ডেলিভারি</span>
            <span className="font-semibold">{delivery === 0 ? "ফ্রি" : `৳${bn(delivery)}`}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-bold">
            <span>সর্বমোট</span>
            <span className="text-primary-dark">৳{bn(total)}</span>
          </div>
          {stockIssues.length > 0 && (
            <p className="mt-2 rounded-lg bg-secondary p-2 text-[11px] font-semibold text-sale">
              স্টক সীমিত: {stockIssues.map(({ line, p }) => `${line.name} (বাকি ${bn(p?.stock ?? 0)})`).join(", ")}
            </p>
          )}
          {!user && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              অর্ডার করতে <Link to="/auth" className="font-semibold text-primary underline">লগইন</Link> করুন।
            </p>
          )}
          <button
            disabled={busy}
            onClick={() => void submit()}
            className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "প্রসেস হচ্ছে..." : needsRef ? "পেমেন্ট করে অর্ডার নিশ্চিত করুন" : "অর্ডার নিশ্চিত করুন"}
          </button>
        </aside>
      </div>
    </div>
  );
}
