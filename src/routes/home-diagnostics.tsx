import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HomeIcon, CheckCircle2, TestTube2, CalendarDays, MapPin } from "lucide-react";

import { useCatalog } from "@/lib/catalog-db";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { AddressPicker, emptyAddress, type PickedAddress } from "@/components/AddressPicker";
import { matchesQuery } from "@/lib/bn-search";
import { resolveDownloadUrl, resolveFileUrl } from "@/lib/storage";
import { opsStart, opsSuccess, opsFailure } from "@/lib/ops";


export const Route = createFileRoute("/home-diagnostics")({
  head: () => ({
    meta: [
      { title: "বাসায় গিয়ে ডায়াগনস্টিক | Home Sample Collection — ঔষধওয়ালা" },
      {
        name: "description",
        content: "ঘরে বসেই রক্ত ও অন্যান্য স্যাম্পল দিন। দক্ষ কালেক্টর আপনার বাসায় যাবে, ২৪ ঘণ্টায় ডিজিটাল রিপোর্ট।",
      },
      { property: "og:title", content: "বাসায় গিয়ে ডায়াগনস্টিক — ঔষধওয়ালা" },
      { property: "og:description", content: "হোম স্যাম্পল কালেকশন বুক করুন, ডিজিটাল রিপোর্ট পান।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: HomeDiagnostics,
});

const COLLECTION_FEE = 150;

const SLOTS = [
  { id: "07-09", bn: "সকাল ৭টা – ৯টা", en: "7 AM – 9 AM" },
  { id: "09-12", bn: "সকাল ৯টা – দুপুর ১২টা", en: "9 AM – 12 PM" },
  { id: "12-16", bn: "দুপুর ১২টা – বিকাল ৪টা", en: "12 PM – 4 PM" },
  { id: "16-20", bn: "বিকাল ৪টা – রাত ৮টা", en: "4 PM – 8 PM" },
];

const STATUS: Record<string, { bn: string; en: string }> = {
  requested: { bn: "অনুরোধ গৃহীত", en: "Requested" },
  confirmed: { bn: "নিশ্চিত", en: "Confirmed" },
  on_the_way: { bn: "কালেক্টর পথে", en: "Collector on the way" },
  collected: { bn: "স্যাম্পল সংগৃহীত", en: "Sample collected" },
  processing: { bn: "ল্যাবে পরীক্ষা চলছে", en: "In lab" },
  report_ready: { bn: "রিপোর্ট প্রস্তুত", en: "Report ready" },
  cancelled: { bn: "বাতিল", en: "Cancelled" },
};

function nextDays(n: number) {
  const out: { iso: string; day: number; month: string }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      day: d.getDate(),
      month: d.toLocaleString("en-US", { month: "short" }),
    });
  }
  return out;
}

function HomeDiagnostics() {
  const t = useT();
  const { user, profile } = useAuth();
  const { labTests } = useCatalog();

  const days = useMemo(() => nextDays(10), []);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [date, setDate] = useState(days[0]!.iso);
  const [slot, setSlot] = useState(SLOTS[0]!.id);
  const [form, setForm] = useState({ name: "", phone: "", area: "", address: "", note: "" });
  const [addr, setAddr] = useState<PickedAddress>(emptyAddress);
  const [pay, setPay] = useState("cod");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ no: string; total: number } | null>(null);

  const list = labTests.filter((x) => matchesQuery(q, x.bn, x.en));
  const chosen = labTests.filter((x) => picked.includes(x.id));
  const subtotal = chosen.reduce((s, x) => s + x.price, 0);
  const total = subtotal + (chosen.length ? COLLECTION_FEE : 0);

  const { data: mine = [], refetch } = useQuery({
    queryKey: ["my-diagnostics"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagnostic_bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  /** প্রাইভেট স্টোরেজ থেকে রিপোর্ট খোলা/ডাউনলোড */
  const openReport = async (ref: string, download: boolean, fileName?: string) => {
    const url = download ? await resolveDownloadUrl("reports", ref, fileName) : await resolveFileUrl("reports", ref);
    if (!url) {
      setErr(t("রিপোর্ট এখন পাওয়া যাচ্ছে না।", "Report is not available right now."));
      return;
    }
    window.open(url, "_blank", "noopener");
  };


  const submit = async () => {
    setErr("");
    if (!chosen.length) return setErr(t("অন্তত একটি টেস্ট নির্বাচন করুন।", "Select at least one test."));
    const name = form.name || profile?.name || "";
    const phone = form.phone || profile?.phone || "";
    if (!name.trim() || !phone.trim() || !form.address.trim()) {
      return setErr(t("নাম, ফোন ও ঠিকানা দিন।", "Name, phone and address are required."));
    }
    setBusy(true);
    opsStart("diagnostic_booking", { tests: chosen.length });
    const { data, error } = await supabase.rpc("book_home_diagnostic", {
      _tests: chosen.map((x) => ({ id: x.id, bn: x.bn, en: x.en, price: x.price })),
      _patient_name: name,
      _phone: phone,
      _address: form.address,
      _area: form.area,
      _scheduled_date: date,
      _slot: slot,
      _collection_fee: COLLECTION_FEE,
      _discount: 0,
      _payment_method: pay,
      _note: form.note,
    });
    setBusy(false);
    if (error) {
      opsFailure("diagnostic_booking", error, { tests: chosen.length });
      setErr(error.message);
      return;
    }
    const row = data as unknown as { booking_no: string; total: number };
    opsSuccess("diagnostic_booking", row.booking_no, { total: Number(row.total) });
    setDone({ no: row.booking_no, total: Number(row.total) });
    setPicked([]);
    void refetch();
  };

  if (!user) {
    return (
      <div className="pt-16 text-center">
        <p className="text-4xl">🏠</p>
        <h1 className="mt-3 font-display text-lg font-extrabold">
          {t("বাসায় গিয়ে ডায়াগনস্টিক", "Home diagnostics")}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("বুকিং দিতে লগইন করুন।", "Please log in to book a home sample collection.")}
        </p>
        <Link to="/auth" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          {t("লগইন করুন", "Log in")}
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-secondary to-card p-4">
        <p className="flex items-center gap-2 font-display text-lg font-extrabold text-navy">
          <HomeIcon className="h-5 w-5 text-primary" /> {t("বাসায় গিয়ে ডায়াগনস্টিক", "Home diagnostics")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t(
            "প্রশিক্ষিত কালেক্টর আপনার বাসায় গিয়ে স্যাম্পল সংগ্রহ করবেন · ২৪ ঘণ্টায় ডিজিটাল রিপোর্ট",
            "A trained phlebotomist collects the sample at your home · digital report within 24 hours",
          )}
        </p>
        <p className="mt-2 text-[11px] font-semibold text-primary-dark">
          {t("হোম কালেকশন ফি", "Home collection fee")}: {t.money(COLLECTION_FEE)}
        </p>
      </div>

      {done && (
        <div className="mt-4 rounded-2xl border border-primary bg-secondary p-4 text-center">
          <CheckCircle2 className="mx-auto h-7 w-7 text-primary" />
          <p className="mt-2 text-sm font-bold text-navy">{t("বুকিং নিশ্চিত হয়েছে", "Booking confirmed")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            #{done.no} · {t.money(done.total)}
          </p>
        </div>
      )}

      {/* টেস্ট নির্বাচন */}
      <h2 className="mt-6 flex items-center gap-2 text-sm font-bold text-navy">
        <TestTube2 className="h-4 w-4 text-primary" /> {t("টেস্ট নির্বাচন করুন", "Select tests")}
      </h2>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("টেস্টের নাম লিখুন (বাংলা/English)...", "Search test name...")}
        className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((x) => {
          const on = picked.includes(x.id);
          return (
            <button
              key={x.id}
              onClick={() => toggle(x.id)}
              className={`rounded-xl border p-3 text-left transition ${on ? "border-primary bg-secondary" : "border-border bg-card"}`}
            >
              <p className="text-xs font-bold text-navy">{t(x.bn, x.en)}</p>
              <p className="text-[10px] text-muted-foreground">{x.prep}</p>
              <p className="mt-1 text-sm font-extrabold text-primary">{t.money(x.price)}</p>
            </button>
          );
        })}
      </div>
      {list.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">{t("কোনো টেস্ট পাওয়া যায়নি।", "No test found.")}</p>
      )}

      {/* সময়সূচি */}
      <h2 className="mt-6 flex items-center gap-2 text-sm font-bold text-navy">
        <CalendarDays className="h-4 w-4 text-primary" /> {t("তারিখ ও সময়", "Date & time")}
      </h2>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => (
          <button
            key={d.iso}
            onClick={() => setDate(d.iso)}
            className={`shrink-0 rounded-xl border px-3 py-2 text-center ${date === d.iso ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            <span className="block text-sm font-extrabold">{t.n(d.day)}</span>
            <span className="block text-[10px]">{d.month}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SLOTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSlot(s.id)}
            className={`rounded-xl border px-3 py-2 text-[11px] font-semibold ${slot === s.id ? "border-primary bg-secondary text-primary-dark" : "border-border bg-card"}`}
          >
            {t(s.bn, s.en)}
          </button>
        ))}
      </div>

      {/* ঠিকানা */}
      <h2 className="mt-6 flex items-center gap-2 text-sm font-bold text-navy">
        <MapPin className="h-4 w-4 text-primary" /> {t("রোগীর তথ্য ও ঠিকানা", "Patient & address")}
      </h2>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={t("রোগীর নাম", "Patient name")}
          className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder={t("মোবাইল নম্বর", "Mobile number")}
          className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <AddressPicker
          value={addr}
          onChange={(v) => {
            setAddr(v);
            setForm((prev) => ({
              ...prev,
              address: [v.details, v.area, v.thana, v.cityZone, v.district].filter(Boolean).join(", "),
              area: v.area || v.thana,
            }));
          }}
        />
        <textarea
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          placeholder={t("বিশেষ নির্দেশনা (ঐচ্ছিক)", "Special instructions (optional)")}
          className="sm:col-span-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
          rows={2}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { id: "cod", bn: "ক্যাশ অন কালেকশন", en: "Cash on collection" },
          { id: "bkash", bn: "বিকাশ", en: "bKash" },
          { id: "nagad", bn: "নগদ", en: "Nagad" },
          { id: "card", bn: "কার্ড", en: "Card" },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPay(p.id)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${pay === p.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {t(p.bn, p.en)}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {t("নির্বাচিত টেস্ট", "Selected tests")} ({t.n(chosen.length)})
          </span>
          <span className="font-semibold">{t.money(subtotal)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("হোম কালেকশন ফি", "Home collection fee")}</span>
          <span className="font-semibold">{t.money(chosen.length ? COLLECTION_FEE : 0)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <span className="text-sm font-bold">{t("সর্বমোট", "Total")}</span>
          <span className="font-display text-lg font-extrabold text-primary">{t.money(total)}</span>
        </div>
        {err && <p className="mt-2 text-[11px] font-semibold text-destructive">{err}</p>}
        <button
          onClick={() => void submit()}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? t("প্রসেস হচ্ছে...", "Processing...") : t("হোম কালেকশন বুক করুন", "Book home collection")}
        </button>
      </div>

      {/* আমার বুকিং */}
      {mine.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-bold text-navy">{t("আমার বুকিং", "My bookings")}</h2>
          <ul className="mt-2 space-y-2">
            {mine.map((b) => (
              <li key={b.id} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-navy">#{b.booking_no}</p>
                  <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary-dark">
                    {t(STATUS[b.status]?.bn ?? b.status, STATUS[b.status]?.en ?? b.status)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {b.scheduled_date} · {b.slot} · {b.address}
                </p>
                <p className="mt-1 text-[11px] font-semibold">
                  {t.money(Number(b.total))}
                  {b.collector_name ? ` · ${t("কালেক্টর", "Collector")}: ${b.collector_name}` : ""}
                </p>
                {b.report_url && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => void openReport(b.report_url, false)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
                    >
                      {t("রিপোর্ট দেখুন", "View report")}
                    </button>
                    <button
                      onClick={() => void openReport(b.report_url, true, `${b.booking_no}-report`)}
                      className="rounded-lg bg-muted px-3 py-1.5 text-[11px] font-semibold"
                    >
                      {t("ডাউনলোড", "Download")}
                    </button>
                  </div>
                )}

              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
