import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MODE_LABEL, fmtDateTime, type CallMode } from "@/lib/appointments";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/appointments")({
  head: () => ({
    meta: [
      { title: "আমার অ্যাপয়েন্টমেন্ট — ঔষধওয়ালা" },
      { name: "description", content: "ডাক্তার কনসালটেশনের তালিকা, ইনভয়েস, রেকর্ডিং ও ট্রান্সক্রিপ্ট এক জায়গায় দেখুন।" },
      { property: "og:title", content: "আমার অ্যাপয়েন্টমেন্ট — ঔষধওয়ালা" },
      { property: "og:description", content: "আপনার সব ডাক্তার অ্যাপয়েন্টমেন্ট ও রসিদ।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: Appointments,
});

const STATUS_T: Record<string, { bn: string; en: string }> = {
  confirmed: { bn: "নিশ্চিত", en: "Confirmed" },
  completed: { bn: "সম্পন্ন", en: "Completed" },
  cancelled: { bn: "বাতিল", en: "Cancelled" },
};

const REFUND_T: Record<string, { bn: string; en: string }> = {
  none: { bn: "—", en: "—" },
  not_applicable: { bn: "প্রযোজ্য নয়", en: "Not applicable" },
  not_eligible: { bn: "রিফান্ড প্রযোজ্য নয়", en: "Not eligible for refund" },
  pending: { bn: "রিফান্ড প্রক্রিয়াধীন", en: "Refund pending" },
  processing: { bn: "রিফান্ড চলছে", en: "Refund processing" },
  refunded: { bn: "রিফান্ড সম্পন্ন", en: "Refunded" },
};

function Appointments() {
  const t = useT();
  const { user } = useAuth();

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["my-appointments"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!user) {
    return (
      <div className="pt-16 text-center text-sm">
        <p className="text-muted-foreground">{t("অ্যাপয়েন্টমেন্ট দেখতে লগইন করুন।", "Log in to view appointments.")}</p>
        <Link to="/auth" className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">{t("লগইন", "Log in")}</Link>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <h1 className="font-display text-lg font-extrabold">{t("আমার অ্যাপয়েন্টমেন্ট", "My Appointments")}</h1>
      <p className="text-xs text-muted-foreground">{t("কল, চ্যাট, রেকর্ডিং ও ইনভয়েস দেখতে যেকোনো অ্যাপয়েন্টমেন্টে ক্লিক করুন।", "Click any appointment to view call, chat, recording and invoice.")}</p>

      {isLoading && <p className="mt-6 text-center text-xs text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>}

      {!isLoading && list.length === 0 && (
        <div className="mt-10 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">{t("এখনো কোনো অ্যাপয়েন্টমেন্ট নেই।", "No appointments yet.")}</p>
          <Link to="/doctor-consultation" className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            {t("ডাক্তার দেখুন", "See doctors")}
          </Link>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {list.map((a) => (
          <li key={a.id}>
            <Link to="/consultation/$id" params={{ id: a.id }} className="block rounded-2xl border border-border bg-card p-4 transition hover:border-primary">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-navy">{a.doctor_name}</p>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  a.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-secondary text-primary-dark"
                }`}>
                  {t(STATUS_T[a.status]?.bn ?? a.status, STATUS_T[a.status]?.en ?? a.status)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{a.doctor_spec}</p>
              <p className="mt-1 text-[11px] font-semibold">
                🗓️ {fmtDateTime(a.scheduled_at)} · {t(MODE_LABEL[(a.mode as CallMode) ?? "video"].bn, MODE_LABEL[(a.mode as CallMode) ?? "video"].en)}
              </p>
              <div className="mt-2 flex items-center text-[11px]">
                <span className="text-muted-foreground">{t("ইনভয়েস", "Invoice")} #{a.invoice_no}</span>
                <span className="ml-auto font-display text-sm font-extrabold text-primary">{t.money(Number(a.fee))}</span>
              </div>
              {a.refund_status && a.refund_status !== "none" && (
                <p className="mt-1 text-[10px] font-semibold text-destructive">
                  {t("রিফান্ড:", "Refund:")} {t(REFUND_T[a.refund_status]?.bn ?? a.refund_status, REFUND_T[a.refund_status]?.en ?? a.refund_status)}
                  {Number(a.refund_amount) > 0 ? ` · ${t.money(Number(a.refund_amount))}` : ""}
                </p>
              )}
              {a.cancel_reason && <p className="mt-0.5 text-[10px] text-muted-foreground">{t("কারণ:", "Reason:")} {a.cancel_reason}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
