import { useEffect, useMemo, useState } from "react";
import { LocateFixed, MapPin, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useT } from "@/lib/i18n";
import { DISTRICTS, zonesOf, thanasOf, areasOf, matchDistrict, matchThana } from "@/data/bd-areas";

export type PickedAddress = {
  district: string;
  cityZone: string;
  thana: string;
  area: string;
  details: string;
  lat: number | null;
  lng: number | null;
  source: "gps" | "manual";
};

export const emptyAddress: PickedAddress = {
  district: "",
  cityZone: "",
  thana: "",
  area: "",
  details: "",
  lat: null,
  lng: null,
  source: "manual",
};

export function formatAddress(a: PickedAddress, en = false) {
  const parts = [a.details, a.area, a.thana, a.cityZone, a.district].filter(Boolean);
  const line = parts.join(", ");
  return line || (en ? "No address" : "ঠিকানা নেই");
}

type Geo = { display: string; district?: string; thana?: string; area?: string; road?: string };

/** OpenStreetMap Nominatim দিয়ে রিভার্স-জিওকোড; ব্যর্থ হলে BigDataCloud */
async function reverseGeocode(lat: number, lng: number, en: boolean): Promise<Geo> {
  const lang = en ? "en" : "bn,en";
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=${lang}`,
      { headers: { Accept: "application/json" } },
    );
    if (r.ok) {
      const j = (await r.json()) as { display_name?: string; address?: Record<string, string> };
      const ad = j.address ?? {};
      return {
        display: j.display_name ?? "",
        district: ad["state_district"] ?? ad["district"] ?? ad["city"] ?? ad["county"] ?? "",
        thana: ad["city_district"] ?? ad["suburb"] ?? ad["town"] ?? "",
        area: ad["neighbourhood"] ?? ad["quarter"] ?? ad["suburb"] ?? "",
        road: [ad["house_number"], ad["road"]].filter(Boolean).join(" "),
      };
    }
  } catch {
    /* পরবর্তী সোর্স */
  }
  const r2 = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
  if (!r2.ok) throw new Error("REVERSE_GEOCODE_FAILED");
  const j2 = (await r2.json()) as { locality?: string; city?: string; principalSubdivision?: string; localityInfo?: unknown };
  return {
    display: [j2.locality, j2.city, j2.principalSubdivision].filter(Boolean).join(", "),
    district: j2.city ?? j2.principalSubdivision ?? "",
    thana: j2.locality ?? "",
    area: j2.locality ?? "",
    road: "",
  };
}

export function AddressPicker({
  value,
  onChange,
  compact = false,
}: {
  value: PickedAddress;
  onChange: (v: PickedAddress) => void;
  compact?: boolean;
}) {
  const t = useT();
  const [gpsState, setGpsState] = useState<"idle" | "locating" | "ok" | "denied" | "error">("idle");
  const [gpsText, setGpsText] = useState("");
  const [permission, setPermission] = useState<PermissionState | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((p) => {
        setPermission(p.state);
        p.onchange = () => setPermission(p.state);
      })
      .catch(() => setPermission(null));
  }, []);

  const district = useMemo(() => DISTRICTS.find((d) => d.en === value.district), [value.district]);
  const zones = value.district ? zonesOf(value.district) : [];
  const thanas = value.district ? thanasOf(value.district, value.cityZone) : [];
  const areas = value.district && value.thana ? areasOf(value.district, value.cityZone, value.thana) : [];

  const set = (patch: Partial<PickedAddress>) => onChange({ ...value, ...patch });

  const useGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsState("error");
      setGpsText(t("এই ডিভাইসে জিপিএস সাপোর্ট নেই।", "GPS is not supported on this device."));
      return;
    }
    setGpsState("locating");
    setGpsText("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const geo = await reverseGeocode(lat, lng, t.en);
          const hay = `${geo.display} ${geo.district ?? ""} ${geo.thana ?? ""} ${geo.area ?? ""}`;
          const d = matchDistrict(hay);
          let cityZone = "";
          let thana = "";
          if (d) {
            const m = matchThana(d, hay);
            cityZone = m.zone?.en ?? "";
            thana = m.thana?.en ?? "";
          }
          onChange({
            ...value,
            lat,
            lng,
            source: "gps",
            district: d?.en ?? value.district,
            cityZone: cityZone || value.cityZone,
            thana: thana || value.thana,
            area: geo.area || value.area,
            details: value.details || geo.road || "",
          });
          setGpsState("ok");
          setGpsText(geo.display);
        } catch {
          onChange({ ...value, lat, lng, source: "gps" });
          setGpsState("ok");
          setGpsText(t("অবস্থান পাওয়া গেছে, তবে ঠিকানা শনাক্ত হয়নি — নিচে পূরণ করুন।", "Location found but address could not be detected — please fill it below."));
        }
      },
      (err) => {
        setGpsState(err.code === err.PERMISSION_DENIED ? "denied" : "error");
        setGpsText(
          err.code === err.PERMISSION_DENIED
            ? t("জিপিএস অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংস থেকে লোকেশন চালু করুন অথবা নিচে এলাকা নির্বাচন করুন।", "Location permission denied. Enable location in browser settings or select your area below.")
            : t("অবস্থান নেওয়া যায়নি। নিচে এলাকা নির্বাচন করুন।", "Could not get your location. Please select your area below."),
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const missing: string[] = [];
  if (!value.district) missing.push(t("জেলা", "District"));
  if (district?.zones && !value.cityZone) missing.push(t("সিটি কর্পোরেশন", "City corporation"));
  if (!value.thana) missing.push(t("থানা", "Thana"));
  if (!value.details.trim()) missing.push(t("রোড/বাড়ি", "Road/House"));

  const sel = "w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs outline-none focus:border-primary";

  return (
    <div className={compact ? "" : "rounded-xl border border-border bg-card p-3"}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={useGps}
          disabled={gpsState === "locating"}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground disabled:opacity-60"
        >
          {gpsState === "locating" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
          {gpsState === "locating"
            ? t("অবস্থান নেওয়া হচ্ছে...", "Getting your location...")
            : t("জিপিএস দিয়ে ঠিকানা নিন", "Use GPS for my address")}
        </button>
        {value.lat !== null && value.lng !== null && (
          <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-primary-dark">
            <MapPin className="h-3 w-3" /> {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
        )}
        {permission === "denied" && (
          <span className="text-[10px] font-semibold text-muted-foreground">
            {t("ব্রাউজারে লোকেশন ব্লক করা আছে", "Location is blocked in the browser")}
          </span>
        )}
      </div>

      {gpsText && (
        <p
          className={`mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-[11px] ${
            gpsState === "ok" ? "bg-secondary text-primary-dark" : "bg-destructive/10 text-destructive"
          }`}
        >
          {gpsState === "ok" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span>{gpsText}</span>
        </p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <select
          value={value.district}
          onChange={(e) => set({ district: e.target.value, cityZone: "", thana: "", area: "" })}
          className={sel}
        >
          <option value="">{t("জেলা নির্বাচন করুন", "Select district")}</option>
          {DISTRICTS.map((d) => (
            <option key={d.en} value={d.en}>
              {t(d.bn, d.en)}
            </option>
          ))}
        </select>

        {zones.length > 0 && (
          <select value={value.cityZone} onChange={(e) => set({ cityZone: e.target.value, thana: "", area: "" })} className={sel}>
            <option value="">{t("সিটি কর্পোরেশন / এলাকা", "City corporation / area")}</option>
            {zones.map((z) => (
              <option key={z.en} value={z.en}>
                {t(z.bn, z.en)}
              </option>
            ))}
          </select>
        )}

        <select
          value={value.thana}
          onChange={(e) => set({ thana: e.target.value, area: "" })}
          disabled={thanas.length === 0}
          className={`${sel} disabled:opacity-50`}
        >
          <option value="">{t("থানা নির্বাচন করুন", "Select thana")}</option>
          {thanas.map((th) => (
            <option key={th.en} value={th.en}>
              {t(th.bn, th.en)}
            </option>
          ))}
        </select>

        {areas.length > 0 ? (
          <select value={value.area} onChange={(e) => set({ area: e.target.value })} className={sel}>
            <option value="">{t("এরিয়া নির্বাচন করুন", "Select area")}</option>
            {areas.map((a) => (
              <option key={a.en} value={a.en}>
                {t(a.bn, a.en)}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={value.area}
            onChange={(e) => set({ area: e.target.value })}
            placeholder={t("এরিয়া / মহল্লা", "Area / locality")}
            className={sel}
          />
        )}
      </div>

      <textarea
        value={value.details}
        onChange={(e) => set({ details: e.target.value })}
        rows={2}
        placeholder={t(
          "রোড, বাড়ি/ফ্ল্যাট, ল্যান্ডমার্কসহ সম্পূর্ণ ঠিকানা লিখুন",
          "Full address with road, house/flat and landmark",
        )}
        className="mt-2 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs outline-none focus:border-primary"
      />

      {missing.length > 0 && (
        <p className="mt-1.5 text-[10px] font-semibold text-muted-foreground">
          {t("অনুপস্থিত: ", "Missing: ")}
          {missing.join(", ")}
        </p>
      )}
    </div>
  );
}
