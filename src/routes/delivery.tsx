import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bike, MapPin, RefreshCw, Phone, Camera, CheckCircle2, Navigation, Search, Share2, Wifi } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { DELIVERY_STATUS, fmtTime } from "@/lib/delivery";
import { SignaturePad } from "@/components/SignaturePad";
import { uploadFile, safeName } from "@/lib/storage";
import { copyTrackLink, whatsappTrackLink } from "@/lib/track-link";


export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [
      { title: "ডেলিভারি প্যানেল | Delivery Panel — ঔষধওয়ালা" },
      { name: "description", content: "ডেলিভারিম্যানদের জন্য প্যানেল — অ্যাসাইন করা অর্ডার দেখুন, অবস্থা ও অবস্থান আপডেট করুন।" },
      { property: "og:title", content: "ডেলিভারি প্যানেল — ঔষধওয়ালা" },
      { property: "og:description", content: "রাইডার ডেলিভারি ব্যবস্থাপনা।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: DeliveryPanel,
});

type Row = {
  id: string;
  order_no: string;
  status: string;
  otp: string;
  eta_minutes: number;
  note: string;
  created_at: string;
  public_token: string;
  orders: {
    customer_name: string;
    phone: string;
    address: string;
    area: string;
    thana: string;
    total: number;
    payment_method: string;
    payment_status: string;
  } | null;
};

const NEXT: Record<string, string[]> = {
  assigned: ["picked", "failed"],
  picked: ["on_the_way", "failed"],
  on_the_way: ["arrived", "failed"],
  arrived: ["delivered", "failed"],
};

function DeliveryPanel() {
  const t = useT();
  const { user, loading } = useAuth();
  const [otp, setOtp] = useState<Record<string, string>>({});
  const [pod, setPod] = useState<Record<string, { photo?: File | null; sign?: Blob | null; receiver?: string }>>({});
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [sharing, setSharing] = useState(false);
  const [lastPing, setLastPing] = useState<string>("");
  const [perm, setPerm] = useState<"unknown" | "granted" | "denied" | "prompt" | "unsupported">("unknown");
  const [live, setLive] = useState(false);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fArea, setFArea] = useState("all");
  const [fPriority, setFPriority] = useState<"all" | "urgent" | "cod">("all");
  const [copied, setCopied] = useState("");

  // লোকেশন পারমিশনের অবস্থা
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPerm("unsupported");
      return;
    }
    if (!navigator.permissions?.query) {
      setPerm("prompt");
      return;
    }
    let status: PermissionStatus | null = null;
    const onChange = () => setPerm((status?.state as "granted" | "denied" | "prompt") ?? "prompt");
    void navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((s) => {
        status = s;
        onChange();
        s.addEventListener("change", onChange);
      })
      .catch(() => setPerm("prompt"));
    return () => status?.removeEventListener("change", onChange);
  }, []);


  const { data: rider, isLoading: riderLoading } = useQuery({
    queryKey: ["my-rider", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("riders").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: rows = [], refetch, dataUpdatedAt } = useQuery({
    queryKey: ["rider-deliveries", rider?.id],
    enabled: !!rider,
    // পোলিং — WebSocket বন্ধ থাকলেও প্রতি ১৫ সেকেন্ডে স্ট্যাটাস/ETA আপডেট হবে
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select(
          "id, order_no, status, otp, eta_minutes, note, created_at, public_token, orders(customer_name, phone, address, area, thana, total, payment_method, payment_status)",
        )
        .eq("rider_id", rider!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  useEffect(() => {
    if (!rider) return;
    const ch = supabase
      .channel("rider-deliveries")
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, () => void refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_events" }, () => void refetch())
      .subscribe((s) => setLive(s === "SUBSCRIBED"));
    return () => {
      setLive(false);
      void supabase.removeChannel(ch);
    };
  }, [rider, refetch]);

  // লাইভ লোকেশন স্ট্রিমিং — চলমান ডেলিভারির জন্য রাইডারের অবস্থান পাঠানো হয়
  const activeIds = rows
    .filter((r) => !["delivered", "failed"].includes(r.status))
    .map((r) => r.id)
    .join(",");

  useEffect(() => {
    if (!sharing || !activeIds) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErr("GPS unavailable");
      setSharing(false);
      return;
    }
    const ids = activeIds.split(",");
    let last = 0;
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - last < 15000) return; // ১৫ সেকেন্ডে একবার
        last = now;
        setLastPing(new Date().toISOString());
        ids.forEach((id) => {
          void supabase.rpc("rider_ping_location", {
            _delivery_id: id,
            _lat: pos.coords.latitude,
            _lng: pos.coords.longitude,
          });
        });
      },
      (e) => {
        setSharing(false);
        if (e.code === e.PERMISSION_DENIED) setPerm("denied");
        else setErr(t("অবস্থান পাওয়া যায়নি। জিপিএস চালু আছে কিনা দেখুন।", "Could not get your location. Check that GPS is on."));
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [sharing, activeIds]);

  const update = async (row: Row, status: string) => {
    setErr("");
    setBusy(row.id + status);
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 }),
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      /* অবস্থান ছাড়াই আপডেট */
    }

    // ডেলিভারির প্রমাণ (ঐচ্ছিক): ছবি ও স্বাক্ষর আপলোড
    let photoPath = "";
    let signPath = "";
    const proof = pod[row.id];
    if (status === "delivered" && proof) {
      try {
        if (proof.photo) {
          photoPath = await uploadFile(
            "pod",
            `${row.order_no}/photo-${Date.now()}-${safeName(proof.photo.name)}`,
            proof.photo,
            proof.photo.type,
          );
        }
        if (proof.sign) {
          signPath = await uploadFile("pod", `${row.order_no}/signature-${Date.now()}.png`, proof.sign, "image/png");
        }
      } catch (e) {
        setBusy("");
        setErr(
          t("প্রমাণ আপলোড করা যায়নি: ", "Could not upload proof: ") + ((e as Error).message ?? ""),
        );
        return;
      }
    }

    const { error } = await supabase.rpc("rider_update_delivery", {
      _delivery_id: row.id,
      _status: status,
      _note: "",
      _otp: otp[row.id] ?? "",
      _pod_photo_url: photoPath,
      _pod_signature_url: signPath,
      _pod_receiver_name: proof?.receiver ?? "",
      ...(lat !== null && lng !== null ? { _lat: lat, _lng: lng } : {}),
    });
    setBusy("");
    if (error) {
      setErr(
        error.message.includes("BAD_OTP")
          ? t("ওটিপি সঠিক নয়। গ্রাহকের কাছ থেকে ৪ ডিজিটের ওটিপি নিন।", "Wrong OTP. Ask the customer for the 4-digit OTP.")
          : error.message,
      );
      return;
    }
    setPod((p) => ({ ...p, [row.id]: {} }));
    void refetch();
  };


  if (loading || (user && riderLoading)) {
    return <p className="pt-16 text-center text-sm text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>;
  }

  if (!user) {
    return (
      <div className="pt-16 text-center">
        <Bike className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-3 font-display text-lg font-extrabold">{t("ডেলিভারি প্যানেল", "Delivery panel")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("ডেলিভারিম্যান হিসেবে লগইন করুন।", "Log in with your rider account.")}</p>
        <Link to="/auth" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          {t("লগইন", "Log in")}
        </Link>
      </div>
    );
  }

  if (!rider) {
    return (
      <div className="pt-16 text-center">
        <Bike className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-bold">{t("আপনি ডেলিভারিম্যান হিসেবে নিবন্ধিত নন", "You are not registered as a rider")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("অ্যাডমিন আপনাকে যুক্ত করলে এই প্যানেল সক্রিয় হবে।", "This panel activates once an admin adds you.")}
        </p>
      </div>
    );
  }

  const areaOf = (r: Row) => (r.orders?.area || r.orders?.thana || (r.orders?.address ?? "").split(",")[0] || "").trim();
  const areas = Array.from(new Set(rows.map(areaOf).filter(Boolean))).sort();

  // অগ্রাধিকার — পৌঁছে গেছে/পথে আছে অথবা ETA ≤ ২০ মিনিট হলে জরুরি
  const isUrgent = (r: Row) => ["arrived", "on_the_way"].includes(r.status) || Number(r.eta_minutes) <= 20;
  const isCod = (r: Row) => r.orders?.payment_method === "cod" && r.orders?.payment_status !== "paid";

  const term = q.trim().toLowerCase();
  const match = (r: Row) => {
    if (term) {
      const hay = [r.order_no, r.orders?.customer_name, r.orders?.phone, r.orders?.address, areaOf(r)]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(term)) return false;
    }
    if (fStatus !== "all" && r.status !== fStatus) return false;
    if (fArea !== "all" && areaOf(r) !== fArea) return false;
    if (fPriority === "urgent" && !isUrgent(r)) return false;
    if (fPriority === "cod" && !isCod(r)) return false;
    return true;
  };

  const allActive = rows.filter((r) => !["delivered", "failed"].includes(r.status));
  const active = allActive.filter(match);
  const allPast = rows.filter((r) => ["delivered", "failed"].includes(r.status));
  const past = allPast.filter(match);
  const filtering = term !== "" || fStatus !== "all" || fArea !== "all" || fPriority !== "all";

  // আজকের পরিসংখ্যান — সবসময় পূর্ণ তালিকার ভিত্তিতে
  const today = new Date().toDateString();
  const isToday = (iso: string) => new Date(iso).toDateString() === today;
  const doneToday = allPast.filter((r) => r.status === "delivered" && isToday(r.created_at)).length;
  const failedToday = allPast.filter((r) => r.status === "failed" && isToday(r.created_at)).length;
  const codDue = allActive
    .filter((r) => r.orders?.payment_method === "cod" && r.orders?.payment_status !== "paid")
    .reduce((s, r) => s + Number(r.orders?.total ?? 0), 0);
  const collectedToday = allPast
    .filter((r) => r.status === "delivered" && isToday(r.created_at) && r.orders?.payment_method === "cod")
    .reduce((s, r) => s + Number(r.orders?.total ?? 0), 0);

  // অগ্রাধিকার অনুসারে সাজানো — যত এগিয়ে, তত উপরে
  const rank: Record<string, number> = { arrived: 0, on_the_way: 1, picked: 2, assigned: 3 };
  const activeSorted = [...active].sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9));

  const stats: { label: string; value: string; tone: string }[] = [
    { label: t("চলমান", "Active"), value: t.n(allActive.length), tone: "text-primary" },
    { label: t("আজ সম্পন্ন", "Done today"), value: t.n(doneToday), tone: "text-primary-dark" },
    { label: t("সংগ্রহ বাকি (COD)", "COD to collect"), value: t.money(codDue), tone: "text-navy" },
    { label: t("আজ সংগৃহীত", "Collected today"), value: t.money(collectedToday), tone: "text-navy" },
  ];

  return (
    <div className="pt-4">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-lg">🛵</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-navy">{rider.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {rider.phone} · {rider.zone || t("সব এলাকা", "All zones")} · {rider.vehicle || t("যানবাহন", "Vehicle")}
          </p>
        </div>
        <span
          className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            sharing ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {sharing ? t("অনলাইন", "Online") : t("অফলাইন", "Offline")}
        </span>
        <button onClick={() => void refetch()} className="shrink-0 rounded-lg bg-muted p-2" aria-label={t("রিফ্রেশ", "Refresh")}>
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* লাইভ সিঙ্ক অবস্থা */}
      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
        <Wifi className={`h-3.5 w-3.5 ${live ? "text-primary" : "text-muted-foreground"}`} />
        {live
          ? t("লাইভ সিঙ্ক চালু (রিয়েল-টাইম)", "Live sync on (real-time)")
          : t("লাইভ সিঙ্ক: প্রতি ১৫ সেকেন্ডে রিফ্রেশ", "Live sync: refreshing every 15s")}
        {dataUpdatedAt > 0 && (
          <span>
            · {t("সর্বশেষ আপডেট", "Last update")}: {fmtTime(new Date(dataUpdatedAt).toISOString(), t.en)}
          </span>
        )}
      </p>


      {/* আজকের সারাংশ */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-3">
            <p className="text-[10px] font-semibold text-muted-foreground">{s.label}</p>
            <p className={`mt-0.5 font-display text-base font-extrabold ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>
      {failedToday > 0 && (
        <p className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-[11px] font-semibold text-destructive">
          {t(`আজ ${t.n(failedToday)}টি ডেলিভারি ব্যর্থ হয়েছে — পুনরায় শিডিউল করুন।`, `${failedToday} delivery(s) failed today — please reschedule.`)}
        </p>
      )}


      <div className="mt-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSharing((v) => !v)}
            disabled={perm === "denied" || perm === "unsupported"}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold disabled:opacity-50 ${
              sharing ? "bg-primary text-primary-foreground" : "bg-muted text-navy"
            }`}
          >
            <Navigation className={`h-3.5 w-3.5 ${sharing ? "animate-pulse" : ""}`} />
            {sharing ? t("লাইভ লোকেশন চালু", "Live location on") : t("লাইভ লোকেশন চালু করুন", "Start live location")}
          </button>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              perm === "granted"
                ? "bg-secondary text-primary-dark"
                : perm === "denied" || perm === "unsupported"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {perm === "granted"
              ? t("লোকেশন অনুমতি: দেওয়া আছে", "Location: allowed")
              : perm === "denied"
                ? t("লোকেশন অনুমতি: ব্লক করা", "Location: blocked")
                : perm === "unsupported"
                  ? t("এই ডিভাইসে জিপিএস নেই", "GPS not supported")
                  : t("লোকেশন অনুমতি: চাওয়া হবে", "Location: will ask")}
          </span>
          <p className="text-[10px] text-muted-foreground">
            {sharing
              ? t("গ্রাহক আপনার অবস্থান ম্যাপে দেখতে পাচ্ছেন।", "Customers can see your position on the map.")
              : t("চালু করলে গ্রাহক রিয়েল-টাইমে আপনাকে ট্র্যাক করতে পারবেন।", "Turn on so customers can track you in real time.")}
          </p>
          {lastPing && (
            <span className="ml-auto text-[10px] font-semibold text-primary">
              {t("সর্বশেষ পাঠানো", "Last sent")}: {fmtTime(lastPing, t.en)}
            </span>
          )}
        </div>

        {(perm === "denied" || perm === "unsupported") && (
          <div className="mt-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-[10px] leading-relaxed text-muted-foreground">
            <p className="text-[11px] font-bold text-destructive">
              {t("লোকেশন অ্যাক্সেস বন্ধ আছে — লাইভ ট্র্যাকিং কাজ করবে না।", "Location access is off — live tracking won't work.")}
            </p>
            <p className="mt-1 font-semibold text-navy">{t("যেভাবে অনুমতি দেবেন:", "How to allow it:")}</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4">
              <li>{t("ব্রাউজারের অ্যাড্রেস বারের 🔒 আইকনে ট্যাপ করুন।", "Tap the 🔒 icon in the browser address bar.")}</li>
              <li>{t("“Location / অবস্থান” অপশনটি Allow করুন।", "Set “Location” to Allow.")}</li>
              <li>{t("ফোনের Settings → Location (GPS) চালু আছে কিনা দেখুন।", "Check phone Settings → Location (GPS) is turned on.")}</li>
              <li>{t("এরপর পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।", "Then refresh this page and try again.")}</li>
            </ol>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground"
            >
              {t("অনুমতি দিয়েছি — রিফ্রেশ", "I allowed it — refresh")}
            </button>
            <p className="mt-2">
              {t(
                "অনুমতি ছাড়া অর্ডার স্ট্যাটাস (পিকআপ/অন দ্য ওয়ে/ডেলিভার্ড) আপডেট করা যাবে, শুধু ম্যাপে অবস্থান দেখাবে না।",
                "Without permission you can still update order status (picked/on the way/delivered) — only the map position is hidden.",
              )}
            </p>
          </div>
        )}
      </div>

      {err && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-[11px] font-semibold text-destructive">{err}</p>}

      {/* ফিল্টার ও সার্চ */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("অর্ডার নম্বর, গ্রাহক, ফোন বা ঠিকানা খুঁজুন", "Search order no, customer, phone or address")}
            className="min-h-11 w-full rounded-xl border border-border bg-muted pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          <select
            value={fStatus}
            onChange={(e) => setFStatus(e.target.value)}
            className="min-h-9 rounded-lg border border-border bg-card px-2 font-semibold"
            aria-label={t("অবস্থা", "Status")}
          >
            <option value="all">{t("সব অবস্থা", "All statuses")}</option>
            {["assigned", "picked", "on_the_way", "arrived", "delivered", "failed"].map((s) => (
              <option key={s} value={s}>
                {t(DELIVERY_STATUS[s]?.bn ?? s, DELIVERY_STATUS[s]?.en ?? s)}
              </option>
            ))}
          </select>
          <select
            value={fArea}
            onChange={(e) => setFArea(e.target.value)}
            className="min-h-9 rounded-lg border border-border bg-card px-2 font-semibold"
            aria-label={t("এলাকা", "Area")}
          >
            <option value="all">{t("সব এলাকা", "All areas")}</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={fPriority}
            onChange={(e) => setFPriority(e.target.value as "all" | "urgent" | "cod")}
            className="min-h-9 rounded-lg border border-border bg-card px-2 font-semibold"
            aria-label={t("অগ্রাধিকার", "Priority")}
          >
            <option value="all">{t("সব অগ্রাধিকার", "All priorities")}</option>
            <option value="urgent">{t("জরুরি (ETA ≤ ২০ মিনিট / পথে)", "Urgent (ETA ≤ 20 min / en route)")}</option>
            <option value="cod">{t("ক্যাশ সংগ্রহ বাকি", "Cash to collect")}</option>
          </select>
          {filtering && (
            <button
              onClick={() => {
                setQ("");
                setFStatus("all");
                setFArea("all");
                setFPriority("all");
              }}
              className="min-h-9 rounded-lg bg-muted px-3 font-bold text-navy"
            >
              {t("ফিল্টার মুছুন", "Clear filters")}
            </button>
          )}
        </div>
      </div>

      <h2 className="mt-5 text-sm font-bold text-navy">
        {t("চলমান ডেলিভারি", "Active deliveries")} ({t.n(active.length)}
        {filtering ? `/${t.n(allActive.length)}` : ""})
      </h2>
      {active.length === 0 && (
        <p className="mt-2 rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
          {filtering
            ? t("এই ফিল্টারে কোনো ডেলিভারি নেই।", "No deliveries match these filters.")
            : t("এখন কোনো ডেলিভারি নেই। নতুন অর্ডার এলে এখানে দেখাবে।", "No active delivery right now. New assignments appear here.")}
        </p>
      )}


      <ul className="mt-2 space-y-3">
        {activeSorted.map((r, i) => {
          const cod = r.orders?.payment_method === "cod" && r.orders?.payment_status !== "paid";
          const wa = (r.orders?.phone ?? "").replace(/\D/g, "").replace(/^0/, "88");
          const step = ["assigned", "picked", "on_the_way", "arrived"].indexOf(r.status) + 1;
          return (
            <li
              key={r.id}
              className={`rounded-2xl border bg-card p-4 ${i === 0 ? "border-primary shadow-[var(--shadow-elevated)]" : "border-border"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {i === 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {t("পরবর্তী স্টপ", "Next stop")}
                  </span>
                )}
                <p className="text-xs font-bold text-navy">#{r.order_no}</p>
                <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary-dark">
                  {DELIVERY_STATUS[r.status]?.emoji} {t(DELIVERY_STATUS[r.status]?.bn ?? r.status, DELIVERY_STATUS[r.status]?.en ?? r.status)}
                </span>
              </div>

              {/* ধাপ অগ্রগতি */}
              <div className="mt-2 flex gap-1" aria-hidden>
                {[1, 2, 3, 4].map((s) => (
                  <span key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>

              <p className="mt-2 text-xs font-semibold">{r.orders?.customer_name}</p>
              <p className="flex items-start gap-1 text-[11px] text-muted-foreground">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-primary" /> {r.orders?.address}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <a href={`tel:${r.orders?.phone}`} className="flex min-h-9 items-center gap-1 rounded-lg bg-muted px-2 font-semibold">
                  <Phone className="h-3 w-3" /> {r.orders?.phone}
                </a>
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-9 items-center rounded-lg bg-muted px-2 font-semibold"
                >
                  WhatsApp
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.orders?.address ?? "")}&travelmode=driving`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-9 items-center gap-1 rounded-lg bg-primary/10 px-2 font-bold text-primary"
                >
                  <Navigation className="h-3 w-3" /> {t("দিকনির্দেশ", "Navigate")}
                </a>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(r.orders?.address ?? "")}
                  className="flex min-h-9 items-center rounded-lg bg-muted px-2 font-semibold"
                >
                  {t("ঠিকানা কপি", "Copy address")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void copyTrackLink(r.public_token);
                    setCopied(r.id);
                    setTimeout(() => setCopied(""), 2000);
                  }}
                  className="flex min-h-9 items-center gap-1 rounded-lg bg-muted px-2 font-semibold"
                >
                  <Share2 className="h-3 w-3 text-primary" />
                  {copied === r.id ? t("লিংক কপি হয়েছে", "Link copied") : t("ট্র্যাকিং লিংক", "Tracking link")}
                </button>
                <a
                  href={whatsappTrackLink(r.public_token, r.order_no)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-9 items-center rounded-lg bg-muted px-2 font-semibold"
                >
                  {t("লিংক পাঠান", "Send link")}
                </a>
                <span className="ml-auto font-display text-sm font-extrabold text-primary">{t.money(Number(r.orders?.total ?? 0))}</span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                <span className={`rounded-full px-2 py-0.5 ${cod ? "bg-sale/10 text-sale" : "bg-secondary text-primary-dark"}`}>
                  {cod ? t("ক্যাশ অন ডেলিভারি — টাকা সংগ্রহ করুন", "Cash on delivery — collect payment") : t("পেমেন্ট সম্পন্ন", "Payment done")}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  {t("আনুমানিক", "ETA")} {t.n(r.eta_minutes)} {t("মিনিট", "min")}
                </span>
                <span className="text-muted-foreground">
                  {t("নিয়োগ", "Assigned")}: {fmtTime(r.created_at, t.en)}
                </span>
                {r.note && <span className="w-full text-muted-foreground">📝 {r.note}</span>}
              </div>


            {r.status === "arrived" && (
              <>
                <input
                  value={otp[r.id] ?? ""}
                  onChange={(e) => setOtp({ ...otp, [r.id]: e.target.value })}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder={t("গ্রাহকের ৪ ডিজিট ওটিপি", "Customer 4-digit OTP")}
                  className="mt-2 w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary"
                />

                <div className="mt-3 rounded-xl border border-dashed border-border p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-navy">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    {t("ডেলিভারির প্রমাণ (ঐচ্ছিক)", "Proof of delivery (optional)")}
                  </p>

                  <input
                    value={pod[r.id]?.receiver ?? ""}
                    onChange={(e) => setPod({ ...pod, [r.id]: { ...pod[r.id], receiver: e.target.value } })}
                    placeholder={t("যিনি গ্রহণ করেছেন তার নাম", "Receiver's name")}
                    className="mt-2 w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
                  />

                  <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg bg-muted px-3 py-2 text-[11px] font-semibold">
                    <Camera className="h-3.5 w-3.5 text-primary" />
                    {pod[r.id]?.photo?.name
                      ? pod[r.id]!.photo!.name.slice(0, 28)
                      : t("ডেলিভারির ছবি তুলুন", "Capture delivery photo")}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => setPod({ ...pod, [r.id]: { ...pod[r.id], photo: e.target.files?.[0] ?? null } })}
                    />
                  </label>

                  <div className="mt-2">
                    <SignaturePad
                      label={t("গ্রাহকের স্বাক্ষর", "Customer signature")}
                      clearLabel={t("মুছে ফেলুন", "Clear")}
                      onChange={(b) => setPod((p) => ({ ...p, [r.id]: { ...p[r.id], sign: b } }))}
                    />
                  </div>
                </div>
              </>
            )}


              <div className="mt-3 flex flex-wrap gap-2">
                {(NEXT[r.status] ?? []).map((s) => (
                  <button
                    key={s}
                    disabled={busy === r.id + s}
                    onClick={() => void update(r, s)}
                    className={`min-h-11 rounded-lg px-3 text-[11px] font-bold disabled:opacity-60 ${
                      s === "failed" ? "bg-destructive/10 text-destructive" : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {t(DELIVERY_STATUS[s]?.bn ?? s, DELIVERY_STATUS[s]?.en ?? s)}
                  </button>
                ))}
              </div>
            </li>
          );
        })}

      </ul>

      {past.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-bold text-navy">
            {t("সম্পন্ন ও ব্যর্থ", "Completed & failed")} ({t.n(past.length)})
          </h2>
          <ul className="mt-2 space-y-2">
            {past.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-[11px]">
                <span>{DELIVERY_STATUS[r.status]?.emoji}</span>
                <span className="font-bold">#{r.order_no}</span>
                <span className="text-muted-foreground">{r.orders?.customer_name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    r.status === "delivered" ? "bg-secondary text-primary-dark" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {t(DELIVERY_STATUS[r.status]?.bn ?? r.status, DELIVERY_STATUS[r.status]?.en ?? r.status)}
                </span>
                <span className="font-display font-extrabold text-primary">{t.money(Number(r.orders?.total ?? 0))}</span>
                <span className="ml-auto text-muted-foreground">{fmtTime(r.created_at, t.en)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

    </div>
  );
}
