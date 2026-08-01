import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Truck, Phone, ShieldCheck, Share2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { DELIVERY_FLOW, DELIVERY_STATUS, fmtTime } from "@/lib/delivery";
import { resolveFileUrl } from "@/lib/storage";


export const Route = createFileRoute("/track/$no")({
  head: () => ({
    meta: [
      { title: "অর্ডার ট্র্যাকিং | Order Tracking — ঔষধওয়ালা" },
      { name: "description", content: "আপনার অর্ডার এখন কোথায় আছে, ডেলিভারিম্যান কে — সরাসরি ট্র্যাক করুন।" },
      { property: "og:title", content: "অর্ডার ট্র্যাকিং — ঔষধওয়ালা" },
      { property: "og:description", content: "রিয়েল-টাইম ডেলিভারি ট্র্যাকিং।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: Track,
});

function Track() {
  const { no } = Route.useParams();
  const t = useT();
  const { user, loading } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["track", no],
    enabled: !!user,
    queryFn: async () => {
      const { data: order } = await supabase
        .from("orders")
        .select("*, order_items(*), order_events(*)")
        .eq("order_no", no)
        .maybeSingle();
      const { data: delivery } = await supabase
        .from("deliveries")
        .select("*, riders(name, phone, vehicle)")
        .eq("order_no", no)
        .maybeSingle();
      let events: { id: string; status: string; note: string; created_at: string }[] = [];
      if (delivery) {
        const { data: ev } = await supabase
          .from("delivery_events")
          .select("id, status, note, created_at")
          .eq("delivery_id", delivery.id)
          .order("created_at");
        events = ev ?? [];
      }
      return { order, delivery, events };
    },
  });

  // রিয়েল-টাইম আপডেট
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`track-${no}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, () => void refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_events" }, () => void refetch())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [no, user, refetch]);

  if (loading || isLoading) return <p className="pt-16 text-center text-sm text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>;

  if (!user) {
    return (
      <div className="pt-16 text-center">
        <p className="text-xs text-muted-foreground">{t("ট্র্যাক করতে লগইন করুন।", "Log in to track your order.")}</p>
        <Link to="/auth" className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          {t("লগইন", "Log in")}
        </Link>
      </div>
    );
  }

  const order = data?.order;
  const delivery = data?.delivery;
  const rider = (delivery as { riders?: { name: string; phone: string; vehicle: string } } | null | undefined)?.riders;

  if (!order) {
    return (
      <div className="pt-16 text-center">
        <p className="text-sm font-bold">{t("অর্ডার পাওয়া যায়নি", "Order not found")}</p>
        <Link to="/orders" className="mt-3 inline-block text-xs font-semibold text-primary">
          {t("আমার অর্ডার", "My orders")}
        </Link>
      </div>
    );
  }

  const currentIdx = delivery ? DELIVERY_FLOW.indexOf(delivery.status as (typeof DELIVERY_FLOW)[number]) : -1;

  return (
    <div className="pt-4">
      <h1 className="flex items-center gap-2 font-display text-lg font-extrabold text-navy">
        <Truck className="h-5 w-5 text-primary" /> {t("অর্ডার ট্র্যাকিং", "Order tracking")}
      </h1>
      <p className="text-xs text-muted-foreground">
        #{order.order_no} · {t.money(Number(order.total))} · {order.address}
      </p>

      {!delivery && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
          {t(
            "আপনার অর্ডার প্রস্তুত হচ্ছে। ডেলিভারিম্যান নিয়োগ হলে এখানে সরাসরি ট্র্যাক করতে পারবেন।",
            "Your order is being prepared. Live tracking appears here once a rider is assigned.",
          )}
        </div>
      )}

      {delivery && (
        <>
          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-lg">🛵</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-navy">{rider?.name || t("ডেলিভারিম্যান", "Rider")}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t(DELIVERY_STATUS[delivery.status]?.bn ?? delivery.status, DELIVERY_STATUS[delivery.status]?.en ?? delivery.status)}
                  {delivery.eta_minutes ? ` · ETA ${t.n(delivery.eta_minutes)} ${t("মিনিট", "min")}` : ""}
                </p>
              </div>
              {rider?.phone && (
                <a
                  href={`tel:${rider.phone}`}
                  className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground"
                >
                  <Phone className="h-3.5 w-3.5" /> {t("কল", "Call")}
                </a>
              )}
            </div>
            {delivery.otp && delivery.status !== "delivered" && (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-primary-dark">
                <ShieldCheck className="h-4 w-4" />
                {t("ডেলিভারি ওটিপি", "Delivery OTP")}: <span className="font-display text-base">{delivery.otp}</span>
              </p>
            )}
            {delivery.last_lat && delivery.last_lng && (
              <a
                className="mt-2 inline-block text-[11px] font-semibold text-primary"
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps?q=${delivery.last_lat},${delivery.last_lng}`}
              >
                {t("ম্যাপে অবস্থান দেখুন", "See location on map")} →
              </a>
            )}
          </div>

          {/* ধাপ */}
          <ol className="mt-4 space-y-3">
            {DELIVERY_FLOW.map((s, i) => {
              const on = i <= currentIdx;
              const ev = data?.events.find((e) => e.status === s);
              return (
                <li key={s} className="flex gap-3">
                  <span
                    className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] ${on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {DELIVERY_STATUS[s]!.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold ${on ? "text-navy" : "text-muted-foreground"}`}>
                      {t(DELIVERY_STATUS[s]!.bn, DELIVERY_STATUS[s]!.en)}
                    </p>
                    {ev && (
                      <p className="text-[10px] text-muted-foreground">
                        {fmtTime(ev.created_at, t.en)} {ev.note ? `· ${ev.note}` : ""}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <Link to="/orders" className="mt-6 inline-block text-xs font-semibold text-primary">
        ← {t("আমার সব অর্ডার", "All my orders")}
      </Link>
    </div>
  );
}
