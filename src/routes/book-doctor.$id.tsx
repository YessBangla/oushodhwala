import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Clock, Phone, MessageCircle, Video } from "lucide-react";

import { useCatalog } from "@/lib/catalog-db";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import {
  REFUND_POLICY_BN,
  REFUND_POLICY_EN,
  MODE_LABEL,
  PAYMENT_LABEL,
  WEEKDAYS,
  WEEKDAYS_EN,
  dayKey,
  isWorkingDay,
  nextDays,
  slotDate,
  slotTimes,
  type CallMode,
} from "@/lib/appointments";
import { opsStart, opsSuccess, opsFailure } from "@/lib/ops";

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

const MODES: { id: CallMode; icon: typeof Phone }[] = [
  { id: "phone", icon: Phone },
  { id: "whatsapp", icon: MessageCircle },
  { id: "video", icon: Video },
];

const ALL_PAYMENTS: { id: "cod" | "bkash" | "nagad" | "card"; e: string }[] = [
  { id: "cod", e: "💵" },
  { id: "bkash", e: "📱" },
  { id: "nagad", e: "📲" },
  { id: "card", e: "💳" },
];

function BookDoctor() {
  const t = useT();
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
      if (!user) throw new Error(t("বুকিং করতে লগইন করুন", "Please log in to book"));
      if (!time) throw new Error(t("সময় নির্বাচন করুন", "Select a time"));
      if (!name.trim() || !phone.trim()) throw new Error(t("নাম ও মোবাইল নম্বর দিন", "Enter name and mobile number"));
      opsStart("appointment_booking", { doctorId: id, mode });
      if (payment !== "cod" && !payRef.trim()) throw new Error(t("পেমেন্ট ট্রানজেকশন আইডি দিন", "Enter payment transaction ID"));
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
        opsFailure("appointment_booking", error, { doctorId: id, mode });
        if (error.message.includes("SLOT_TAKEN")) throw new Error(t("এই সময়টি ইতিমধ্যে বুক হয়ে গেছে, অন্য সময় নিন", "This slot is already booked, please choose another time"));
        if (error.message.includes("PAST_SLOT")) throw new Error(t("অতীতের সময় নির্বাচন করা যাবে না", "You cannot select a past time"));
        throw error;
      }
      return data as unknown as { id: string; invoice_no: string };
    },
    onSuccess: (appt) => {
      opsSuccess("appointment_booking", appt.invoice_no, { appointmentId: appt.id, mode });
      toast.success(t(`অ্যাপয়েন্টমেন্ট নিশ্চিত — ইনভয়েস #${appt.invoice_no}`, `Appointment confirmed — Invoice #${appt.invoice_no}`));
      void navigate({ to: "/consultation/$id", params: { id: appt.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!doctor) {
    return (
      <div className="pt-16 text-center text-sm text-muted-foreground">
        {t("ডাক্তার পাওয়া যায়নি।", "Doctor not found.")}{" "}
        <Link to="/doctor-consultation" className="font-semibold text-primary underline">
          {t("তালিকায় ফিরে যান", "Go back to the list")}
        </Link>
      </div>
    );
  }

  const now = Date.now();
  const closed = !isWorkingDay(day, doctor) || blackoutDays.has(dayKey(day));
  const weekdays = t.en ? WEEKDAYS_EN : WEEKDAYS;
  const locale = t.en ? "en-US" : "bn-BD";

  return (
    <div className="pt-4 pb-10">
      <Link to="/doctor-consultation" className="text-[11px] font-semibold text-muted-foreground hover:text-primary">
        ← {t("ডাক্তার তালিকা", "Doctor list")}
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
          <p className="text-[11px] text-muted-foreground">{t("অভিজ্ঞতা", "Experience")}: {doctor.exp}</p>
        </div>
        <span className="ml-auto font-display text-lg font-extrabold text-primary">{t.money(doctor.fee)}</span>
      </section>

      <Section icon={CalendarDays} title={t("তারিখ নির্বাচন করুন", "Select a date")}>
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
                <span className="block text-[10px] opacity-80">{d.toLocaleDateString(locale, { weekday: "short" })}</span>
                <span className="block text-sm font-bold">{d.toLocaleDateString(locale, { day: "numeric" })}</span>
                <span className="block text-[9px] opacity-80">{d.toLocaleDateString(locale, { month: "short" })}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          {t("কর্মদিবস", "Working days")}: {doctor.workDays.map((n) => weekdays[n]).join(", ")} · {t("সময়", "Time")}: {doctor.workStart}–{doctor.workEnd}
        </p>
      </Section>

      <Section icon={Clock} title={t("সময় নির্বাচন করুন", "Select a time")}>
        {closed ? (
          <p className="rounded-xl border border-border bg-secondary p-3 text-[11px] font-semibold">
            {t("এই দিনে ডাক্তার উপলব্ধ নন", "The doctor is not available on this day")}{blackoutReason ? ` — ${blackoutReason}` : ""}। {t("অন্য তারিখ নির্বাচন করুন।", "Please select another date.")}
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {slotTimes(doctor).map((s) => {
              const ts = slotDate(day, s).getTime();
              const disabled = ts < now || taken.includes(ts);
              const on = time === s;
              return (
                <button
                  key={s}
                  disabled={disabled}
                  onClick={() => setTime(s)}
                  className={`rounded-lg border py-2 text-[11px] font-semibold ${
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                  } ${disabled ? "cursor-not-allowed opacity-35 line-through" : ""}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-[10px] text-muted-foreground">{t(`প্রতিটি সেশন ${t.n(doctor.slotMinutes)} মিনিট। বুক হয়ে যাওয়া সময় নিষ্ক্রিয় দেখাবে।`, `Each session is ${t.n(doctor.slotMinutes)} minutes. Already booked slots will be disabled.`)}</p>
      </Section>


      <Section icon={Video} title={t("কলের মাধ্যম", "Call mode")}>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-[11px] font-semibold ${
                mode === m.id ? "border-primary bg-primary/5 text-primary" : "border-border bg-card"
              }`}
            >
              <m.icon className="h-4 w-4" /> {t(MODE_LABEL[m.id].bn, MODE_LABEL[m.id].en)}
            </button>
          ))}
        </div>
      </Section>

      <Section icon={Phone} title={t("রোগীর তথ্য", "Patient information")}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("রোগীর নাম", "Patient's name")} maxLength={100}
          className="w-full rounded-lg border border-border bg-card p-3 text-xs outline-none" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("মোবাইল নম্বর", "Mobile number")} maxLength={20}
          className="mt-2 w-full rounded-lg border border-border bg-card p-3 text-xs outline-none" />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000}
          placeholder={t("সমস্যার সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)", "Brief description of the problem (optional)")}
          className="mt-2 w-full rounded-lg border border-border bg-card p-3 text-xs outline-none" />
      </Section>

      <Section icon={CalendarDays} title={t("পেমেন্ট", "Payment")}>
        <div className="space-y-2">
          {ALL_PAYMENTS.map((m) => (
            <label key={m.id} className={`flex items-center gap-3 rounded-xl border p-3 text-xs ${payment === m.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
              <input type="radio" checked={payment === m.id} onChange={() => setPayment(m.id)} />
              <span>{m.e}</span>
              <span className="font-semibold">{t(PAYMENT_LABEL[m.id]!.bn, PAYMENT_LABEL[m.id]!.en)}</span>
            </label>
          ))}
        </div>
        {payment !== "cod" && (
          <input value={payRef} onChange={(e) => setPayRef(e.target.value)} maxLength={40}
            placeholder={t("ট্রানজেকশন আইডি (সিমুলেটেড গেটওয়ে)", "Transaction ID (simulated gateway)")}
            className="mt-2 w-full rounded-lg border border-border bg-card p-3 text-xs outline-none" />
        )}
      </Section>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-xs">
        <Row t={t("ডাক্তার", "Doctor")} v={doctor.name} />
        <Row t={t("সময়", "Time")} v={time ? `${day.toLocaleDateString(locale, { day: "numeric", month: "long" })}, ${time}` : "—"} />
        <Row t={t("মাধ্যম", "Mode")} v={t(MODE_LABEL[mode].bn, MODE_LABEL[mode].en)} />
        <div className="mt-2 flex items-center border-t border-border pt-2">
          <span className="font-bold">{t("মোট ফি", "Total fee")}</span>
          <span className="ml-auto font-display text-lg font-extrabold text-primary">{t.money(doctor.fee)}</span>
        </div>
      </div>

      <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-[10px] leading-relaxed text-muted-foreground">
        {t.en ? REFUND_POLICY_EN : REFUND_POLICY_BN}
      </p>

      {!user && (
        <p className="mt-3 rounded-lg bg-secondary p-3 text-xs">
          {t("বুকিং করতে", "To book,")}{" "}
          <Link to="/auth" className="font-semibold text-primary underline">{t("লগইন করুন", "log in")}</Link>।
        </p>
      )}

      <button
        onClick={() => book.mutate()}
        disabled={!user || !time || book.isPending}
        className="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {book.isPending ? t("নিশ্চিত হচ্ছে...", "Confirming...") : t(`পেমেন্ট করে বুক করুন — ৳${t.n(doctor.fee)}`, `Pay & book — ${t.money(doctor.fee)}`)}
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
