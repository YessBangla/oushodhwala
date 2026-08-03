import { Navigation, MapPin, Route as RouteIcon } from "lucide-react";
import { useT } from "@/lib/i18n";
import { haversineKm } from "@/components/LiveMap";

export type PathPoint = { lat: number; lng: number; at?: string | null };

/**
 * রাইডারের লাইভ অবস্থান + রুট/মুভমেন্ট ইতিহাস।
 * OSM এমবেড ম্যাপের উপরে SVG দিয়ে চলাচলের পথ আঁকা হয়।
 */
export function RouteMap({
  path,
  destLat,
  destLng,
  lastSeen,
  height = "h-64",
}: {
  path: PathPoint[];
  destLat?: number | null;
  destLng?: number | null;
  lastSeen?: string | null;
  height?: string;
}) {
  const t = useT();
  const pts = path.filter((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
  if (pts.length === 0) {
    return (
      <p className="mt-3 rounded-xl border border-dashed border-border bg-card p-5 text-center text-[11px] text-muted-foreground">
        {t("রাইডারের অবস্থান এখনো পাওয়া যায়নি।", "No rider location recorded yet.")}
      </p>
    );
  }

  const last = pts[pts.length - 1]!;
  const lats = [...pts.map((p) => Number(p.lat)), ...(destLat != null ? [Number(destLat)] : [])];
  const lngs = [...pts.map((p) => Number(p.lng)), ...(destLng != null ? [Number(destLng)] : [])];
  const pad = 0.006;
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;
  const bbox = [minLng, minLat, maxLng, maxLat].join("%2C");

  // বাউন্ডিং বক্সে ০–১০০ স্কেলে রূপান্তর
  const x = (lng: number) => ((lng - minLng) / (maxLng - minLng || 1)) * 100;
  const y = (lat: number) => (1 - (lat - minLat) / (maxLat - minLat || 1)) * 100;
  const poly = pts.map((p) => `${x(Number(p.lng)).toFixed(2)},${y(Number(p.lat)).toFixed(2)}`).join(" ");

  let travelled = 0;
  for (let i = 1; i < pts.length; i++) {
    travelled += haversineKm(Number(pts[i - 1]!.lat), Number(pts[i - 1]!.lng), Number(pts[i]!.lat), Number(pts[i]!.lng));
  }
  const remaining =
    destLat != null && destLng != null ? haversineKm(Number(last.lat), Number(last.lng), Number(destLat), Number(destLng)) : null;
  const eta = remaining !== null ? Math.max(2, Math.round((remaining / 18) * 60) + 3) : null;

  const waypoints = pts
    .slice(0, -1)
    .slice(-8)
    .map((p) => `${p.lat},${p.lng}`)
    .join("%7C");

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border">
      <div className="relative">
        <iframe
          title={t("রাইডারের রুট ম্যাপ", "Rider route map")}
          className={`${height} w-full`}
          loading="lazy"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${last.lat}%2C${last.lng}`}
        />
        {pts.length > 1 && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <polyline points={poly} fill="none" stroke="#1a8f5a" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
            {pts.map((p, i) => (
              <circle key={i} cx={x(Number(p.lng))} cy={y(Number(p.lat))} r={i === pts.length - 1 ? 1.6 : 0.9} fill={i === pts.length - 1 ? "#e2452e" : "#1a8f5a"} />
            ))}
            {destLat != null && destLng != null && (
              <circle cx={x(Number(destLng))} cy={y(Number(destLat))} r="1.6" fill="#0b3b6f" />
            )}
          </svg>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-card px-3 py-2 text-[11px]">
        <span className="flex items-center gap-1 font-semibold text-primary-dark">
          <RouteIcon className="h-3 w-3" />
          {t(`পথ ${t.n(Number(travelled.toFixed(1)))} কিমি · ${t.n(pts.length)} পয়েন্ট`, `${travelled.toFixed(1)} km · ${pts.length} points`)}
        </span>
        {remaining !== null && (
          <span className="flex items-center gap-1 font-semibold text-navy">
            <Navigation className="h-3 w-3" />
            {t(`বাকি ${t.n(Number(remaining.toFixed(1)))} কিমি`, `${remaining.toFixed(1)} km left`)}
            {eta !== null && ` · ${t(`~${t.n(eta)} মিনিট`, `~${eta} min`)}`}
          </span>
        )}
        {lastSeen && (
          <span className="text-muted-foreground">
            {t("সর্বশেষ", "Last")}:{" "}
            {new Date(lastSeen).toLocaleTimeString(t.en ? "en-GB" : "bn-BD", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <a
          className="ml-auto flex items-center gap-1 font-semibold text-primary"
          target="_blank"
          rel="noreferrer"
          href={`https://www.google.com/maps/dir/?api=1&origin=${pts[0]!.lat},${pts[0]!.lng}${
            destLat != null && destLng != null ? `&destination=${destLat},${destLng}` : `&destination=${last.lat},${last.lng}`
          }${waypoints ? `&waypoints=${waypoints}` : ""}`}
        >
          <MapPin className="h-3 w-3" /> {t("রুট খুলুন", "Open route")}
        </a>
      </div>
    </div>
  );
}
