import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";

import { bn } from "@/data/catalog";
import { useAuth } from "@/hooks/useAuth";
import { useCatalog } from "@/lib/catalog-db";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "@/lib/appointments";

export const Route = createFileRoute("/rx/$id")({
  head: () => ({
    meta: [
      { title: "প্রেসক্রিপশন প্রিন্ট — ঔষধওয়ালা" },
      { name: "description", content: "কনসালটেশন শেষে ডাক্তারের প্রেসক্রিপশন দেখুন, প্রিন্ট করুন বা PDF হিসেবে সংরক্ষণ করুন।" },
      { property: "og:title", content: "প্রেসক্রিপশন প্রিন্ট — ঔষধওয়ালা" },
      { property: "og:description", content: "ঔষধের তালিকা, মাত্রা ও পরামর্শসহ প্রিন্টযোগ্য প্রেসক্রিপশন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: RxPrint,
});

type RxItem = { name: string; dose: string; duration: string };

function RxPrint() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { settings } = useCatalog();

  const { data, isLoading } = useQuery({
    queryKey: ["rx-print", id],
    enabled: !!user,
    queryFn: async () => {
      const [rx, appt] = await Promise.all([
        supabase.from("consultation_prescriptions").select("*").eq("appointment_id", id).maybeSingle(),
        supabase.from("appointments").select("*").eq("id", id).maybeSingle(),
      ]);
      if (rx.error) throw rx.error;
      if (appt.error) throw appt.error;
      return { rx: rx.data, appt: appt.data };
    },
  });

  if (!user) {
    return (
      <div className="pt-16 text-center text-sm">
        <p className="text-muted-foreground">প্রেসক্রিপশন দেখতে লগইন করুন।</p>
        <Link to="/auth" className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">লগইন</Link>
      </div>
    );
  }
  if (isLoading) return <p className="pt-16 text-center text-sm text-muted-foreground">লোড হচ্ছে...</p>;
  if (!data?.rx || !data.appt) {
    return (
      <div className="pt-16 text-center text-sm text-muted-foreground">
        এই কনসালটেশনের প্রেসক্রিপশন এখনো তৈরি হয়নি।{" "}
        <Link to="/consultation/$id" params={{ id }} className="font-semibold text-primary underline">কনসালটেশন রুম</Link>
      </div>
    );
  }

  const rx = data.rx;
  const appt = data.appt;
  const items = (Array.isArray(rx.items) ? rx.items : []) as unknown as RxItem[];

  return (
    <div className="pt-4 pb-10">
      <div className="flex items-center gap-2 print:hidden">
        <Link to="/consultation/$id" params={{ id }} className="text-[11px] font-semibold text-muted-foreground hover:text-primary">
          ← কনসালটেশন রুম
        </Link>
        <button
          onClick={() => window.print()}
          className="ml-auto flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
        >
          <Printer className="h-3.5 w-3.5" /> প্রিন্ট / PDF সংরক্ষণ
        </button>
      </div>

      <article className="mt-3 rounded-2xl border border-border bg-card p-6 print:border-0 print:p-0">
        <header className="flex items-start border-b-2 border-primary pb-3">
          <div>
            <h1 className="font-display text-xl font-extrabold text-primary">ঔষধওয়ালা · Oushodhwala</h1>
            <p className="text-[11px] text-muted-foreground">অনলাইন ডাক্তার কনসালটেশন প্রেসক্রিপশন</p>
            <p className="text-[11px] text-muted-foreground">হটলাইন: {settings.supportPhone}</p>
          </div>
          <div className="ml-auto text-right text-[11px]">
            <p className="font-bold">{rx.doctor_name || appt.doctor_name}</p>
            <p className="text-muted-foreground">{appt.doctor_spec}</p>
            <p className="text-muted-foreground">ইনভয়েস #{appt.invoice_no}</p>
          </div>
        </header>

        <section className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <Field t="রোগী" v={rx.patient_name || appt.patient_name} />
          <Field t="মোবাইল" v={appt.phone} />
          <Field t="সেশন" v={fmtDateTime(appt.scheduled_at)} />
          <Field t="তৈরি" v={fmtDateTime(rx.created_at)} />
        </section>

        {rx.diagnosis && (
          <section className="mt-4">
            <h2 className="text-xs font-bold text-navy">রোগ নির্ণয় / Diagnosis</h2>
            <p className="mt-1 whitespace-pre-wrap text-xs">{rx.diagnosis}</p>
          </section>
        )}

        <section className="mt-4">
          <h2 className="font-display text-2xl font-extrabold text-primary">℞</h2>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">কোনো ঔষধ যোগ করা হয়নি।</p>
          ) : (
            <ol className="mt-1 space-y-2">
              {items.map((it, i) => (
                <li key={i} className="border-b border-dashed border-border pb-1.5 text-xs">
                  <span className="font-bold">{bn(i + 1)}. {it.name}</span>
                  <div className="ml-4 text-[11px] text-muted-foreground">
                    {it.dose && <span>মাত্রা: {it.dose}</span>}
                    {it.duration && <span className="ml-3">সময়কাল: {it.duration}</span>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {rx.advice && (
          <section className="mt-4">
            <h2 className="text-xs font-bold text-navy">পরামর্শ / Advice</h2>
            <p className="mt-1 whitespace-pre-wrap text-xs">{rx.advice}</p>
          </section>
        )}

        {rx.follow_up && (
          <p className="mt-3 text-xs font-semibold">পরবর্তী ফলো-আপ: {new Date(rx.follow_up).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" })}</p>
        )}

        <footer className="mt-8 flex items-end justify-between text-[10px] text-muted-foreground">
          <p>এই প্রেসক্রিপশনটি অনলাইন কনসালটেশনের ভিত্তিতে তৈরি। জরুরি অবস্থায় নিকটস্থ হাসপাতালে যোগাযোগ করুন।</p>
          <div className="text-center">
            <div className="mb-1 w-40 border-t border-foreground" />
            <span>ডাক্তারের স্বাক্ষর</span>
          </div>
        </footer>
      </article>
    </div>
  );
}

function Field({ t, v }: { t: string; v: string }) {
  return (
    <p className="text-xs">
      <span className="text-muted-foreground">{t}: </span>
      <span className="font-semibold">{v}</span>
    </p>
  );
}
