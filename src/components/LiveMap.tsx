import { Navigation, MapPin } from "lucide-react";
import { useT } from "@/lib/i18n";

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** OpenStreetMap embed — কোনো API কী লাগে না */
export function LiveMap({
  riderLat,
  riderLng,
  destLat,
  destLng,
  lastSeen,
}: {
  riderLat: number;
  riderLng: number;
  destLat?: number | null;
  destLng?: number | null;
  lastSeen?: string | null;
}) {
  const t = useT();
  const pad = 0.008;
  const lats = [riderLat, ...(destLat != null ? [destLat] : [])];
  const lngs = [riderLng, ...(destLng != null ? [destLng] : [])];
  const bbox = [
    Math.min(...lngs) - pad,
    Math.min(...lats) - pad,
    Math.max(...lngs) + pad,
    Math.max(...lats) + pad,
  ].join("%2C");

  const km = destLat != null && destLng != null ? haversineKm(riderLat, riderLng, destLat, destLng) : null;
  const eta = km !== null ? Math.max(2, Math.round((km / 18) * 60) + 3) : null; // শহরে গড়ে ১৮ কিমি/ঘণ্টা

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border">
      <iframe
        title={t("রাইডারের লাইভ অবস্থান", "Rider live location")}
        className="h-56 w-full"
        loading="lazy"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${riderLat}%2C${riderLng}`}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-card px-3 py-2 text-[11px]">
        <span className="flex items-center gap-1 font-semibold text-primary-dark">
          <Navigation className="h-3 w-3" />
          {km !== null
            ? t(`দূরত্ব ${t.n(Number(km.toFixed(1)))} কিমি`, `${km.toFixed(1)} km away`)
            : t("রাইডারের অবস্থান", "Rider location")}
        </span>
        {eta !== null && (
          <span className="font-semibold text-navy">{t(`আনুমানিক ${t.n(eta)} মিনিট`, `~${eta} min`)}</span>
        )}
        {lastSeen && (
          <span className="text-muted-foreground">
            {t("সর্বশেষ আপডেট", "Last update")}: {new Date(lastSeen).toLocaleTimeString(t.en ? "en-GB" : "bn-BD", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <a
          className="ml-auto flex items-center gap-1 font-semibold text-primary"
          target="_blank"
          rel="noreferrer"
          href={`https://www.google.com/maps/dir/?api=1&origin=${riderLat},${riderLng}${destLat != null && destLng != null ? `&destination=${destLat},${destLng}` : ""}`}
        >
          <MapPin className="h-3 w-3" /> {t("বড় ম্যাপে", "Open map")}
        </a>
      </div>
    </div>
  );
}
