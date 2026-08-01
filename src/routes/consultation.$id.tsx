import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Phone, MessageCircle, Video, Paperclip, Send, Mic, FileText, Star, Printer } from "lucide-react";

import { bn } from "@/data/catalog";
import { useCatalog } from "@/lib/catalog-db";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  MODE_LABEL,
  PAYMENT_LABEL,
  STATUS_LABEL,
  fmtDateTime,
  fmtTime,
  openConsultFile,
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
        <p className="text-muted-foreground">কনসালটেশন দেখতে লগইন করুন।</p>
        <Link to="/auth" className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">লগইন</Link>
      </div>
    );
  }
  if (isLoading) return <p className="pt-16 text-center text-sm text-muted-foreground">লোড হচ্ছে...</p>;
  if (!appt) {
    return (
      <div className="pt-16 text-center text-sm text-muted-foreground">
        অ্যাপয়েন্টমেন্ট পাওয়া যায়নি।{" "}
        <Link to="/appointments" className="font-semibold text-primary underline">আমার অ্যাপয়েন্টমেন্ট</Link>
      </div>
    );
  }

  const doctor = doctors.find((d) => d.id === appt.doctor_id);
  const mode = (appt.mode as CallMode) ?? "video";
  const phone = telNumber(doctor?.phone || settings.supportPhone || "");
  const wa = waNumber(doctor?.whatsapp || doctor?.phone || settings.supportPhone || "");
  const waText = encodeURIComponent(
    `আসসালামু আলাইকুম, আমি ঔষধওয়ালা থেকে ${appt.patient_name}। ${appt.doctor_name} এর সাথে ${fmtDateTime(appt.scheduled_at)} সময়ে অ্যাপয়েন্টমেন্ট (ইনভয়েস #${appt.invoice_no})।`,
  );
  const video = doctor?.videoUrl ?? "";
  const started = new Date(appt.scheduled_at).getTime() - 10 * 60000 <= Date.now();

  return (
    <div className="pt-4 pb-10">
      <Link to="/appointments" className="text-[11px] font-semibold text-muted-foreground hover:text-primary">
        ← আমার অ্যাপয়েন্টমেন্ট
      </Link>

      <section className="mt-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-xl">{doctor?.emoji ?? "🩺"}</span>
          <div className="min-w-0">
            <h1 className="font-display text-base font-extrabold text-navy">{appt.doctor_name}</h1>
            <p className="text-[11px] text-muted-foreground">{appt.doctor_spec}</p>
          </div>
          <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary-dark">
            {STATUS_LABEL[appt.status] ?? appt.status}
          </span>
        </div>
        <p className="mt-2 text-xs font-semibold">
          🗓️ {fmtDateTime(appt.scheduled_at)} · {MODE_LABEL[mode].emoji} {MODE_LABEL[mode].bn}
        </p>
        {appt.note && <p className="mt-1 text-[11px] text-muted-foreground">সমস্যা: {appt.note}</p>}

        <div className="mt-3 grid grid-cols-3 gap-2">
          <CallBtn href={phone ? `tel:${phone}` : ""} icon={Phone} t="ফোন" active={started} />
          <CallBtn href={wa ? `https://wa.me/${wa}?text=${waText}` : ""} icon={MessageCircle} t="হোয়াটসঅ্যাপ" active={started} external />
          <CallBtn href={video} icon={Video} t="ভিডিও কল" active={started} external />
        </div>
        {!started && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            নির্ধারিত সময়ের ১০ মিনিট আগে কল বাটনগুলো সক্রিয় হবে।
          </p>
        )}
      </section>

      <Invoice appt={appt} />

      <ChatBox appointmentId={id} userId={user.id} messages={messages} qc={qc} />

      <MediaBox appointmentId={id} userId={user.id} media={media} qc={qc} />

      <ReviewBox appointmentId={id} doctorId={appt.doctor_id} userId={user.id} name={appt.patient_name} review={review} qc={qc} />
    </div>
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
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4 print:border-0">
      <div className="flex items-center">
        <h2 className="text-sm font-bold">ইনভয়েস / রসিদ</h2>
        <button
          onClick={() => window.print()}
          className="ml-auto flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-semibold hover:border-primary hover:text-primary print:hidden"
        >
          <Printer className="h-3 w-3" /> প্রিন্ট
        </button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">ঔষধওয়ালা — ডাক্তার কনসালটেশন</p>
      <dl className="mt-3 space-y-1 text-xs">
        <IRow t="ইনভয়েস নং" v={`#${appt.invoice_no}`} />
        <IRow t="তারিখ" v={fmtDateTime(appt.created_at)} />
        <IRow t="রোগী" v={`${appt.patient_name} · ${appt.phone}`} />
        <IRow t="ডাক্তার" v={appt.doctor_name} />
        <IRow t="সেশন" v={`${fmtDateTime(appt.scheduled_at)} (${fmtTime(appt.scheduled_at)})`} />
        <IRow t="পেমেন্ট" v={`${PAYMENT_LABEL[appt.payment_method] ?? appt.payment_method}${appt.payment_ref ? ` · ${appt.payment_ref}` : ""}`} />
        <IRow t="অবস্থা" v={appt.payment_status === "paid" ? "পরিশোধিত ✅" : "বাকি"} />
      </dl>
      <div className="mt-2 flex items-center border-t border-border pt-2">
        <span className="text-xs font-bold">মোট</span>
        <span className="ml-auto font-display text-lg font-extrabold text-primary">৳{bn(Number(appt.fee))}</span>
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
      if (!file && !text.trim()) throw new Error("বার্তা লিখুন");
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
      <h2 className="text-sm font-bold">কল চলাকালীন চ্যাট ও ফাইল শেয়ার</h2>
      <p className="text-[11px] text-muted-foreground">প্রেসক্রিপশন, রিপোর্ট বা ছবি সরাসরি পাঠান।</p>

      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
        {messages.length === 0 && <p className="text-[11px] text-muted-foreground">এখনো কোনো বার্তা নেই।</p>}
        {messages.map((m) => (
          <div key={m.id} className={`rounded-xl p-2.5 text-xs ${m.sender === "patient" ? "ml-8 bg-primary/10" : "mr-8 bg-secondary"}`}>
            {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
            {m.file_url && (
              <button onClick={() => void openConsultFile(m.file_url).catch((e: Error) => toast.error(e.message))}
                className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-primary underline">
                <FileText className="h-3 w-3" /> {m.file_name || "ফাইল"}
              </button>
            )}
            <p className="mt-1 text-[9px] text-muted-foreground">{new Date(m.created_at).toLocaleString("bn-BD")}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button onClick={() => fileRef.current?.click()} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-primary" aria-label="ফাইল যুক্ত করুন">
          <Paperclip className="h-4 w-4" />
        </button>
        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) send.mutate(f); e.target.value = ""; }} />
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="বার্তা লিখুন..."
          onKeyDown={(e) => { if (e.key === "Enter") send.mutate(undefined); }}
          className="flex-1 rounded-lg border border-border bg-background p-2.5 text-xs outline-none" />
        <button onClick={() => send.mutate(undefined)} disabled={send.isPending}
          className="rounded-lg bg-primary p-2.5 text-primary-foreground disabled:opacity-50" aria-label="পাঠান">
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
        throw new Error("ট্রান্সক্রিপ্ট লিখুন বা রেকর্ডিং ফাইল দিন");
      }
      const { error } = await supabase.from("consultation_media").insert({
        appointment_id: appointmentId,
        user_id: userId,
        kind: file ? "recording" : "transcript",
        url,
        name: name || "টেক্সট ট্রান্সক্রিপ্ট",
        transcript: file ? "" : transcript.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTranscript("");
      toast.success("সংরক্ষণ হয়েছে — একাউন্ট থেকে যেকোনো সময় দেখতে পারবেন");
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
      <h2 className="text-sm font-bold">কল রেকর্ডিং ও ট্রান্সক্রিপ্ট</h2>
      <p className="text-[11px] text-muted-foreground">
        হোয়াটসঅ্যাপ বা ভিডিও কলের রেকর্ডিং আপলোড করুন অথবা কথোপকথনের সারাংশ লিখে রাখুন।
      </p>

      <div className="mt-3 flex gap-2">
        <button onClick={() => recRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 py-3 text-[11px] font-semibold">
          <Mic className="h-4 w-4 text-primary" /> রেকর্ডিং আপলোড (অডিও/ভিডিও)
        </button>
        <input ref={recRef} type="file" accept="audio/*,video/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) save.mutate(f); e.target.value = ""; }} />
      </div>

      <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={3} maxLength={5000}
        placeholder="ট্রান্সক্রিপ্ট / ডাক্তারের পরামর্শের সারাংশ..."
        className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-xs outline-none" />
      <button onClick={() => save.mutate(undefined)} disabled={save.isPending}
        className="mt-2 w-full rounded-lg bg-secondary py-2 text-xs font-bold text-primary-dark disabled:opacity-50">
        {save.isPending ? "সংরক্ষণ হচ্ছে..." : "ট্রান্সক্রিপ্ট সংরক্ষণ করুন"}
      </button>

      <ul className="mt-3 space-y-2">
        {media.map((m) => (
          <li key={m.id} className="rounded-xl border border-border p-3 text-xs">
            <div className="flex items-center gap-2">
              <span>{m.kind === "recording" ? "🎙️" : "📝"}</span>
              <span className="truncate font-semibold">{m.name}</span>
              {m.url && (
                <button onClick={() => void openConsultFile(m.url).catch((e: Error) => toast.error(e.message))}
                  className="ml-auto shrink-0 text-[11px] font-semibold text-primary underline">খুলুন</button>
              )}
              <button onClick={() => del.mutate(m.id)} className={`shrink-0 text-muted-foreground ${m.url ? "ml-2" : "ml-auto"}`} aria-label="মুছুন">✕</button>
            </div>
            {m.transcript && <p className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">{m.transcript}</p>}
            <p className="mt-1 text-[9px] text-muted-foreground">{new Date(m.created_at).toLocaleString("bn-BD")}</p>
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
      toast.success("আপনার মতামতের জন্য ধন্যবাদ");
      void qc.invalidateQueries({ queryKey: ["consult-review", appointmentId] });
      void qc.invalidateQueries({ queryKey: ["appointment", appointmentId] });
      void qc.invalidateQueries({ queryKey: ["doctor-reviews"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold">কল শেষে ডাক্তারকে রেটিং দিন</h2>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n} স্টার`}>
            <Star className={`h-6 w-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
          </button>
        ))}
        <span className="ml-2 self-center text-xs font-semibold">{bn(rating)}/৫</span>
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000}
        placeholder="আপনার অভিজ্ঞতা লিখুন (ঐচ্ছিক)"
        className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-xs outline-none" />
      <button onClick={() => save.mutate()} disabled={save.isPending}
        className="mt-2 w-full rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
        {save.isPending ? "জমা হচ্ছে..." : review ? "মতামত হালনাগাদ করুন" : "মতামত জমা দিন"}
      </button>
    </section>
  );
}
