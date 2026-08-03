import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Truck, MapPin, Clock, Share2, RefreshCw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { DELIVERY_FLOW, DELIVERY_STATUS, fmtTime } from "@/lib/delivery";
import { LiveMap } from "@/components/LiveMap";

export const Route = createFileRoute("/t/$token")({
  head: () => ({
    meta: [
      { title: "লাইভ ডেলিভারি ট্র্যাকিং | Live Delivery Tracking — ঔষধওয়ালা" },
      { name: "description", content: "শেয়ার করা লিংক দিয়ে ডেলিভারির বর্তমান ধাপ, আনুমানিক সময় ও ইভেন্ট ইতিহাস দেখুন।" },
      { property: "og:title", content: "লাইভ ডেলিভারি ট্র্যাকিং — ঔষধওয়ালা" },
      { property: "og:description", content: "ডেলিভারির বর্তমান ধাপ, ETA ও ইভেন্ট ইতিহাস।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: PublicTrack,
});

type TrackData = {
  found: boolean;
  order_no?: string;
  status?: string;
  eta_minutes?: number;
  last_lat?: number | null;
  last_lng?: number | null;
  last_seen_at?: string | null;
  dest_lat?: number | null;
  dest_lng?: number | null;
  rider_name?: string | null;
  rider_vehicle?: string | null;
  customer_name?: string;
  area?: string;
  thana?: string;
  city_zone?: string;
  district?: string;
  total?: number;
  payment_method?: string;
  payment_status?: string;
  created_at?: string;
  events?: { id: string; status: string; note: string; created_at: string }[];
};

function PublicTrack() {
  const { token } = Route.useParams();
  const t = useT();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["public-track", token],
    // পোলিং — প্রতি ১৫ সেকেন্ডে স্বয়ংক্রিয় আপডেট
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data: row, error } = await supabase.rpc("public_track", { _token: token });
      if (error) throw error;
      return row as unknown as TrackData;
    },
  });

  // রিয়েল-টাইম (WebSocket) — ডেলিভারি বা ইভেন্ট বদলালেই সঙ্গে সঙ্গে রিফ্রেশ
  useEffect(() => {
    const ch = supabase
      .channel(`public-track-${token}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, () => void refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_events" }, () => void refetch())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [token, refetch]);

  if (isLoading) return <p className="pt-16 text-center text-sm text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>;

  if (!data?.found) {
    return (
      <div className="pt-16 text-center">
        <Truck className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-bold">{t("ট্র্যাকিং লিংকটি সঠিক নয়", "This tracking link is not valid")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("লিংকটি মেয়াদোত্তীর্ণ বা ভুল হতে পারে।", "The link may be expired or incorrect.")}
        </p>
        <Link to="/" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          {t("হোম", "Home")}
        </Link>
      </div>
    );
  }

  const status = data.status ?? "unassigned";
  const idx = DELIVERY_FLOW.indexOf(status as (typeof DELIVERY_FLOW)[number]);
  const place = [data.area, data.thana, data.city_zone, data.district].filter(Boolean).join(", ");

  return (
    <div className="pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="flex items-center gap-2 font-display text-lg font-extrabold text-navy">
          <Truck className="h-5 w-5 text-primary" /> {t("লাইভ ডেলিভারি ট্র্যাকিং", "Live delivery tracking")}
        </h1>
        <button
          onClick={() => void refetch()}
          className="ml-auto rounded-lg bg-muted p-2"
          aria-label={t("রিফ্রেশ", "Refresh")}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        #{data.order_no} · {data.customer_name} · {place}
      </p>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-lg">
            {DELIVERY_STATUS[status]?.emoji ?? "🛵"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-navy">
              {t(DELIVERY_STATUS[status]?.bn ?? status, DELIVERY_STATUS[status]?.en ?? status)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {data.rider_name ? `${data.rider_name}${data.rider_vehicle ? ` · ${data.rider_vehicle}` : ""}` : t("ডেলিভারিম্যান নির্ধারণ হয়নি", "Rider not assigned")}
            </p>
          </div>
          {!!data.eta_minutes && status !== "delivered" && (
            <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
              <Clock className="h-3.5 w-3.5" /> ETA {t.n(data.eta_minutes)} {t("মিনিট", "min")}
            </span>
          )}
        </div>

        {/* ধাপ অগ্রগতি */}
        <div className="mt-4 flex gap-1" aria-hidden>
          {DELIVERY_FLOW.map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[9px] font-semibold text-muted-foreground">
          {DELIVERY_FLOW.map((s, i) => (
            <span key={s} className={i <= idx ? "text-primary" : ""}>
              {t(DELIVERY_STATUS[s]!.bn, DELIVERY_STATUS[s]!.en).split(" ")[0]}
            </span>
          ))}
        </div>

        {data.last_lat != null && data.last_lng != null && (
          <LiveMap
            riderLat={Number(data.last_lat)}
            riderLng={Number(data.last_lng)}
            destLat={data.dest_lat != null ? Number(data.dest_lat) : null}
            destLng={data.dest_lng != null ? Number(data.dest_lng) : null}
            lastSeen={data.last_seen_at ?? null}
          />
        )}

        <button
          onClick={() => {
            const url = typeof window !== "undefined" ? window.location.href : "";
            void navigator.clipboard?.writeText(url);
          }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-[11px] font-semibold"
        >
          <Share2 className="h-3.5 w-3.5 text-primary" /> {t("এই লিংক কপি করুন", "Copy this link")}
        </button>
      </div>

      <h2 className="mt-5 flex items-center gap-1.5 text-sm font-bold text-navy">
        <MapPin className="h-4 w-4 text-primary" /> {t("ইভেন্ট ইতিহাস", "Event history")}
      </h2>
      <ul className="mt-2 space-y-2">
        {(data.events ?? []).map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-[11px]">
            <span>{DELIVERY_STATUS[e.status]?.emoji ?? "•"}</span>
            <span className="font-bold text-navy">
              {t(DELIVERY_STATUS[e.status]?.bn ?? e.status, DELIVERY_STATUS[e.status]?.en ?? e.status)}
            </span>
            {e.note && <span className="text-muted-foreground">{e.note}</span>}
            <span className="ml-auto text-muted-foreground">{fmtTime(e.created_at, t.en)}</span>
          </li>
        ))}
        {(data.events ?? []).length === 0 && (
          <li className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
            {t("এখনো কোনো ইভেন্ট নেই।", "No events yet.")}
          </li>
        )}
      </ul>
    </div>
  );
}
