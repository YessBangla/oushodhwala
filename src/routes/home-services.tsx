import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock, HomeIcon, Phone } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCatalog } from "@/lib/catalog-db";
import { useT } from "@/lib/i18n";
import { useLang, pick } from "@/lib/lang";

const SLOTS = ["সকাল ৮টা–১১টা", "দুপুর ১১টা–২টা", "বিকেল ২টা–৫টা", "সন্ধ্যা ৫টা–৮টা", "রাত ৮টা–১১টা"];

const STATUS_LABEL: Record<string, string> = {
  requested: "অনুরোধ গৃহীত",
  confirmed: "নিশ্চিত হয়েছে",
  assigned: "সেবাদানকারী নিয়োগ",
  in_progress: "সেবা চলছে",
  completed: "সম্পন্ন",
  cancelled: "বাতিল",
};

export const Route = createFileRoute("/home-services")({
  validateSearch: (s: Record<string, unknown>) => ({ s: typeof s["s"] === "string" ? (s["s"] as string) : "" }),
  head: () => ({
    meta: [
      { title: "হোম হেলথ সার্ভিস — নার্স, ডাক্তার ও কেয়ারগিভার | ঔষধওয়ালা" },
      {
        name: "description",
        content:
          "বাসায় বসে নার্সিং, ডাক্তার ভিজিট, ফিজিওথেরাপি, টিকা, অক্সিজেন ও কেয়ারগিভার সেবা বুক করুন ঔষধওয়ালা থেকে।",
      },
      { property: "og:title", content: "হোম হেলথ সার্ভিস — ঔষধওয়ালা" },
      { property: "og:description", content: "প্রশিক্ষিত স্বাস্থ্যকর্মী আপনার বাসায়, ২৪/৭ সাপোর্ট।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomeServices,
});

function HomeServices() {
  const t = useT();
  const { lang } = useLang();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { s: preselect } = Route.useSearch();
  const { categories, settings } = useCatalog();

  const services = useMemo(() => categories.filter((c) => c.kind === "service" && c.serviceRoute !== "/home-diagnostics"), [categories]);
  const [slug, setSlug] = useState(preselect || "");
  const active = services.find((c) => c.slug === slug);

  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    patient_name: "",
    phone: "",
    address: "",
    area: "",
    date: today,
    slot: SLOTS[0]!,
    duration: "",
    note: "",
    payment: "cod",
  });

  const mine = useQuery({
    queryKey: ["my-service-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const book = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("book_home_service", {
        _service_slug: slug,
        _patient_name: f.patient_name,
        _phone: f.phone,
        _address: f.address,
        _area: f.area,
        _scheduled_date: f.date,
        _slot: f.slot,
        _duration: f.duration,
        _note: f.note,
        _payment_method: f.payment,
      });
      if (error) throw error;
      return data as { request_no: string };
    },
    onSuccess: (r) => {
      toast.success(t(`অনুরোধ #${r.request_no} গ্রহণ করা হয়েছে`, `Request #${r.request_no} received`));
      setF({ ...f, note: "" });
      void qc.invalidateQueries({ queryKey: ["my-service-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const valid = slug && f.patient_name.trim() && f.phone.trim() && f.address.trim();

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">{t("হোম হেলথ সার্ভিস", "Home health services")}</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {t(
          "প্রশিক্ষিত নার্স, ডাক্তার, ফিজিওথেরাপিস্ট ও কেয়ারগিভার আপনার বাসায়।",
          "Trained nurses, doctors, physiotherapists and caregivers at your home.",
        )}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-xs">
        <Phone className="h-4 w-4 text-primary" />
        <span className="font-semibold">{t("জরুরি হটলাইন", "Emergency hotline")}:</span>
        <a href={`tel:${settings.emergencyPhone}`} className="font-bold text-primary">
          {settings.emergencyPhone}
        </a>
        <Link to="/home-diagnostics" className="ml-auto rounded-lg border border-border px-3 py-1.5 font-semibold">
          {t("হোম স্যাম্পল কালেকশন", "Home sample collection")}
        </Link>
      </div>

      <h2 className="mt-4 text-sm font-bold">{t("সেবা নির্বাচন করুন", "Choose a service")}</h2>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((c) => (
          <button
            key={c.slug}
            onClick={() => setSlug(c.slug)}
            className={`flex gap-3 rounded-xl border p-3 text-left transition-colors ${
              slug === c.slug ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-lg">{c.emoji}</span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold">{pick(lang, c.bn, c.en)}</span>
              <span className="mt-0.5 block line-clamp-2 text-[10px] text-muted-foreground">{pick(lang, c.desc, c.descEn)}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" /> {pick(lang, c.eta, c.etaEn)}
                </span>
                {c.baseFee > 0 && (
                  <span className="font-bold text-primary-dark">{t(`শুরু ৳${t.n(c.baseFee)}`, `from ৳${t.n(c.baseFee)}`)}</span>
                )}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-3">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <HomeIcon className="h-4 w-4 text-primary" /> {t("বুকিং তথ্য", "Booking details")}
        </h2>
        {active && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {pick(lang, active.bn, active.en)}
            {active.baseFee > 0 && ` · ${t(`সার্ভিস ফি শুরু ৳${t.n(active.baseFee)}`, `service fee from ৳${t.n(active.baseFee)}`)}`}
          </p>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            value={f.patient_name}
            onChange={(e) => setF({ ...f, patient_name: e.target.value })}
            placeholder={t("রোগীর নাম", "Patient name")}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
          />
          <input
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
            placeholder={t("মোবাইল নম্বর", "Mobile number")}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
          />
          <input
            value={f.address}
            onChange={(e) => setF({ ...f, address: e.target.value })}
            placeholder={t("পূর্ণ ঠিকানা", "Full address")}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none sm:col-span-2"
          />
          <input
            value={f.area}
            onChange={(e) => setF({ ...f, area: e.target.value })}
            placeholder={t("এলাকা (যেমন: ধানমন্ডি)", "Area (e.g. Dhanmondi)")}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
          />
          <input
            value={f.duration}
            onChange={(e) => setF({ ...f, duration: e.target.value })}
            placeholder={t("সময়কাল (যেমন: ৩ দিন / মাসিক)", "Duration (e.g. 3 days / monthly)")}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
          />
          <input
            type="date"
            min={today}
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
          />
          <select
            value={f.slot}
            onChange={(e) => setF({ ...f, slot: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
          >
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <textarea
            value={f.note}
            onChange={(e) => setF({ ...f, note: e.target.value })}
            placeholder={t("রোগীর অবস্থা / বিশেষ নির্দেশনা", "Patient condition / special instructions")}
            className="min-h-16 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none sm:col-span-2"
          />
          <select
            value={f.payment}
            onChange={(e) => setF({ ...f, payment: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
          >
            <option value="cod">{t("সেবা শেষে ক্যাশ", "Cash after service")}</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="card">{t("কার্ড", "Card")}</option>
          </select>
        </div>

        {user ? (
          <button
            disabled={!valid || book.isPending}
            onClick={() => book.mutate()}
            className="mt-3 w-full rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            {book.isPending ? t("পাঠানো হচ্ছে...", "Sending...") : t("সেবা বুক করুন", "Book this service")}
          </button>
        ) : (
          <Link to="/auth" className="mt-3 block rounded-lg bg-primary px-4 py-2.5 text-center text-xs font-bold text-primary-foreground">
            {t("বুক করতে লগইন করুন", "Sign in to book")}
          </Link>
        )}
      </div>

      {user && (
        <div className="mt-4 rounded-xl border border-border bg-card p-3">
          <h2 className="text-sm font-bold">{t("আমার সার্ভিস অনুরোধ", "My service requests")}</h2>
          <div className="mt-2 space-y-2">
            {(mine.data ?? []).map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">#{r.request_no}</span>
                  <span>{r.service_name}</span>
                  <span className="text-muted-foreground">
                    {r.scheduled_date} · {r.slot}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 font-bold text-primary-dark">
                    <CheckCircle2 className="h-2.5 w-2.5" /> {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                {r.assignee_name && (
                  <p className="mt-1 text-muted-foreground">
                    {t("সেবাদানকারী", "Assigned")}: {r.assignee_name} · {r.assignee_phone}
                  </p>
                )}
              </div>
            ))}
            {(mine.data ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">{t("এখনো কোনো অনুরোধ নেই।", "No requests yet.")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
