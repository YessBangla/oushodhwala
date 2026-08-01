import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Clock, Phone, MessageCircle, Video } from "lucide-react";

import { bn } from "@/data/catalog";
import { useCatalog } from "@/lib/catalog-db";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { REFUND_POLICY_BN, WEEKDAYS, dayKey, isWorkingDay, nextDays, slotDate, slotTimes, type CallMode } from "@/lib/appointments";

export const Route = createFileRoute("/book-doctor/$id")({
  head: () => ({
    meta: [
      { title: "ডাক্তার অ্যাপয়েন্টমেন্ট বুকিং — ঔষধওয়ালা" },
      { name: "description", content: "তারিখ ও সময় বেছে নিয়ে ভেরিফায়েড ডাক্তারের সাথে ফোন, হোয়াটসঅ্যাপ বা ভিডিও কনসালটেশন বুক করুন।" },
      { property: "og:title", content: "ডাক্তার অ্যাপয়েন্টমেন্ট বুকিং — ঔষধওয়ালা" },
      { property: "og:description", content: "কল করার আগে সময় নির্ধারণ করুন ও অনলাইনে ফি পরিশোধ করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: BookDoctor,
});

const MODES: { id: CallMode; t: string; icon: typeof Phone }[] = [
  { id: "phone", t: "ফোন কল", icon: Phone },
  { id: "whatsapp", t: "হোয়াটসঅ্যাপ", icon: MessageCircle },
  { id: "video", t: "ভিডিও কল", icon: Video },
];

const ALL_PAYMENTS = [
  { id: "cod", t: "ক্যাশ (কল শেষে)", e: "💵", key: "cod" as const },
  { id: "bkash", t: "bKash", e: "📱", key: "bkash" as const },
  { id: "nagad", t: "Nagad", e: "📲", key: "nagad" as const },
  { id: "card", t: "কার্ড", e: "💳", key: "card" as const },
];

function BookDoctor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { doctors } = useCatalog();
  const { user, profile } = useAuth();

  const doctor = doctors.find((d) => d.id === id);
  const days = useMemo(() => nextDays(14), []);
  const [day, setDay] = useState(days[0]!);
  const [time, setTime] = useState("");
  const [mode, setMode] = useState<CallMode>("video");
  const [payment, setPayment] = useState("bkash");
  const [payRef, setPayRef] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState(profile?.name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");

  const from = new Date(day);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + 86400000);

  const { data: blackouts = [] } = useQuery({
    queryKey: ["doctor-blackouts", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("doctor_blackouts").select("day,reason").eq("doctor_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: taken = [] } = useQuery({
    queryKey: ["taken-slots", id, dayKey(day)],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("doctor_taken_slots", {
        _doctor_id: id,
        _from: from.toISOString(),
        _to: to.toISOString(),
      });
      if (error) throw error;
      return (data ?? []).map((r: { scheduled_at: string }) => new Date(r.scheduled_at).getTime());
    },
  });

  const blackoutDays = new Set(blackouts.map((b) => b.day));
  const blackoutReason = blackouts.find((b) => b.day === dayKey(day))?.reason ?? "";


  const book = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("বুকিং করতে লগইন করুন");
      if (!time) throw new Error("সময় নির্বাচন করুন");
      if (!name.trim() || !phone.trim()) throw new Error("নাম ও মোবাইল নম্বর দিন");
      if (payment !== "cod" && !payRef.trim()) throw new Error("পেমেন্ট ট্রানজেকশন আইডি দিন");
      const { data, error } = await supabase.rpc("book_appointment", {
        _doctor_id: id,
        _mode: mode,
        _scheduled_at: slotDate(day, time).toISOString(),
        _patient_name: name.trim(),
        _phone: phone.trim(),
        _note: note.trim(),
        _payment_method: payment,
        _payment_ref: payRef.trim(),
      });
      if (error) {
        if (error.message.includes("SLOT_TAKEN")) throw new Error("এই সময়টি ইতিমধ্যে বুক হয়ে গেছে, অন্য সময় নিন");
        if (error.message.includes("PAST_SLOT")) throw new Error("অতীতের সময় নির্বাচন করা যাবে না");
        throw error;
      }
      return data as unknown as { id: string; invoice_no: string };
    },
    onSuccess: (appt) => {
      toast.success(`অ্যাপয়েন্টমেন্ট নিশ্চিত — ইনভয়েস #${appt.invoice_no}`);
      void navigate({ to: "/consultation/$id", params: { id: appt.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!doctor) {
    return (
      <div className="pt-16 text-center text-sm text-muted-foreground">
        ডাক্তার পাওয়া যায়নি।{" "}
        <Link to="/doctor-consultation" className="font-semibold text-primary underline">
          তালিকায় ফিরে যান
        </Link>
      </div>
    );
  }

  const now = Date.now();
  const closed = !isWorkingDay(day, doctor) || blackoutDays.has(dayKey(day));

  return (
    <div className="pt-4 pb-10">
      <Link to="/doctor-consultation" className="text-[11px] font-semibold text-muted-foreground hover:text-primary">
        ← ডাক্তার তালিকা
      </Link>

      <section className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        {doctor.photo ? (
          <img src={doctor.photo} alt={doctor.name} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-full bg-secondary text-2xl">{doctor.emoji}</span>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-base font-extrabold text-navy">{doctor.name}</h1>
          <p className="text-[11px] text-muted-foreground">{doctor.spec} · {doctor.degree}</p>
          <p className="text-[11px] text-muted-foreground">অভিজ্ঞতা: {doctor.exp}</p>
        </div>
        <span className="ml-auto font-display text-lg font-extrabold text-primary">৳{bn(doctor.fee)}</span>
      </section>

      <Section icon={CalendarDays} title="তারিখ নির্বাচন করুন">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((d) => {
            const on = dayKey(d) === dayKey(day);
            const off = !isWorkingDay(d, doctor) || blackoutDays.has(dayKey(d));
            return (
              <button
                key={dayKey(d)}
                disabled={off}
                onClick={() => { setDay(d); setTime(""); }}
                className={`shrink-0 rounded-xl border px-3 py-2 text-center ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"} ${off ? "cursor-not-allowed opacity-35 line-through" : ""}`}
              >
                <span className="block text-[10px] opacity-80">{d.toLocaleDateString("bn-BD", { weekday: "short" })}</span>
                <span className="block text-sm font-bold">{d.toLocaleDateString("bn-BD", { day: "numeric" })}</span>
                <span className="block text-[9px] opacity-80">{d.toLocaleDateString("bn-BD", { month: "short" })}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          কর্মদিবস: {doctor.workDays.map((n) => WEEKDAYS[n]).join(", ")} · সময়: {doctor.workStart}–{doctor.workEnd}
        </p>
      </Section>

      <Section icon={Clock} title="সময় নির্বাচন করুন">
        {closed ? (
          <p className="rounded-xl border border-border bg-secondary p-3 text-[11px] font-semibold">
            এই দিনে ডাক্তার উপলব্ধ নন{blackoutReason ? ` — ${blackoutReason}` : ""}। অন্য তারিখ নির্বাচন করুন।
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {slotTimes(doctor).map((t) => {
              const ts = slotDate(day, t).getTime();
              const disabled = ts < now || taken.includes(ts);
              const on = time === t;
              return (
                <button
                  key={t}
                  disabled={disabled}
                  onClick={() => setTime(t)}
                  className={`rounded-lg border py-2 text-[11px] font-semibold ${
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                  } ${disabled ? "cursor-not-allowed opacity-35 line-through" : ""}`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-[10px] text-muted-foreground">প্রতিটি সেশন {bn(doctor.slotMinutes)} মিনিট। বুক হয়ে যাওয়া সময় নিষ্ক্রিয় দেখাবে।</p>
      </Section>


      <Section icon={Video} title="কলের মাধ্যম">
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-[11px] font-semibold ${
                mode === m.id ? "border-primary bg-primary/5 text-primary" : "border-border bg-card"
              }`}
            >
              <m.icon className="h-4 w-4" /> {m.t}
            </button>
          ))}
        </div>
      </Section>

      <Section icon={Phone} title="রোগীর তথ্য">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="রোগীর নাম" maxLength={100}
          className="w-full rounded-lg border border-border bg-card p-3 text-xs outline-none" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="মোবাইল নম্বর" maxLength={20}
          className="mt-2 w-full rounded-lg border border-border bg-card p-3 text-xs outline-none" />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000}
          placeholder="সমস্যার সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)"
          className="mt-2 w-full rounded-lg border border-border bg-card p-3 text-xs outline-none" />
      </Section>

      <Section icon={CalendarDays} title="পেমেন্ট">
        <div className="space-y-2">
          {ALL_PAYMENTS.map((m) => (
            <label key={m.id} className={`flex items-center gap-3 rounded-xl border p-3 text-xs ${payment === m.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
              <input type="radio" checked={payment === m.id} onChange={() => setPayment(m.id)} />
              <span>{m.e}</span>
              <span className="font-semibold">{m.t}</span>
            </label>
          ))}
        </div>
        {payment !== "cod" && (
          <input value={payRef} onChange={(e) => setPayRef(e.target.value)} maxLength={40}
            placeholder="ট্রানজেকশন আইডি (সিমুলেটেড গেটওয়ে)"
            className="mt-2 w-full rounded-lg border border-border bg-card p-3 text-xs outline-none" />
        )}
      </Section>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-xs">
        <Row t="ডাক্তার" v={doctor.name} />
        <Row t="সময়" v={time ? `${day.toLocaleDateString("bn-BD", { day: "numeric", month: "long" })}, ${time}` : "—"} />
        <Row t="মাধ্যম" v={MODES.find((m) => m.id === mode)!.t} />
        <div className="mt-2 flex items-center border-t border-border pt-2">
          <span className="font-bold">মোট ফি</span>
          <span className="ml-auto font-display text-lg font-extrabold text-primary">৳{bn(doctor.fee)}</span>
        </div>
      </div>

      <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-[10px] leading-relaxed text-muted-foreground">
        {REFUND_POLICY_BN}
      </p>

      {!user && (
        <p className="mt-3 rounded-lg bg-secondary p-3 text-xs">
          বুকিং করতে{" "}
          <Link to="/auth" className="font-semibold text-primary underline">লগইন করুন</Link>।
        </p>
      )}

      <button
        onClick={() => book.mutate()}
        disabled={!user || !time || book.isPending}
        className="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {book.isPending ? "নিশ্চিত হচ্ছে..." : `পেমেন্ট করে বুক করুন — ৳${bn(doctor.fee)}`}
      </button>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Phone; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ t, v }: { t: string; v: string }) {
  return (
    <div className="flex py-0.5">
      <span className="text-muted-foreground">{t}</span>
      <span className="ml-auto font-semibold">{v}</span>
    </div>
  );
}
