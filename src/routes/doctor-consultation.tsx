import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Phone, MessageCircle, Video, Star, CalendarDays } from "lucide-react";

import { bn } from "@/data/catalog";
import { useCatalog } from "@/lib/catalog-db";
import { supabase } from "@/integrations/supabase/client";

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

function digits(v: string) {
  return v.replace(/[^\d+]/g, "");
}
function waNumber(v: string) {
  const d = v.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("880")) return d;
  if (d.startsWith("0")) return `88${d}`;
  return d;
}

function Consultation() {
  const { doctors, settings } = useCatalog();
  const [spec, setSpec] = useState("সব");

  const { data: reviews = [] } = useQuery({
    queryKey: ["doctor-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_reviews")
        .select("doctor_id, rating, comment, patient_name, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const ratingOf = (docId: string) => {
    const rs = reviews.filter((r) => r.doctor_id === docId);
    if (rs.length === 0) return null;
    const avg = rs.reduce((a, r) => a + r.rating, 0) / rs.length;
    return { avg, count: rs.length, latest: rs[0] };
  };

  const specs = ["সব", ...Array.from(new Set(doctors.map((d) => d.spec).filter(Boolean)))];
  const list = doctors.filter((d) => spec === "সব" || d.spec === spec);

  return (
    <div className="pt-4">
      <h1 className="font-display text-lg font-extrabold">ডাক্তার পরামর্শ</h1>
      <p className="text-xs text-muted-foreground">
        ভেরিফায়েড ডাক্তারের সাথে সরাসরি ফোন, হোয়াটসঅ্যাপ বা ভিডিও কলে কথা বলুন
      </p>

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

      <p className="mt-3 rounded-lg bg-secondary p-3 text-[11px] font-semibold text-primary-dark">
        📅 কল শুরুর আগে তারিখ ও সময় বেছে নিয়ে অ্যাপয়েন্টমেন্ট বুক করুন — পেমেন্টের পর ইনভয়েস, চ্যাট ও রেকর্ডিং সংরক্ষণের সুবিধা পাবেন।{" "}
        <Link to="/appointments" className="underline">আমার অ্যাপয়েন্টমেন্ট</Link>
      </p>

      {list.length === 0 && <p className="mt-4 text-xs text-muted-foreground">এই মুহূর্তে কোনো ডাক্তার নেই।</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((d) => {
          const phone = digits(d.phone || settings.supportPhone || "");
          const wa = waNumber(d.whatsapp || d.phone || settings.supportPhone || "");
          const video = d.videoUrl;
          const rating = ratingOf(d.id);
          const waText = encodeURIComponent(`আসসালামু আলাইকুম, আমি ঔষধওয়ালা থেকে ${d.name} এর সাথে পরামর্শ নিতে চাই।`);
          return (
            <article key={d.id} className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                {d.photo ? (
                  <img src={d.photo} alt={d.name} loading="lazy" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-xl">{d.emoji}</span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-navy">{d.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{d.spec}</p>
                </div>
                <span
                  className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    d.online ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {d.online ? "● অনলাইন" : "অফলাইন"}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">{d.degree}</p>
              <p className="text-[11px] text-muted-foreground">অভিজ্ঞতা: {d.exp}</p>
              {rating ? (
                <div className="mt-1">
                  <p className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {bn(Number(rating.avg.toFixed(1)))} <span className="text-muted-foreground">({bn(rating.count)} রিভিউ)</span>
                  </p>
                  {rating.latest?.comment && (
                    <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">“{rating.latest.comment}”</p>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-[10px] text-muted-foreground">এখনো কোনো রিভিউ নেই</p>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2">
                <a
                  href={phone ? `tel:${phone}` : undefined}
                  aria-disabled={!phone}
                  className={`flex flex-col items-center gap-1 rounded-xl border border-border py-2 text-[10px] font-semibold ${
                    phone ? "hover:border-primary hover:text-primary" : "pointer-events-none opacity-40"
                  }`}
                >
                  <Phone className="h-4 w-4" /> ফোন
                </a>
                <a
                  href={wa ? `https://wa.me/${wa}?text=${waText}` : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!wa}
                  className={`flex flex-col items-center gap-1 rounded-xl border border-border py-2 text-[10px] font-semibold ${
                    wa ? "hover:border-primary hover:text-primary" : "pointer-events-none opacity-40"
                  }`}
                >
                  <MessageCircle className="h-4 w-4" /> হোয়াটসঅ্যাপ
                </a>
                <a
                  href={video || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!video}
                  className={`flex flex-col items-center gap-1 rounded-xl border border-border py-2 text-[10px] font-semibold ${
                    video ? "hover:border-primary hover:text-primary" : "pointer-events-none opacity-40"
                  }`}
                >
                  <Video className="h-4 w-4" /> ভিডিও কল
                </a>
              </div>

              <div className="mt-3 flex items-center">
                <span className="font-display text-base font-extrabold text-primary">৳{bn(d.fee)}</span>
                <Link
                  to="/book-doctor/$id"
                  params={{ id: d.id }}
                  className="ml-auto flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground transition hover:bg-primary-dark"
                >
                  <CalendarDays className="h-3.5 w-3.5" /> সময় নিয়ে বুক করুন
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

