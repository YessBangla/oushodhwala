import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { bn } from "@/data/catalog";
import { useCatalog } from "@/lib/catalog-db";

export const Route = createFileRoute("/doctor-consultation")({
  head: () => ({
    meta: [
      { title: "অনলাইন ডাক্তার পরামর্শ — ঔষধওয়ালা" },
      { name: "description", content: "রেজিস্টার্ড ডাক্তারের সাথে অনলাইনে ভিডিও কলে পরামর্শ নিন — মেডিসিন, শিশু, চর্ম, হৃদরোগ ও গাইনি বিশেষজ্ঞ।" },
      { property: "og:title", content: "অনলাইন ডাক্তার পরামর্শ — ঔষধওয়ালা" },
      { property: "og:description", content: "ঘরে বসে বিশেষজ্ঞ ডাক্তারের অ্যাপয়েন্টমেন্ট নিন।" },
    ],
  }),
  component: Consultation,
});

function Consultation() {
  const { doctors } = useCatalog();
  const [spec, setSpec] = useState("সব");
  const [booked, setBooked] = useState<string | null>(null);

  const specs = ["সব", ...Array.from(new Set(doctors.map((d) => d.spec).filter(Boolean)))];
  const list = doctors.filter((d) => spec === "সব" || d.spec === spec);

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">ডাক্তার পরামর্শ</h1>
      <p className="text-xs text-muted-foreground">ভেরিফায়েড ডাক্তারের সাথে ভিডিও/অডিও কনসালটেশন</p>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {specs.map((s) => (
          <button
            key={s}
            onClick={() => setSpec(s)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
              spec === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {booked && (
        <p className="mt-3 rounded-lg bg-secondary p-3 text-xs font-semibold text-primary-dark">
          ✅ {booked} এর সাথে অ্যাপয়েন্টমেন্ট নিশ্চিত হয়েছে। কনফার্মেশন SMS পাঠানো হয়েছে।
        </p>
      )}

      {list.length === 0 && <p className="mt-4 text-xs text-muted-foreground">এই মুহূর্তে কোনো ডাক্তার নেই।</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((d) => (
          <article key={d.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              {d.photo ? (
                <img src={d.photo} alt={d.name} loading="lazy" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-xl">{d.emoji}</span>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">{d.name}</p>
                <p className="text-[10px] text-muted-foreground">{d.spec}</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{d.degree}</p>
            <p className="text-[11px] text-muted-foreground">অভিজ্ঞতা: {d.exp}</p>
            <div className="mt-3 flex items-center">
              <span className="text-sm font-bold text-primary-dark">৳{bn(d.fee)}</span>
              <button
                onClick={() => setBooked(d.name)}
                className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
              >
                অ্যাপয়েন্টমেন্ট নিন
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
