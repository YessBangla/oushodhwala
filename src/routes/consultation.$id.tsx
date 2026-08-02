import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Phone, MessageCircle, Video, Paperclip, Send, Mic, FileText, Star, Printer, XCircle, ClipboardList } from "lucide-react";

import { bn } from "@/data/catalog";
import { useT } from "@/lib/i18n";
import { useCatalog } from "@/lib/catalog-db";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
import { opsStart, opsSuccess, opsFailure } from "@/lib/ops";
  MODE_LABEL,
  PAYMENT_LABEL,
  REFUND_LABEL,
  REFUND_POLICY_BN,
  REFUND_POLICY_EN,
  STATUS_LABEL,
  fmtDateTime,
  fmtTime,
  openConsultFile,
  refundPreview,
  telNumber,
  uploadConsultFile,
  waNumber,
  type CallMode,
} from "@/lib/appointments";

export const Route = createFileRoute("/consultation/$id")({
  head: () => ({
    meta: [
      { title: "কনসালটেশন রুম — ঔষধওয়ালা" },
      { name: "description", content: "ডাক্তারের সাথে কল, চ্যাট, রিপোর্ট শেয়ার, রেকর্ডিং সংরক্ষণ ও ইনভয়েস — সব এক জায়গায়।" },
      { property: "og:title", content: "কনসালটেশন রুম — ঔষধওয়ালা" },
      { property: "og:description", content: "আপনার ডাক্তার অ্যাপয়েন্টমেন্টের সম্পূর্ণ তথ্য।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: ConsultationRoom,
});

function ConsultationRoom() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { doctors, settings } = useCatalog();
  const qc = useQueryClient();
  const t = useT();

  const { data: appt, isLoading } = useQuery({
    queryKey: ["appointment", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["consult-messages", id],
    enabled: !!appt,
    refetchInterval: 8000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultation_messages")
        .select("*")
        .eq("appointment_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: media = [] } = useQuery({
    queryKey: ["consult-media", id],
    enabled: !!appt,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultation_media")
        .select("*")
        .eq("appointment_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: review } = useQuery({
    queryKey: ["consult-review", id],
    enabled: !!appt,
    queryFn: async () => {
      const { data, error } = await supabase.from("doctor_reviews").select("*").eq("appointment_id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!user) {
    return (
      <div className="pt-16 text-center text-sm">
        <p className="text-muted-foreground">{t("কনসালটেশন দেখতে লগইন করুন।", "Log in to view the consultation.")}</p>
        <Link to="/auth" className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">{t("লগইন", "Log in")}</Link>
      </div>
    );
  }
  if (isLoading) return <p className="pt-16 text-center text-sm text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>;
  if (!appt) {
    return (
      <div className="pt-16 text-center text-sm text-muted-foreground">
        {t("অ্যাপয়েন্টমেন্ট পাওয়া যায়নি।", "Appointment not found.")}{" "}
        <Link to="/appointments" className="font-semibold text-primary underline">{t("আমার অ্যাপয়েন্টমেন্ট", "My appointments")}</Link>
      </div>
    );
  }

  const doctor = doctors.find((d) => d.id === appt.doctor_id);
  const mode = (appt.mode as CallMode) ?? "video";
  const phone = telNumber(doctor?.phone || settings.supportPhone || "");
  const wa = waNumber(doctor?.whatsapp || doctor?.phone || settings.supportPhone || "");
  const waText = encodeURIComponent(
    t.en
      ? `Hello, I am ${appt.patient_name} from Oushodhwala. I have an appointment with ${appt.doctor_name} at ${fmtDateTime(appt.scheduled_at)} (invoice #${appt.invoice_no}).`
      : `আসসালামু আলাইকুম, আমি ঔষধওয়ালা থেকে ${appt.patient_name}। ${appt.doctor_name} এর সাথে ${fmtDateTime(appt.scheduled_at)} সময়ে অ্যাপয়েন্টমেন্ট (ইনভয়েস #${appt.invoice_no})।`,
  );
  const video = (appt.join_url || doctor?.videoUrl) ?? "";
  const started = new Date(appt.scheduled_at).getTime() - 10 * 60000 <= Date.now();

  return (
    <div className="pt-4 pb-10">
      <Link to="/appointments" className="text-[11px] font-semibold text-muted-foreground hover:text-primary">
        ← {t("আমার অ্যাপয়েন্টমেন্ট", "My appointments")}
      </Link>

      <section className="mt-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-xl">{doctor?.emoji ?? "🩺"}</span>
          <div className="min-w-0">
            <h1 className="font-display text-base font-extrabold text-navy">{appt.doctor_name}</h1>
            <p className="text-[11px] text-muted-foreground">{appt.doctor_spec}</p>
          </div>
          <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary-dark">
            {t(STATUS_LABEL[appt.status]?.bn ?? appt.status, STATUS_LABEL[appt.status]?.en ?? appt.status)}
          </span>
        </div>
        <p className="mt-2 text-xs font-semibold">
          🗓️ {fmtDateTime(appt.scheduled_at)} · {MODE_LABEL[mode].emoji} {t(MODE_LABEL[mode].bn, MODE_LABEL[mode].en)}
        </p>
        {appt.note && <p className="mt-1 text-[11px] text-muted-foreground">{t("সমস্যা", "Issue")}: {appt.note}</p>}

        <div className="mt-3 grid grid-cols-3 gap-2">
          <CallBtn href={phone ? `tel:${phone}` : ""} icon={Phone} t={t("ফোন", "Phone")} active={started} />
          <CallBtn href={wa ? `https://wa.me/${wa}?text=${waText}` : ""} icon={MessageCircle} t={t("হোয়াটসঅ্যাপ", "WhatsApp")} active={started} external />
          <CallBtn href={video} icon={Video} t={t("ভিডিও কল", "Video call")} active={started} external />
        </div>
        {!started && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            {t("নির্ধারিত সময়ের ১০ মিনিট আগে কল বাটনগুলো সক্রিয় হবে।", "Call buttons activate 10 minutes before the scheduled time.")}
          </p>
        )}
      </section>

      <CancelBox appt={appt} qc={qc} />

      <Invoice appt={appt} />

      <RxBox appointmentId={id} userId={user.id} doctorName={appt.doctor_name} patientName={appt.patient_name} qc={qc} />

      <ChatBox appointmentId={id} userId={user.id} messages={messages} qc={qc} />

      <MediaBox appointmentId={id} userId={user.id} media={media} qc={qc} />

      <ReviewBox appointmentId={id} doctorId={appt.doctor_id} userId={user.id} name={appt.patient_name} review={review} qc={qc} />
    </div>
  );
}

function CancelBox({
  appt, qc,
}: {
  appt: { id: string; status: string; fee: number; scheduled_at: string; payment_status: string; refund_status: string; refund_amount: number; cancel_reason: string };
  qc: ReturnType<typeof useQueryClient>;
}) {
  const t = useT();
  const [reason, setReason] = useState("");
  const preview = refundPreview(Number(appt.fee), appt.scheduled_at, appt.payment_status === "paid", t.en);

  const cancel = useMutation({
    mutationFn: async () => {
      opsStart("appointment_cancel", { appointmentId: appt.id });
      const { error } = await supabase.rpc("cancel_appointment", { _appointment_id: appt.id, _reason: reason.trim() });
      if (error) {
        opsFailure("appointment_cancel", error, { appointmentId: appt.id });
        throw error;
      }
      opsSuccess("appointment_cancel", appt.id);
    },
    onSuccess: () => {
      toast.success(t("অ্যাপয়েন্টমেন্ট বাতিল হয়েছে", "Appointment cancelled"));
      void qc.invalidateQueries({ queryKey: ["appointment", appt.id] });
      void qc.invalidateQueries({ queryKey: ["my-appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (appt.status === "cancelled") {
    return (
      <section className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-xs">
        <h2 className="text-sm font-bold text-destructive">{t("অ্যাপয়েন্টমেন্ট বাতিল", "Appointment cancelled")}</h2>
        {appt.cancel_reason && <p className="mt-1 text-muted-foreground">{t("কারণ", "Reason")}: {appt.cancel_reason}</p>}
        <p className="mt-1 font-semibold">
          {t("রিফান্ড", "Refund")}: {t(REFUND_LABEL[appt.refund_status]?.bn ?? appt.refund_status, REFUND_LABEL[appt.refund_status]?.en ?? appt.refund_status)}
          {Number(appt.refund_amount) > 0 ? ` · ${t.money(Number(appt.refund_amount))}` : ""}
        </p>
      </section>
    );
  }
  if (appt.status === "completed") return null;

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold"><XCircle className="h-4 w-4 text-destructive" /> {t("অ্যাপয়েন্টমেন্ট বাতিল করুন", "Cancel appointment")}</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t(REFUND_POLICY_BN, REFUND_POLICY_EN)}</p>
      <p className="mt-2 rounded-lg bg-secondary p-2.5 text-[11px] font-semibold">
        {t("এখন বাতিল করলে", "If you cancel now")}: {preview.text} {preview.amount > 0 ? `(${t.money(preview.amount)})` : ""}
      </p>
      <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder={t("বাতিলের কারণ (ঐচ্ছিক)", "Reason for cancellation (optional)")}
        className="mt-2 w-full rounded-lg border border-border bg-background p-2.5 text-xs outline-none" />
      <button onClick={() => cancel.mutate()} disabled={cancel.isPending}
        className="mt-2 w-full rounded-lg border border-destructive py-2 text-xs font-bold text-destructive disabled:opacity-50">
        {cancel.isPending ? t("বাতিল হচ্ছে...", "Cancelling...") : t("বাতিল নিশ্চিত করুন", "Confirm cancellation")}
      </button>
    </section>
  );
}

type RxItem = { name: string; dose: string; duration: string };

function RxBox({
  appointmentId, userId, doctorName, patientName, qc,
}: { appointmentId: string; userId: string; doctorName: string; patientName: string; qc: ReturnType<typeof useQueryClient> }) {
  const { data: rx } = useQuery({
    queryKey: ["consult-rx", appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("consultation_prescriptions").select("*").eq("appointment_id", appointmentId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [open, setOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [items, setItems] = useState<RxItem[]>([{ name: "", dose: "", duration: "" }]);
  const [loaded, setLoaded] = useState(false);
  const t = useT();

  if (rx && !loaded) {
    setLoaded(true);
    setDiagnosis(rx.diagnosis ?? "");
    setAdvice(rx.advice ?? "");
    setFollowUp(rx.follow_up ?? "");
    const list = (Array.isArray(rx.items) ? rx.items : []) as unknown as RxItem[];
    if (list.length) setItems(list);
  }

  const save = useMutation({
    mutationFn: async () => {
      const clean = items.filter((i) => i.name.trim()).map((i) => ({ name: i.name.trim(), dose: i.dose.trim(), duration: i.duration.trim() }));
      if (clean.length === 0 && !diagnosis.trim() && !advice.trim()) throw new Error(t("অন্তত একটি ঔষধ বা পরামর্শ লিখুন", "Add at least one medicine or advice"));
      const payload = {
        appointment_id: appointmentId,
        user_id: userId,
        doctor_name: doctorName,
        patient_name: patientName,
        diagnosis: diagnosis.trim(),
        advice: advice.trim(),
        items: clean,
        follow_up: followUp || null,
      };
      const { error } = rx
        ? await supabase.from("consultation_prescriptions").update(payload).eq("appointment_id", appointmentId)
        : await supabase.from("consultation_prescriptions").insert(payload);
      if (error) {
        opsFailure("prescription_upload", error, { appointmentId, kind: "consultation_rx" });
        throw error;
      }
      opsSuccess("prescription_upload", appointmentId, { kind: "consultation_rx" });
    },
    onSuccess: () => {
      toast.success(t("প্রেসক্রিপশন সংরক্ষণ হয়েছে", "Prescription saved"));
      void qc.invalidateQueries({ queryKey: ["consult-rx", appointmentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center">
        <h2 className="flex items-center gap-2 text-sm font-bold"><ClipboardList className="h-4 w-4 text-primary" /> {t("প্রেসক্রিপশন", "Prescription")}</h2>
        {rx && (
          <Link to="/rx/$id" params={{ id: appointmentId }}
            className="ml-auto flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground">
            <Printer className="h-3 w-3" /> {t("প্রিন্ট / PDF", "Print / PDF")}
          </Link>
        )}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {t(
          "কল শেষে ডাক্তারের দেওয়া ঔষধ ও পরামর্শ এখানে লিখে রাখুন — প্রিন্টযোগ্য প্রেসক্রিপশন তৈরি হবে ও একাউন্টে সংরক্ষিত থাকবে।",
          "After the call, write down the medicines and advice given by the doctor — a printable prescription will be created and saved to the account."
        )}
      </p>

      {!open && !rx && (
        <button onClick={() => setOpen(true)} className="mt-3 w-full rounded-lg bg-secondary py-2 text-xs font-bold text-primary-dark">
          {t("প্রেসক্রিপশন তৈরি করুন", "Create prescription")}
        </button>
      )}

      {(open || rx) && (
        <div className="mt-3 space-y-2">
          <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={2} maxLength={1000}
            placeholder={t("রোগ নির্ণয় / Diagnosis", "Diagnosis")}
            className="w-full rounded-lg border border-border bg-background p-2.5 text-xs outline-none" />

          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <input value={it.name} maxLength={120} placeholder={t("ঔষধের নাম", "Medicine name")}
                onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                className="rounded-lg border border-border bg-background p-2.5 text-xs outline-none" />
              <input value={it.dose} maxLength={60} placeholder={t("মাত্রা (১+০+১)", "Dose (1+0+1)")}
                onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, dose: e.target.value } : x)))}
                className="rounded-lg border border-border bg-background p-2.5 text-xs outline-none" />
              <input value={it.duration} maxLength={60} placeholder={t("সময়কাল (৭ দিন)", "Duration (7 days)")}
                onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, duration: e.target.value } : x)))}
                className="rounded-lg border border-border bg-background p-2.5 text-xs outline-none" />
            </div>
          ))}
          <button onClick={() => setItems([...items, { name: "", dose: "", duration: "" }])}
            className="text-[11px] font-semibold text-primary underline">+ {t("আরেকটি ঔষধ", "Another medicine")}</button>

          <textarea value={advice} onChange={(e) => setAdvice(e.target.value)} rows={2} maxLength={1000}
            placeholder={t("পরামর্শ / Advice", "Advice")}
            className="w-full rounded-lg border border-border bg-background p-2.5 text-xs outline-none" />
          <label className="block text-[11px] font-semibold text-muted-foreground">
            {t("ফলো-আপ তারিখ", "Follow-up date")}
            <input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-xs outline-none" />
          </label>

          <button onClick={() => save.mutate()} disabled={save.isPending}
            className="w-full rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
            {save.isPending ? t("সংরক্ষণ হচ্ছে...", "Saving...") : rx ? t("প্রেসক্রিপশন হালনাগাদ করুন", "Update prescription") : t("প্রেসক্রিপশন সংরক্ষণ করুন", "Save prescription")}
          </button>
        </div>
      )}
    </section>
  );
}

function CallBtn({ href, icon: Icon, t, active, external }: { href: string; icon: typeof Phone; t: string; active: boolean; external?: boolean }) {
  const enabled = !!href && active;
  return (
    <a
      href={enabled ? href : undefined}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`flex flex-col items-center gap-1 rounded-xl border border-border py-2 text-[10px] font-semibold ${
        enabled ? "hover:border-primary hover:text-primary" : "pointer-events-none opacity-40"
      }`}
    >
      <Icon className="h-4 w-4" /> {t}
    </a>
  );
}

type Appt = {
  invoice_no: string;
  doctor_name: string;
  patient_name: string;
  phone: string;
  fee: number;
  payment_method: string;
  payment_status: string;
  payment_ref: string;
  created_at: string;
  scheduled_at: string;
  mode: string;
};

function Invoice({ appt }: { appt: Appt }) {
  const t = useT();
  const payLabel = PAYMENT_LABEL[appt.payment_method];
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4 print:border-0">
      <div className="flex items-center">
        <h2 className="text-sm font-bold">{t("ইনভয়েস / রসিদ", "Invoice / Receipt")}</h2>
        <button
          onClick={() => window.print()}
          className="ml-auto flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-semibold hover:border-primary hover:text-primary print:hidden"
        >
          <Printer className="h-3 w-3" /> {t("প্রিন্ট", "Print")}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{t("ঔষধওয়ালা — ডাক্তার কনসালটেশন", "Oushodhwala — Doctor consultation")}</p>
      <dl className="mt-3 space-y-1 text-xs">
        <IRow t={t("ইনভয়েস নং", "Invoice no.")} v={`#${appt.invoice_no}`} />
        <IRow t={t("তারিখ", "Date")} v={fmtDateTime(appt.created_at)} />
        <IRow t={t("রোগী", "Patient")} v={`${appt.patient_name} · ${appt.phone}`} />
        <IRow t={t("ডাক্তার", "Doctor")} v={appt.doctor_name} />
        <IRow t={t("সেশন", "Session")} v={`${fmtDateTime(appt.scheduled_at)} (${fmtTime(appt.scheduled_at)})`} />
        <IRow t={t("পেমেন্ট", "Payment")} v={`${t(payLabel?.bn ?? appt.payment_method, payLabel?.en ?? appt.payment_method)}${appt.payment_ref ? ` · ${appt.payment_ref}` : ""}`} />
        <IRow t={t("অবস্থা", "Status")} v={appt.payment_status === "paid" ? t("পরিশোধিত ✅", "Paid ✅") : t("বাকি", "Due")} />
      </dl>
      <div className="mt-2 flex items-center border-t border-border pt-2">
        <span className="text-xs font-bold">{t("মোট", "Total")}</span>
        <span className="ml-auto font-display text-lg font-extrabold text-primary">{t.money(Number(appt.fee))}</span>
      </div>
    </section>
  );
}

function IRow({ t, v }: { t: string; v: string }) {
  return (
    <div className="flex gap-3">
      <dt className="text-muted-foreground">{t}</dt>
      <dd className="ml-auto text-right font-semibold">{v}</dd>
    </div>
  );
}

type Msg = { id: string; body: string; sender: string; file_url: string; file_name: string; created_at: string };

function ChatBox({
  appointmentId, userId, messages, qc,
}: { appointmentId: string; userId: string; messages: Msg[]; qc: ReturnType<typeof useQueryClient> }) {
  const t = useT();
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const send = useMutation({
    mutationFn: async (file?: File) => {
      let file_url = "";
      let file_name = "";
      if (file) {
        const up = await uploadConsultFile(userId, appointmentId, file);
        file_url = up.path;
        file_name = up.name;
      }
      if (!file && !text.trim()) throw new Error(t("বার্তা লিখুন", "Write a message"));
      const { error } = await supabase.from("consultation_messages").insert({
        appointment_id: appointmentId,
        user_id: userId,
        sender: "patient",
        body: text.trim(),
        file_url,
        file_name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      void qc.invalidateQueries({ queryKey: ["consult-messages", appointmentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold">{t("কল চলাকালীন চ্যাট ও ফাইল শেয়ার", "Chat & file share during the call")}</h2>
      <p className="text-[11px] text-muted-foreground">{t("প্রেসক্রিপশন, রিপোর্ট বা ছবি সরাসরি পাঠান।", "Send prescriptions, reports, or photos directly.")}</p>

      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
        {messages.length === 0 && <p className="text-[11px] text-muted-foreground">{t("এখনো কোনো বার্তা নেই।", "No messages yet.")}</p>}
        {messages.map((m) => (
          <div key={m.id} className={`rounded-xl p-2.5 text-xs ${m.sender === "patient" ? "ml-8 bg-primary/10" : "mr-8 bg-secondary"}`}>
            {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
            {m.file_url && (
              <button onClick={() => void openConsultFile(m.file_url).catch((e: Error) => toast.error(e.message))}
                className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-primary underline">
                <FileText className="h-3 w-3" /> {m.file_name || t("ফাইল", "File")}
              </button>
            )}
            <p className="mt-1 text-[9px] text-muted-foreground">{new Date(m.created_at).toLocaleString(t.en ? "en-US" : "bn-BD")}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button onClick={() => fileRef.current?.click()} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-primary" aria-label={t("ফাইল যুক্ত করুন", "Attach file")}>
          <Paperclip className="h-4 w-4" />
        </button>
        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) send.mutate(f); e.target.value = ""; }} />
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder={t("বার্তা লিখুন...", "Write a message...")}
          onKeyDown={(e) => { if (e.key === "Enter") send.mutate(undefined); }}
          className="flex-1 rounded-lg border border-border bg-background p-2.5 text-xs outline-none" />
        <button onClick={() => send.mutate(undefined)} disabled={send.isPending}
          className="rounded-lg bg-primary p-2.5 text-primary-foreground disabled:opacity-50" aria-label={t("পাঠান", "Send")}>
          <Send className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

type Media = { id: string; kind: string; url: string; name: string; transcript: string; created_at: string };

function MediaBox({
  appointmentId, userId, media, qc,
}: { appointmentId: string; userId: string; media: Media[]; qc: ReturnType<typeof useQueryClient> }) {
  const t = useT();
  const recRef = useRef<HTMLInputElement>(null);
  const [transcript, setTranscript] = useState("");

  const save = useMutation({
    mutationFn: async (file?: File) => {
      let url = "";
      let name = "";
      if (file) {
        const up = await uploadConsultFile(userId, appointmentId, file);
        url = up.path;
        name = up.name;
      } else if (!transcript.trim()) {
        throw new Error(t("ট্রান্সক্রিপ্ট লিখুন বা রেকর্ডিং ফাইল দিন", "Write a transcript or provide a recording file"));
      }
      const { error } = await supabase.from("consultation_media").insert({
        appointment_id: appointmentId,
        user_id: userId,
        kind: file ? "recording" : "transcript",
        url,
        name: name || t("টেক্সট ট্রান্সক্রিপ্ট", "Text transcript"),
        transcript: file ? "" : transcript.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTranscript("");
      toast.success(t("সংরক্ষণ হয়েছে — একাউন্ট থেকে যেকোনো সময় দেখতে পারবেন", "Saved — you can view it anytime from your account"));
      void qc.invalidateQueries({ queryKey: ["consult-media", appointmentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (mid: string) => {
      const { error } = await supabase.from("consultation_media").delete().eq("id", mid);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["consult-media", appointmentId] }),
  });

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold">{t("কল রেকর্ডিং ও ট্রান্সক্রিপ্ট", "Call recording & transcript")}</h2>
      <p className="text-[11px] text-muted-foreground">
        {t("হোয়াটসঅ্যাপ বা ভিডিও কলের রেকর্ডিং আপলোড করুন অথবা কথোপকথনের সারাংশ লিখে রাখুন।", "Upload a WhatsApp or video call recording, or write a summary of the conversation.")}
      </p>

      <div className="mt-3 flex gap-2">
        <button onClick={() => recRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 py-3 text-[11px] font-semibold">
          <Mic className="h-4 w-4 text-primary" /> {t("রেকর্ডিং আপলোড (অডিও/ভিডিও)", "Upload recording (audio/video)")}
        </button>
        <input ref={recRef} type="file" accept="audio/*,video/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) save.mutate(f); e.target.value = ""; }} />
      </div>

      <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={3} maxLength={5000}
        placeholder={t("ট্রান্সক্রিপ্ট / ডাক্তারের পরামর্শের সারাংশ...", "Transcript / summary of the doctor's advice...")}
        className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-xs outline-none" />
      <button onClick={() => save.mutate(undefined)} disabled={save.isPending}
        className="mt-2 w-full rounded-lg bg-secondary py-2 text-xs font-bold text-primary-dark disabled:opacity-50">
        {save.isPending ? t("সংরক্ষণ হচ্ছে...", "Saving...") : t("ট্রান্সক্রিপ্ট সংরক্ষণ করুন", "Save transcript")}
      </button>

      <ul className="mt-3 space-y-2">
        {media.map((m) => (
          <li key={m.id} className="rounded-xl border border-border p-3 text-xs">
            <div className="flex items-center gap-2">
              <span>{m.kind === "recording" ? "🎙️" : "📝"}</span>
              <span className="truncate font-semibold">{m.name}</span>
              {m.url && (
                <button onClick={() => void openConsultFile(m.url).catch((e: Error) => toast.error(e.message))}
                  className="ml-auto shrink-0 text-[11px] font-semibold text-primary underline">{t("খুলুন", "Open")}</button>
              )}
              <button onClick={() => del.mutate(m.id)} className={`shrink-0 text-muted-foreground ${m.url ? "ml-2" : "ml-auto"}`} aria-label={t("মুছুন", "Delete")}>✕</button>
            </div>
            {m.transcript && <p className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">{m.transcript}</p>}
            <p className="mt-1 text-[9px] text-muted-foreground">{new Date(m.created_at).toLocaleString(t.en ? "en-US" : "bn-BD")}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReviewBox({
  appointmentId, doctorId, userId, name, review, qc,
}: {
  appointmentId: string; doctorId: string; userId: string; name: string;
  review: { rating: number; comment: string } | null | undefined;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const t = useT();
  const [rating, setRating] = useState(review?.rating ?? 5);
  const [comment, setComment] = useState(review?.comment ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        appointment_id: appointmentId,
        doctor_id: doctorId,
        user_id: userId,
        patient_name: name,
        rating,
        comment: comment.trim().slice(0, 1000),
      };
      const { error } = review
        ? await supabase.from("doctor_reviews").update(payload).eq("appointment_id", appointmentId)
        : await supabase.from("doctor_reviews").insert(payload);
      if (error) throw error;
      await supabase.from("appointments").update({ status: "completed" }).eq("id", appointmentId);
    },
    onSuccess: () => {
      toast.success(t("আপনার মতামতের জন্য ধন্যবাদ", "Thanks for your feedback"));
      void qc.invalidateQueries({ queryKey: ["consult-review", appointmentId] });
      void qc.invalidateQueries({ queryKey: ["appointment", appointmentId] });
      void qc.invalidateQueries({ queryKey: ["doctor-reviews"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold">{t("কল শেষে ডাক্তারকে রেটিং দিন", "Rate the doctor after the call")}</h2>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} aria-label={t(`${n} স্টার`, `${n} star`)}>
            <Star className={`h-6 w-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
          </button>
        ))}
        <span className="ml-2 self-center text-xs font-semibold">{t.n(rating)}/{t.n(5)}</span>
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000}
        placeholder={t("আপনার অভিজ্ঞতা লিখুন (ঐচ্ছিক)", "Write your experience (optional)")}
        className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-xs outline-none" />
      <button onClick={() => save.mutate()} disabled={save.isPending}
        className="mt-2 w-full rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
        {save.isPending ? t("জমা হচ্ছে...", "Submitting...") : review ? t("মতামত হালনাগাদ করুন", "Update feedback") : t("মতামত জমা দিন", "Submit feedback")}
      </button>
    </section>
  );
}
