import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download, FileText, Mic, Star } from "lucide-react";

import { bn } from "@/data/catalog";
import { supabase } from "@/integrations/supabase/client";
import {
  MODE_LABEL,
  REFUND_LABEL,
  STATUS_LABEL,
  downloadCsv,
  fmtDateTime,
  type CallMode,
} from "@/lib/appointments";

const STATUSES = ["all", "confirmed", "completed", "cancelled"] as const;

export function Consultations() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState("");

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["admin-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*").order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list.filter((a) => {
      if (status !== "all" && a.status !== status) return false;
      if (!needle) return true;
      return [a.invoice_no, a.doctor_name, a.patient_name, a.phone].some((v) => (v ?? "").toLowerCase().includes(needle));
    });
  }, [list, status, q]);

  const refund = useMutation({
    mutationFn: async ({ id, st }: { id: string; st: string }) => {
      const { error } = await supabase.rpc("admin_set_refund_status", { _appointment_id: id, _status: st });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("রিফান্ড স্ট্যাটাস হালনাগাদ");
      void qc.invalidateQueries({ queryKey: ["admin-appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").update({ status: "completed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("কনসালটেশন সম্পন্ন চিহ্নিত");
      void qc.invalidateQueries({ queryKey: ["admin-appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportCsv = () => {
    downloadCsv(
      "consultations.csv",
      rows.map((a) => ({
        ইনভয়েস: a.invoice_no,
        তারিখ: fmtDateTime(a.scheduled_at),
        ডাক্তার: a.doctor_name,
        রোগী: a.patient_name,
        মোবাইল: a.phone,
        মাধ্যম: MODE_LABEL[(a.mode as CallMode) ?? "video"].bn,
        ফি: a.fee,
        স্ট্যাটাস: STATUS_LABEL[a.status]?.bn ?? a.status,
        পেমেন্ট: a.payment_status,
        রিফান্ড: REFUND_LABEL[a.refund_status]?.bn ?? a.refund_status,
        "রিফান্ড টাকা": a.refund_amount,
      })),
    );
  };

  if (isLoading) return <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold ${status === s ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
            {s === "all" ? "সব" : STATUS_LABEL[s]?.bn ?? s}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ইনভয়েস / ডাক্তার / রোগী / মোবাইল"
          className="min-w-[180px] flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] outline-none" />
        <button onClick={exportCsv} className="flex items-center gap-1 rounded-lg bg-navy px-3 py-1.5 text-[11px] font-bold text-white">
          <Download className="h-3.5 w-3.5" /> CSV এক্সপোর্ট
        </button>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">মোট {bn(rows.length)}টি কনসালটেশন</p>

      <div className="mt-3 space-y-2">
        {rows.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-navy">#{a.invoice_no}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-secondary text-primary-dark"}`}>
                {STATUS_LABEL[a.status]?.bn ?? a.status}
              </span>
              <span className="text-[11px] text-muted-foreground">{fmtDateTime(a.scheduled_at)}</span>
              <span className="ml-auto font-display text-sm font-extrabold text-primary">৳{bn(Number(a.fee))}</span>
            </div>
            <p className="mt-1 text-[11px]">
              <span className="font-semibold">{a.doctor_name}</span> · {a.patient_name} · {a.phone} · {MODE_LABEL[(a.mode as CallMode) ?? "video"].bn}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              পেমেন্ট: {a.payment_status} · রিফান্ড: {REFUND_LABEL[a.refund_status]?.bn ?? a.refund_status}
              {Number(a.refund_amount) > 0 ? ` (৳${bn(Number(a.refund_amount))})` : ""}
              {a.cancel_reason ? ` · কারণ: ${a.cancel_reason}` : ""}
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <Link to="/consultation/$id" params={{ id: a.id }} className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold">রুম</Link>
              <Link to="/rx/$id" params={{ id: a.id }} className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold">প্রেসক্রিপশন</Link>
              <button onClick={() => setOpen(open === a.id ? "" : a.id)} className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold">
                রেকর্ডিং / ফিডব্যাক
              </button>
              {a.status === "confirmed" && (
                <button onClick={() => complete.mutate(a.id)} className="rounded-lg border border-primary px-2 py-1 text-[10px] font-semibold text-primary">
                  সম্পন্ন
                </button>
              )}
              {a.status === "cancelled" && a.refund_status !== "refunded" && a.refund_status !== "none" && (
                <button onClick={() => refund.mutate({ id: a.id, st: "refunded" })} className="rounded-lg bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
                  রিফান্ড সম্পন্ন
                </button>
              )}
            </div>

            {open === a.id && <Detail appointmentId={a.id} />}
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-muted-foreground">কোনো কনসালটেশন পাওয়া যায়নি।</p>}
      </div>
    </div>
  );
}

function Detail({ appointmentId }: { appointmentId: string }) {
  const { data } = useQuery({
    queryKey: ["admin-consult-detail", appointmentId],
    queryFn: async () => {
      const [media, review] = await Promise.all([
        supabase.from("consultation_media").select("*").eq("appointment_id", appointmentId).order("created_at"),
        supabase.from("doctor_reviews").select("*").eq("appointment_id", appointmentId).maybeSingle(),
      ]);
      if (media.error) throw media.error;
      if (review.error) throw review.error;
      return { media: media.data, review: review.data };
    },
  });

  if (!data) return <p className="mt-2 text-[10px] text-muted-foreground">লোড হচ্ছে...</p>;

  return (
    <div className="mt-2 rounded-lg border border-dashed border-border p-3">
      <p className="text-[10px] font-bold text-muted-foreground">রেকর্ডিং ও ফাইল</p>
      <ul className="mt-1 space-y-1">
        {data.media.map((m) => (
          <li key={m.id} className="flex items-start gap-2 text-[11px]">
            {m.kind === "recording" ? <Mic className="mt-0.5 h-3 w-3 text-primary" /> : <FileText className="mt-0.5 h-3 w-3 text-primary" />}
            <div className="min-w-0">
              <p className="truncate font-semibold">{m.name}</p>
              {m.transcript && <p className="text-[10px] text-muted-foreground">ট্রান্সক্রিপ্ট: {m.transcript}</p>}
            </div>
          </li>
        ))}
        {data.media.length === 0 && <li className="text-[10px] text-muted-foreground">কোনো ফাইল নেই।</li>}
      </ul>

      <p className="mt-2 text-[10px] font-bold text-muted-foreground">রোগীর ফিডব্যাক</p>
      {data.review ? (
        <p className="mt-1 flex items-center gap-1 text-[11px]">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="font-bold">{bn(data.review.rating)}/৫</span>
          <span className="text-muted-foreground">{data.review.comment}</span>
        </p>
      ) : (
        <p className="text-[10px] text-muted-foreground">এখনো রিভিউ দেওয়া হয়নি।</p>
      )}
    </div>
  );
}
