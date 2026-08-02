import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCatalog, catalogQueryKey, deliveryChargeFor } from "@/lib/catalog-db";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { AddressPicker, emptyAddress, type PickedAddress } from "@/components/AddressPicker";
import { opsStart, opsSuccess, opsFailure } from "@/lib/ops";

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
  { id: "cod", t: "ক্যাশ অন ডেলিভারি", tEn: "Cash on delivery", d: "পণ্য হাতে পেয়ে টাকা দিন", dEn: "Pay when you receive the product", e: "💵", key: "cod" },
  { id: "bkash", t: "bKash", tEn: "bKash", d: "মোবাইল ব্যাংকিং", dEn: "Mobile banking", e: "📱", key: "bkash" },
  { id: "nagad", t: "Nagad", tEn: "Nagad", d: "মোবাইল ব্যাংকিং", dEn: "Mobile banking", e: "📲", key: "nagad" },
  { id: "card", t: "কার্ড", tEn: "Card", d: "ক্রেডিট / ডেবিট কার্ড", dEn: "Credit / Debit card", e: "💳", key: "card" },
] as const;

function Checkout() {
  const t = useT();
  const { cart, subtotal, addresses, activeAddress, setActiveAddress, addAddress, clear, couponCode, setCouponCode } = useStore();
  const { offers, products, settings } = useCatalog();

  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [payRef, setPayRef] = useState("");
  const [payment, setPayment] = useState("cod");
  const [note, setNote] = useState("");
  const SLOTS = [
    { bn: "যত দ্রুত সম্ভব", en: "As soon as possible" },
    { bn: "আজ সন্ধ্যা ৬-৯", en: "Today evening 6-9" },
    { bn: "আগামীকাল সকাল ৯-১২", en: "Tomorrow morning 9-12" },
  ] as const;
  const [slot, setSlot] = useState<string>(SLOTS[0].bn);
  const [express, setExpress] = useState(false);
  const [form, setForm] = useState({ label: "", area: "", details: "", phone: "" });
  const [picked, setPicked] = useState<PickedAddress>(emptyAddress);
  const [showForm, setShowForm] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);
  const [usePoints, setUsePoints] = useState(false);

  const { data: loyalty } = useQuery({
    queryKey: ["my-loyalty"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_loyalty");
      if (error) throw error;
      return data as unknown as { balance: number; tier: string } | null;
    },
  });

  const appliedOffer = offers.find((o) => o.code === couponCode && subtotal >= o.minOrder) ?? null;
  const couponCut = appliedOffer
    ? Math.min(Math.round((subtotal * appliedOffer.discountPct) / 100), appliedOffer.maxDiscount || Infinity)
    : 0;
  const expressOn = settings.expressEnabled && express;
  const expressFee = expressOn ? settings.expressFee : 0;
  const delivery = deliveryChargeFor(subtotal - couponCut, settings) + expressFee;
  const slotLabel = SLOTS.find((s) => s.bn === slot);
  const effectiveSlot = expressOn
    ? t(`জরুরি ডেলিভারি (${settings.expressEta})`, `Express delivery (${settings.expressEta})`)
    : t(slot, slotLabel?.en ?? slot);
  const payableBeforePoints = Math.max(0, subtotal - couponCut + delivery);
  const pointBalance = loyalty?.balance ?? 0;
  const maxPoints = Math.min(pointBalance, Math.floor(payableBeforePoints * 0.5));
  const pointCut = usePoints ? maxPoints : 0;
  const total = Math.max(0, payableBeforePoints - pointCut);
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
      toast.error(t("অর্ডার করতে লগইন করুন", "Please log in to place an order"));
      void navigate({ to: "/auth" });
      return;
    }
    if (!addr) {
      toast.error(t("ডেলিভারি ঠিকানা যোগ করুন", "Please add a delivery address"));
      return;
    }
    if (stockIssues.length > 0) {
      toast.error(t("কিছু পণ্যের স্টক নেই — কার্ট আপডেট করুন", "Some products are out of stock — please update your cart"));
      return;
    }
    setBusy(true);
    opsStart("checkout", { items: cart.length, method });
    try {
      let ref = "";
      if (needsRef) {
        // সিমুলেটেড পেমেন্ট গেটওয়ে — কনফার্মেশনের পরে ট্রানজেকশন আইডি তৈরি হয়
        await new Promise((r) => setTimeout(r, 900));
        ref = payRef.trim() || `${method.toUpperCase()}${Math.floor(1e9 + Math.random() * 8e9)}`;
      }
      const { data, error } = await supabase.rpc("place_order", {
        _items: cart.map((l) => ({ id: l.id, kind: l.kind, name: l.name, price: l.price, qty: l.qty })),
        _customer_name: profile?.name || user.email || t("গ্রাহক", "Customer"),
        _phone: addr.phone,
        _address: `${addr.label} · ${addr.area} — ${addr.details}${note.trim() ? ` (${note.trim()})` : ""}`,
        _slot: effectiveSlot,
        _delivery_fee: delivery,
        _discount: couponCut + pointCut,
        _payment_method: method,
        _payment_ref: ref,
      });
      if (error) throw error;
      if (pointCut > 0) {
        const { error: rErr } = await supabase.rpc("redeem_loyalty", { _points: pointCut });
        if (rErr) console.error(rErr);
        void qc.invalidateQueries({ queryKey: ["my-loyalty"] });
        void qc.invalidateQueries({ queryKey: ["my-loyalty-tx"] });
      }
      clear();
      setCouponCode(null);
      void qc.invalidateQueries({ queryKey: catalogQueryKey });
      void qc.invalidateQueries({ queryKey: ["my-orders"] });
      void qc.invalidateQueries({ queryKey: ["my-notifications"] });
      const orderNo = data?.order_no ?? "";
      if (orderNo && addr.lat != null && addr.lng != null) {
        await supabase.rpc("save_order_location", {
          _order_no: orderNo,
          _lat: addr.lat,
          _lng: addr.lng,
          _district: addr.district ?? "",
          _city_zone: addr.cityZone ?? "",
          _thana: addr.thana ?? "",
          _area: addr.area ?? "",
        });
      }
      opsSuccess("checkout", orderNo, { total, method, items: cart.length });
      setPlaced(orderNo);
    } catch (e) {
      opsFailure("checkout", e, { method, items: cart.length });
      const msg = e instanceof Error ? e.message : t("অর্ডার সম্পন্ন হয়নি", "Order could not be placed");
      if (msg.startsWith("OUT_OF_STOCK")) {
        const [, name, left] = msg.split(":");
        toast.error(t(`${name} এর পর্যাপ্ত স্টক নেই (বাকি ${left} টি)`, `${name} does not have enough stock (${left} left)`));
        void qc.invalidateQueries({ queryKey: catalogQueryKey });
      } else if (msg.includes("AUTH_REQUIRED")) {
        toast.error(t("অর্ডার করতে লগইন করুন", "Please log in to place an order"));
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
        <h1 className="mt-3 text-lg font-bold">{t("অর্ডার সফল হয়েছে!", "Order placed successfully!")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("অর্ডার নম্বর:", "Order number:")} {placed}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link to="/orders" className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            {t("অর্ডার ট্র্যাক করুন", "Track order")}
          </Link>
          <Link to="/" className="rounded-lg border border-border px-4 py-2 text-xs font-semibold">
            {t("হোমে ফিরুন", "Back to home")}
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="pt-16 text-center">
        <h1 className="text-base font-bold">{t("চেকআউট করার জন্য কার্টে পণ্য নেই", "There are no products in the cart to checkout")}</h1>
        <Link to="/products" search={{ q: "", category: "all", sort: "popular" }} className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          {t("কেনাকাটা করুন", "Shop now")}
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">{t("চেকআউট", "Checkout")}</h1>

      <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-bold">{t("ডেলিভারি ঠিকানা", "Delivery address")}</p>
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
              <div className="mt-3 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder={t("লেবেল (বাসা/অফিস)", "Label (Home/Office)")}
                    className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
                  />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder={t("মোবাইল নম্বর", "Mobile number")}
                    className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
                  />
                </div>
                <AddressPicker value={picked} onChange={setPicked} />
                <button
                  onClick={() => {
                    if (!picked.district || !picked.thana || !picked.details.trim() || !form.phone.trim()) {
                      toast.error(t("জেলা, থানা, বিস্তারিত ঠিকানা ও মোবাইল নম্বর দিন", "Please provide district, thana, full address and mobile number"));
                      return;
                    }
                    addAddress({
                      label: form.label || t("নতুন", "New"),
                      phone: form.phone,
                      area: [picked.area, picked.thana, picked.cityZone, picked.district].filter(Boolean).join(", "),
                      details: picked.details,
                      district: picked.district,
                      cityZone: picked.cityZone,
                      thana: picked.thana,
                      lat: picked.lat,
                      lng: picked.lng,
                    });
                    setForm({ label: "", area: "", details: "", phone: "" });
                    setPicked(emptyAddress);
                    setShowForm(false);
                  }}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                >
                  {t("ঠিকানা সংরক্ষণ", "Save address")}
                </button>
              </div>
            ) : (
              <button onClick={() => setShowForm(true)} className="mt-2 text-xs font-semibold text-primary underline">
                {t("+ নতুন ঠিকানা যোগ করুন", "+ Add new address")}
              </button>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-bold">{t("ডেলিভারি সময়", "Delivery time")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SLOTS.map((s) => (
                <button
                  key={s.bn}
                  onClick={() => { setSlot(s.bn); setExpress(false); }}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                    !expressOn && slot === s.bn ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {t(s.bn, s.en)}
                </button>
              ))}
            </div>

            {settings.expressEnabled && (
              <label
                className={`mt-3 flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${
                  expressOn ? "border-sale bg-secondary" : "border-border"
                }`}
              >
                <input type="checkbox" checked={express} onChange={(e) => setExpress(e.target.checked)} className="mt-1" />
                <span className="text-xs">
                  <span className="block font-bold">🚑 {t(`জরুরি ডেলিভারি — ${settings.expressEta}`, `Express delivery — ${settings.expressEta}`)}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {t(
                      `জীবনরক্ষাকারী ঔষধ ও ইমার্জেন্সি পণ্য অগ্রাধিকার ভিত্তিতে পৌঁছে দেওয়া হবে। অতিরিক্ত চার্জ ${t.money(settings.expressFee)}।`,
                      `Life-saving medicines and emergency items will be delivered on priority. Extra charge ${t.money(settings.expressFee)}.`
                    )}
                  </span>
                </span>
              </label>
            )}

            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("জরুরি প্রয়োজনে হটলাইন:", "For urgent needs, hotline:")}{" "}
              <a href={`tel:${settings.emergencyPhone}`} className="font-semibold text-primary underline">
                {settings.emergencyPhone}
              </a>{" "}
              {t("(২৪/৭)", "(24/7)")}
            </p>
          </section>


          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-bold">{t("পেমেন্ট মাধ্যম", "Payment method")}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {payments.map((m) => (
                <label key={m.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs ${method === m.id ? "border-primary" : "border-border"}`}>
                  <input type="radio" checked={method === m.id} onChange={() => setPayment(m.id)} />
                  <span className="text-base">{m.e}</span>
                  <span>
                    <span className="block font-semibold">{t(m.t, m.tEn)}</span>
                    <span className="block text-[10px] text-muted-foreground">{t(m.d, m.dEn)}</span>
                  </span>
                </label>
              ))}
            </div>
            {needsRef && (
              <div className="mt-2 rounded-lg bg-secondary p-3">
                <p className="text-[11px] font-semibold">
                  {method === "card" ? t("কার্ড পেমেন্ট", "Card payment") : method === "bkash" ? t("bKash পেমেন্ট", "bKash payment") : t("Nagad পেমেন্ট", "Nagad payment")} — {t("সিমুলেটেড গেটওয়ে", "Simulated gateway")}
                </p>
                <input
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder={method === "card" ? t("কার্ডের শেষ ৪ সংখ্যা (ঐচ্ছিক)", "Last 4 digits of card (optional)") : t("ট্রানজেকশন আইডি (ঐচ্ছিক)", "Transaction ID (optional)")}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">{t("খালি রাখলে স্বয়ংক্রিয়ভাবে একটি রেফারেন্স তৈরি হবে।", "If left empty, a reference will be generated automatically.")}</p>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-bold">{t("বিশেষ নির্দেশনা", "Special instructions")}</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={t("যেমন: কল করে আসবেন, গেট নম্বর ২", "e.g. Please call before arriving, gate no. 2")}
              className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-xs outline-none"
            />
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-bold">{t("সারাংশ", "Summary")}</p>
          <ul className="mt-2 space-y-1 text-xs">
            {cart.map((l) => (
              <li key={l.id} className="flex justify-between gap-2">
                <span className="truncate text-muted-foreground">{l.name} × {t.n(l.qty)}</span>
                <span className="font-semibold">{t.money(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          {couponCut > 0 && (
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-muted-foreground">{t("কুপন ছাড়", "Coupon discount")} ({couponCode})</span>
              <span className="font-semibold text-primary">− {t.money(couponCut)}</span>
            </div>
          )}
          {pointCut > 0 && (
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-muted-foreground">{t("পয়েন্ট ছাড়", "Points discount")}</span>
              <span className="font-semibold text-primary">− {t.money(pointCut)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-muted-foreground">{t("ডেলিভারি", "Delivery")}</span>
            <span className="font-semibold">{delivery === 0 ? t("ফ্রি", "Free") : t.money(delivery)}</span>
          </div>
          {expressOn && (
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{t("এর মধ্যে জরুরি চার্জ", "Includes express charge")}</span>
              <span>{t.money(expressFee)}</span>
            </div>
          )}
          {user && pointBalance > 0 && (
            <label className="mt-3 flex items-start gap-2 rounded-lg border border-border p-2 text-[11px]">
              <input
                type="checkbox"
                checked={usePoints}
                onChange={(e) => setUsePoints(e.target.checked)}
                disabled={maxPoints <= 0}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block font-semibold">
                  {t(`লয়ালটি পয়েন্ট ব্যবহার করুন (${t.n(pointBalance)} পয়েন্ট)`, `Use loyalty points (${t.n(pointBalance)} points)`)}
                </span>
                <span className="block text-muted-foreground">
                  {maxPoints > 0
                    ? t(`সর্বোচ্চ ${t.n(maxPoints)} পয়েন্ট = ${t.money(maxPoints)} ছাড়`, `Up to ${t.n(maxPoints)} points = ${t.money(maxPoints)} off`)
                    : t("এই অর্ডারে পয়েন্ট ব্যবহারযোগ্য নয়", "Points cannot be used on this order")}
                </span>
              </span>
            </label>
          )}
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-bold">
            <span>{t("সর্বমোট", "Total")}</span>
            <span className="text-primary-dark">{t.money(total)}</span>
          </div>
          {stockIssues.length > 0 && (
            <p className="mt-2 rounded-lg bg-secondary p-2 text-[11px] font-semibold text-sale">
              {t("স্টক সীমিত:", "Limited stock:")} {stockIssues.map(({ line, p }) => t(`${line.name} (বাকি ${t.n(p?.stock ?? 0)})`, `${line.name} (${t.n(p?.stock ?? 0)} left)`)).join(", ")}
            </p>
          )}
          {!user && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("অর্ডার করতে", "To place an order,")} <Link to="/auth" className="font-semibold text-primary underline">{t("লগইন", "log in")}</Link> {t("করুন।", "")}
            </p>
          )}
          <button
            disabled={busy}
            onClick={() => void submit()}
            className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? t("প্রসেস হচ্ছে...", "Processing...") : needsRef ? t("পেমেন্ট করে অর্ডার নিশ্চিত করুন", "Pay and confirm order") : t("অর্ডার নিশ্চিত করুন", "Confirm order")}
          </button>
        </aside>
      </div>
    </div>
  );
}
