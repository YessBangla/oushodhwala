import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";

import { bn } from "@/data/catalog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MODE_LABEL, REFUND_LABEL, STATUS_LABEL, fmtDateTime, type CallMode } from "@/lib/appointments";

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

function Appointments() {
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
        <p className="text-muted-foreground">অ্যাপয়েন্টমেন্ট দেখতে লগইন করুন।</p>
        <Link to="/auth" className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">লগইন</Link>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <h1 className="font-display text-lg font-extrabold">আমার অ্যাপয়েন্টমেন্ট</h1>
      <p className="text-xs text-muted-foreground">কল, চ্যাট, রেকর্ডিং ও ইনভয়েস দেখতে যেকোনো অ্যাপয়েন্টমেন্টে ক্লিক করুন।</p>

      {isLoading && <p className="mt-6 text-center text-xs text-muted-foreground">লোড হচ্ছে...</p>}

      {!isLoading && list.length === 0 && (
        <div className="mt-10 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">এখনো কোনো অ্যাপয়েন্টমেন্ট নেই।</p>
          <Link to="/doctor-consultation" className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            ডাক্তার দেখুন
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
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{a.doctor_spec}</p>
              <p className="mt-1 text-[11px] font-semibold">
                🗓️ {fmtDateTime(a.scheduled_at)} · {MODE_LABEL[(a.mode as CallMode) ?? "video"].bn}
              </p>
              <div className="mt-2 flex items-center text-[11px]">
                <span className="text-muted-foreground">ইনভয়েস #{a.invoice_no}</span>
                <span className="ml-auto font-display text-sm font-extrabold text-primary">৳{bn(Number(a.fee))}</span>
              </div>
              {a.refund_status && a.refund_status !== "none" && (
                <p className="mt-1 text-[10px] font-semibold text-destructive">
                  রিফান্ড: {REFUND_LABEL[a.refund_status] ?? a.refund_status}
                  {Number(a.refund_amount) > 0 ? ` · ৳${bn(Number(a.refund_amount))}` : ""}
                </p>
              )}
              {a.cancel_reason && <p className="mt-0.5 text-[10px] text-muted-foreground">কারণ: {a.cancel_reason}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
