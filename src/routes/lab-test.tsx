import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { labTests, labGroups, bn } from "@/data/catalog";
import { useStore } from "@/lib/store";

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

function LabTest() {
  const { add, cart } = useStore();
  const [group, setGroup] = useState("all");
  const [q, setQ] = useState("");
  const [booking, setBooking] = useState({ name: "", phone: "", date: "", address: "" });
  const [done, setDone] = useState(false);

  const list = labTests.filter(
    (t) => (group === "all" || t.group === group) && (t.bn.includes(q) || t.en.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">ল্যাব টেস্ট</h1>
      <p className="text-xs text-muted-foreground">ঘরে বসে স্যাম্পল সংগ্রহ · ২৪ ঘণ্টায় ডিজিটাল রিপোর্ট</p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="টেস্টের নাম লিখুন..."
        className="mt-3 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none"
      />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {labGroups.map((g) => (
          <button
            key={g.id}
            onClick={() => setGroup(g.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
              group === g.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
            }`}
          >
            {g.bn}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t) => {
          const inCart = cart.some((l) => l.id === t.id);
          return (
            <article key={t.id} className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs font-bold">{t.bn}</p>
              <p className="text-[10px] text-muted-foreground">{t.en} · {t.prep}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-bold text-primary-dark">৳{bn(t.price)}</span>
                <span className="text-[10px] text-muted-foreground line-through">৳{bn(t.mrp)}</span>
                <button
                  disabled={inCart}
                  onClick={() => add({ id: t.id, kind: "lab", name: t.bn, price: t.price })}
                  className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {inCart ? "যোগ হয়েছে" : "বুক করুন"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">স্যাম্পল সংগ্রহের সময় নির্ধারণ</h2>
        {done ? (
          <p className="mt-2 rounded-lg bg-secondary p-3 text-xs font-semibold text-primary-dark">
            ✅ বুকিং গ্রহণ করা হয়েছে। আমাদের ফ্লেবোটমিস্ট নির্ধারিত সময়ে আপনার ঠিকানায় পৌঁছাবেন।
          </p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input value={booking.name} onChange={(e) => setBooking({ ...booking, name: e.target.value })} placeholder="রোগীর নাম" className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none" />
            <input value={booking.phone} onChange={(e) => setBooking({ ...booking, phone: e.target.value })} placeholder="মোবাইল নম্বর" className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none" />
            <input type="date" value={booking.date} onChange={(e) => setBooking({ ...booking, date: e.target.value })} className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none" />
            <input value={booking.address} onChange={(e) => setBooking({ ...booking, address: e.target.value })} placeholder="ঠিকানা" className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none" />
            <button
              onClick={() => booking.name && booking.phone && setDone(true)}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground sm:col-span-2"
            >
              সময় নির্ধারণ করুন
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
