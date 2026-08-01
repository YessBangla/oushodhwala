import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bike, MapPin, RefreshCw, Phone, Camera, CheckCircle2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { DELIVERY_STATUS, fmtTime } from "@/lib/delivery";
import { SignaturePad } from "@/components/SignaturePad";
import { uploadFile, safeName } from "@/lib/storage";


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
  orders: { customer_name: string; phone: string; address: string; total: number; payment_method: string; payment_status: string } | null;
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
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const { data: rider, isLoading: riderLoading } = useQuery({
    queryKey: ["my-rider", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("riders").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: rows = [], refetch } = useQuery({
    queryKey: ["rider-deliveries", rider?.id],
    enabled: !!rider,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("id, order_no, status, otp, eta_minutes, note, created_at, orders(customer_name, phone, address, total, payment_method, payment_status)")
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
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [rider, refetch]);

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
    const { error } = await supabase.rpc("rider_update_delivery", {
      _delivery_id: row.id,
      _status: status,
      _note: "",
      _otp: otp[row.id] ?? "",
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

  const active = rows.filter((r) => !["delivered", "failed"].includes(r.status));
  const past = rows.filter((r) => ["delivered", "failed"].includes(r.status));

  return (
    <div className="pt-4">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-lg">🛵</span>
        <div>
          <p className="text-sm font-bold text-navy">{rider.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {rider.phone} · {rider.zone || t("সব এলাকা", "All zones")}
          </p>
        </div>
        <button onClick={() => void refetch()} className="ml-auto rounded-lg bg-muted p-2" aria-label={t("রিফ্রেশ", "Refresh")}>
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {err && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-[11px] font-semibold text-destructive">{err}</p>}

      <h2 className="mt-5 text-sm font-bold text-navy">
        {t("চলমান ডেলিভারি", "Active deliveries")} ({t.n(active.length)})
      </h2>
      {active.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">{t("এখন কোনো ডেলিভারি নেই।", "No active delivery right now.")}</p>
      )}

      <ul className="mt-2 space-y-3">
        {active.map((r) => (
          <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-navy">#{r.order_no}</p>
              <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary-dark">
                {t(DELIVERY_STATUS[r.status]?.bn ?? r.status, DELIVERY_STATUS[r.status]?.en ?? r.status)}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold">{r.orders?.customer_name}</p>
            <p className="flex items-start gap-1 text-[11px] text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-primary" /> {r.orders?.address}
            </p>
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              <a href={`tel:${r.orders?.phone}`} className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 font-semibold">
                <Phone className="h-3 w-3" /> {r.orders?.phone}
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.orders?.address ?? "")}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-muted px-2 py-1 font-semibold"
              >
                {t("ম্যাপ", "Map")}
              </a>
              <span className="ml-auto font-display text-sm font-extrabold text-primary">{t.money(Number(r.orders?.total ?? 0))}</span>
            </div>
            <p className="mt-1 text-[10px] font-semibold text-muted-foreground">
              {r.orders?.payment_method === "cod" && r.orders?.payment_status !== "paid"
                ? t("ক্যাশ অন ডেলিভারি — টাকা সংগ্রহ করুন", "Cash on delivery — collect payment")
                : t("পেমেন্ট সম্পন্ন", "Payment done")}
            </p>

            {r.status === "arrived" && (
              <input
                value={otp[r.id] ?? ""}
                onChange={(e) => setOtp({ ...otp, [r.id]: e.target.value })}
                inputMode="numeric"
                maxLength={4}
                placeholder={t("গ্রাহকের ৪ ডিজিট ওটিপি", "Customer 4-digit OTP")}
                className="mt-2 w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary"
              />
            )}

            <div className="mt-2 flex flex-wrap gap-2">
              {(NEXT[r.status] ?? []).map((s) => (
                <button
                  key={s}
                  disabled={busy === r.id + s}
                  onClick={() => void update(r, s)}
                  className={`rounded-lg px-3 py-2 text-[11px] font-bold disabled:opacity-60 ${
                    s === "failed" ? "bg-destructive/10 text-destructive" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {t(DELIVERY_STATUS[s]?.bn ?? s, DELIVERY_STATUS[s]?.en ?? s)}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {past.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-bold text-navy">{t("সম্পন্ন", "Completed")}</h2>
          <ul className="mt-2 space-y-2">
            {past.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-[11px]">
                <span>{DELIVERY_STATUS[r.status]?.emoji}</span>
                <span className="font-bold">#{r.order_no}</span>
                <span className="text-muted-foreground">{r.orders?.customer_name}</span>
                <span className="ml-auto text-muted-foreground">{fmtTime(r.created_at, t.en)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
