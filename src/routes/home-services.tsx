import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, CalendarDays, CheckCircle2, ChevronRight, Clock, HomeIcon, Phone } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCatalog } from "@/lib/catalog-db";
import { useT } from "@/lib/i18n";
import { useLang, pick } from "@/lib/lang";

const SLOTS = [
  { v: "সকাল ৮টা–১১টা", en: "8 AM – 11 AM", startHour: 8 },
  { v: "দুপুর ১১টা–২টা", en: "11 AM – 2 PM", startHour: 11 },
  { v: "বিকেল ২টা–৫টা", en: "2 PM – 5 PM", startHour: 14 },
  { v: "সন্ধ্যা ৫টা–৮টা", en: "5 PM – 8 PM", startHour: 17 },
  { v: "রাত ৮টা–১১টা", en: "8 PM – 11 PM", startHour: 20 },
];

const FLOW = ["requested", "confirmed", "assigned", "in_progress", "completed"] as const;

const STATUS_LABEL: Record<string, [string, string]> = {
  requested: ["অনুরোধ গৃহীত", "Requested"],
  confirmed: ["নিশ্চিত হয়েছে", "Confirmed"],
  assigned: ["সেবাদানকারী নিয়োগ", "Assigned"],
  in_progress: ["সেবা চলছে", "In progress"],
  completed: ["সম্পন্ন", "Completed"],
  cancelled: ["বাতিল", "Cancelled"],
};

const DAY_BN = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];
const DAY_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_BN = ["জানু", "ফেব", "মার্চ", "এপ্রি", "মে", "জুন", "জুলা", "আগ", "সেপ", "অক্টো", "নভে", "ডিসে"];
const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
      { property: "og:url", content: "https://oushodhwala.lovable.app/home-services" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://oushodhwala.lovable.app/home-services" }],
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

  const services = useMemo(
    () => categories.filter((c) => c.kind === "service" && c.serviceRoute !== "/home-diagnostics"),
    [categories],
  );
  const [slug, setSlug] = useState(preselect || "");
  const active = services.find((c) => c.slug === slug);

  const days = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, []);
  const today = ymd(days[0]!);

  const [f, setF] = useState({
    patient_name: "",
    phone: "",
    address: "",
    area: "",
    date: today,
    slot: SLOTS[0]!.v,
    duration: "",
    note: "",
    payment: "cod",
  });

  const now = new Date();
  const slotDisabled = (startHour: number) => f.date === today && now.getHours() >= startHour;

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

  const notes = useQuery({
    queryKey: ["my-service-notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("kind", "service")
        .order("created_at", { ascending: false })
        .limit(60);
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
      void qc.invalidateQueries({ queryKey: ["my-service-notifications"] });
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

      {/* ---- ক্যালেন্ডার + টাইমস্লট ---- */}
      <div className="mt-4 rounded-xl border border-border bg-card p-3">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <CalendarDays className="h-4 w-4 text-primary" /> {t("তারিখ ও সময় নির্বাচন", "Pick date & time")}
        </h2>
        <div className="mt-2 -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d) => {
            const key = ymd(d);
            const on = f.date === key;
            return (
              <button
                key={key}
                onClick={() => setF({ ...f, date: key })}
                className={`min-w-[62px] shrink-0 snap-start rounded-xl border px-2 py-2 text-center transition-colors ${
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/40"
                }`}
              >
                <span className="block text-[10px] font-semibold opacity-80">
                  {lang === "en" ? DAY_EN[d.getDay()] : DAY_BN[d.getDay()]}
                </span>
                <span className="block text-sm font-extrabold">{t.n(d.getDate())}</span>
                <span className="block text-[9px] opacity-80">
                  {lang === "en" ? MON_EN[d.getMonth()] : MON_BN[d.getMonth()]}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-[11px] font-bold text-muted-foreground">{t("সময় স্লট", "Time slot")}</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {SLOTS.map((s) => {
            const off = slotDisabled(s.startHour);
            const on = f.slot === s.v;
            return (
              <button
                key={s.v}
                disabled={off}
                onClick={() => setF({ ...f, slot: s.v })}
                className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  on ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/40"
                } ${off ? "cursor-not-allowed opacity-40" : ""}`}
              >
                {lang === "en" ? s.en : s.v}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          {t("আজকের জন্য পার হয়ে যাওয়া স্লট নির্বাচন করা যাবে না।", "Slots that already started today cannot be selected.")}
        </p>
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
          <div className="sm:col-span-2">
            <AddressPicker
              value={picked}
              onChange={(v) => {
                setPicked(v);
                setF((prev) => ({
                  ...prev,
                  address: [v.details, v.area, v.thana, v.cityZone, v.district].filter(Boolean).join(", "),
                  area: v.area || v.thana,
                }));
              }}
            />
          </div>
          <input
            value={f.duration}
            onChange={(e) => setF({ ...f, duration: e.target.value })}
            placeholder={t("সময়কাল (যেমন: ৩ দিন / মাসিক)", "Duration (e.g. 3 days / monthly)")}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
          />
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

        <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-[11px] font-semibold text-primary-dark">
          {t("নির্বাচিত সময়", "Selected time")}: {f.date} · {lang === "en" ? (SLOTS.find((s) => s.v === f.slot)?.en ?? f.slot) : f.slot}
        </p>

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
          <h2 className="text-sm font-bold">{t("আমার সার্ভিস অনুরোধ ট্র্যাকিং", "My service request tracking")}</h2>
          <div className="mt-2 space-y-3">
            {(mine.data ?? []).map((r) => (
              <RequestCard key={r.id} r={r} notifications={(notes.data ?? []).filter((n) => n.order_no === r.request_no)} />
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

type ReqRow = {
  id: string;
  request_no: string;
  service_name: string;
  scheduled_date: string;
  slot: string;
  status: string;
  assignee_name: string;
  assignee_phone: string;
  admin_note: string;
  fee: number;
  payment_status: string;
};
type NoteRow = { id: string; title: string; body: string; created_at: string; order_no: string };

function RequestCard({ r, notifications }: { r: ReqRow; notifications: NoteRow[] }) {
  const t = useT();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const cancelled = r.status === "cancelled";
  const idx = FLOW.indexOf(r.status as (typeof FLOW)[number]);
  const label = (s: string) => {
    const p = STATUS_LABEL[s];
    return p ? pick(lang, p[0], p[1]) : s;
  };

  return (
    <div className="rounded-lg border border-border p-2.5 text-[11px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold">#{r.request_no}</span>
        <span>{r.service_name}</span>
        <span className="text-muted-foreground">
          {r.scheduled_date} · {r.slot}
        </span>
        <span
          className={`ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-bold ${
            cancelled ? "bg-destructive/10 text-destructive" : "bg-secondary text-primary-dark"
          }`}
        >
          <CheckCircle2 className="h-2.5 w-2.5" /> {label(r.status)}
        </span>
      </div>

      {!cancelled && (
        <div className="mt-2 flex items-center gap-1">
          {FLOW.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-1">
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[8px] font-bold ${
                  i <= idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              {i < FLOW.length - 1 && <span className={`h-0.5 flex-1 rounded ${i < idx ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>
      )}
      {!cancelled && (
        <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
          {FLOW.map((s) => (
            <span key={s} className="flex-1 truncate text-center">
              {label(s)}
            </span>
          ))}
        </div>
      )}

      {r.assignee_name && (
        <p className="mt-1.5 text-muted-foreground">
          {t("সেবাদানকারী", "Assigned")}: {r.assignee_name} · {r.assignee_phone}
        </p>
      )}
      {r.admin_note && <p className="mt-1 text-muted-foreground">{r.admin_note}</p>}

      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
      >
        <Bell className="h-3 w-3" />
        {t("নোটিফিকেশন হিস্ট্রি", "Notification history")} ({t.n(notifications.length)})
        <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <ul className="mt-2 space-y-1.5 border-l border-border pl-3">
          {notifications.map((n) => (
            <li key={n.id}>
              <p className="font-semibold">{n.title}</p>
              <p className="text-muted-foreground">{n.body}</p>
              <p className="text-[9px] text-muted-foreground">{new Date(n.created_at).toLocaleString(lang === "en" ? "en-GB" : "bn-BD")}</p>
            </li>
          ))}
          {notifications.length === 0 && (
            <li className="text-muted-foreground">{t("কোনো আপডেট নেই।", "No updates yet.")}</li>
          )}
        </ul>
      )}
    </div>
  );
}
