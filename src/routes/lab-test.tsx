import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCatalog } from "@/lib/catalog-db";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { matchesQuery } from "@/lib/bn-search";

export const Route = createFileRoute("/lab-test")({
  head: () => ({
    meta: [
      { title: "ল্যাব টেস্ট — ঘরে বসে স্যাম্পল সংগ্রহ | ঔষধওয়ালা" },
      { name: "description", content: "সিবিসি, লিপিড প্রোফাইল, থাইরয়েড সহ ল্যাব টেস্ট বুক করুন। ঘরে বসে স্যাম্পল সংগ্রহ ও অনলাইন রিপোর্ট।" },
      { property: "og:title", content: "ল্যাব টেস্ট — ঔষধওয়ালা" },
      { property: "og:description", content: "ঘরে বসে স্যাম্পল সংগ্রহ, ডিজিটাল রিপোর্ট, ৫০% পর্যন্ত ছাড়।" },
    ],
  }),
  component: LabTest,
});

const GROUPS = [
  { id: "all", bn: "সব টেস্ট", en: "All tests" },
  { id: "vital", bn: "ভাইটাল অর্গান", en: "Vital organ" },
  { id: "life_style", bn: "লাইফস্টাইল", en: "Lifestyle" },
  { id: "checkup_women", bn: "নারীদের চেকআপ", en: "Women's checkup" },
  { id: "checkup_men", bn: "পুরুষদের চেকআপ", en: "Men's checkup" },
];

function LabTest() {
  const t = useT();
  const { add, cart } = useStore();
  const { labTests } = useCatalog();
  const [group, setGroup] = useState("all");
  const [q, setQ] = useState("");
  const [booking, setBooking] = useState({ name: "", phone: "", date: "", address: "" });
  const [done, setDone] = useState(false);

  const list = labTests.filter(
    (test) => (group === "all" || test.group === group) && matchesQuery(q, test.bn, test.en),
  );

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">{t("ল্যাব টেস্ট", "Lab Test")}</h1>
      <p className="text-xs text-muted-foreground">{t("ঘরে বসে স্যাম্পল সংগ্রহ · ২৪ ঘণ্টায় ডিজিটাল রিপোর্ট", "Home sample collection · Digital report in 24 hours")}</p>

      <Link
        to="/home-diagnostics"
        className="mt-3 flex items-center gap-2 rounded-xl border border-primary bg-primary/10 px-3 py-2.5 text-xs font-semibold text-primary-dark"
      >
        🏠 {t("বাসায় গিয়ে স্যাম্পল কালেকশন বুক করুন", "Book home sample collection")}
      </Link>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("টেস্টের নাম লিখুন...", "Type a test name...")}
        className="mt-3 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none"
      />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            onClick={() => setGroup(g.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
              group === g.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
            }`}
          >
            {t(g.bn, g.en)}
          </button>
        ))}
      </div>

      {list.length === 0 && <p className="mt-4 text-xs text-muted-foreground">{t("কোনো টেস্ট পাওয়া যায়নি।", "No tests found.")}</p>}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((test) => {
          const inCart = cart.some((l) => l.id === test.id);
          return (
            <article key={test.id} className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs font-bold">{t(test.bn, test.en)}</p>
              <p className="text-[10px] text-muted-foreground">{test.en} · {test.prep}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-bold text-primary-dark">{t.money(test.price)}</span>
                {test.mrp > test.price && <span className="text-[10px] text-muted-foreground line-through">{t.money(test.mrp)}</span>}
                <button
                  disabled={inCart}
                  onClick={() => add({ id: test.id, kind: "lab", name: test.bn, price: test.price })}
                  className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {inCart ? t("যোগ হয়েছে", "Added") : t("বুক করুন", "Book now")}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">{t("স্যাম্পল সংগ্রহের সময় নির্ধারণ", "Schedule sample collection")}</h2>
        {done ? (
          <p className="mt-2 rounded-lg bg-secondary p-3 text-xs font-semibold text-primary-dark">
            ✅ {t("বুকিং গ্রহণ করা হয়েছে। আমাদের ফ্লেবোটমিস্ট নির্ধারিত সময়ে আপনার ঠিকানায় পৌঁছাবেন।", "Booking received. Our phlebotomist will reach your address at the scheduled time.")}
          </p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input value={booking.name} onChange={(e) => setBooking({ ...booking, name: e.target.value })} placeholder={t("রোগীর নাম", "Patient name")} className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none" />
            <input value={booking.phone} onChange={(e) => setBooking({ ...booking, phone: e.target.value })} placeholder={t("মোবাইল নম্বর", "Mobile number")} className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none" />
            <input type="date" value={booking.date} onChange={(e) => setBooking({ ...booking, date: e.target.value })} className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none" />
            <input value={booking.address} onChange={(e) => setBooking({ ...booking, address: e.target.value })} placeholder={t("ঠিকানা", "Address")} className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none" />
            <button
              onClick={() => booking.name && booking.phone && setDone(true)}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground sm:col-span-2"
            >
              {t("সময় নির্ধারণ করুন", "Schedule now")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
