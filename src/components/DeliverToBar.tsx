import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, ChevronDown, Check, Trash2, Plus, Navigation, Truck } from "lucide-react";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AddressPicker, emptyAddress, formatAddress, type PickedAddress } from "@/components/AddressPicker";
import { LiveMap } from "@/components/LiveMap";
import { DELIVERY_STATUS } from "@/lib/delivery";

const OPEN_KEY = "ow-deliver-bar-open";

type LiveDelivery = {
  id: string;
  order_no: string;
  status: string;
  last_lat: number | null;
  last_lng: number | null;
  last_seen_at: string | null;
  eta_minutes: number | null;
  riders?: { name: string; phone: string } | null;
};

/** হেডারের "ডেলিভারি" বার — হাইড/আনহাইড প্যানেলসহ, লগইন ছাড়াই ঠিকানা বদলানো যায় */
export function DeliverToBar() {
  const t = useT();
  const navigate = useNavigate();
  const { addresses, activeAddress, setActiveAddress, addAddress, removeAddress } = useStore();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<PickedAddress>(emptyAddress);
  const [orderNo, setOrderNo] = useState("");

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(OPEN_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    setOpen((o) => {
      try {
        localStorage.setItem(OPEN_KEY, o ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !o;
    });
  };

  const addr = addresses.find((a) => a.id === activeAddress) ?? addresses[0];

  // চলমান ডেলিভারি — রাইডারের লাইভ অবস্থান
  const { data: live, refetch } = useQuery({
    queryKey: ["live-deliveries", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("deliveries")
        .select("id, order_no, status, last_lat, last_lng, last_seen_at, eta_minutes, riders(name, phone)")
        .neq("status", "delivered")
        .neq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(3);
      return (data ?? []) as unknown as LiveDelivery[];
    },
  });

  useEffect(() => {
    if (!user || !open) return;
    const ch = supabase
      .channel("deliver-bar")
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, () => void refetch())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user, open, refetch]);

  const save = () => {
    if (!draft.district && !draft.details) return;
    addAddress({
      label: t("ঠিকানা", "Address"),
      area: [draft.area, draft.thana, draft.district].filter(Boolean).join(", ") || formatAddress(draft, t.en),
      details: draft.details,
      phone: "",
      district: draft.district,
      cityZone: draft.cityZone,
      thana: draft.thana,
      lat: draft.lat,
      lng: draft.lng,
    });
    setDraft(emptyAddress);
    setAdding(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex max-w-[190px] items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1.5 text-[11px] text-navy hover:border-primary"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate">{addr ? addr.area : t("ঠিকানা যোগ করুন", "Add address")}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>


      {open && (
        <>
          <button
            type="button"
            aria-label={t("বন্ধ", "Close")}
            onClick={toggle}
            className="fixed inset-0 z-30 cursor-default bg-navy/20"
          />
          <div className="absolute left-2 right-2 top-full z-40 mt-1 max-h-[70vh] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card px-4 py-3 shadow-xl sm:left-4 sm:right-auto sm:w-[420px]">
          <p className="text-[11px] font-bold text-navy">{t("ডেলিভারি ঠিকানা", "Delivery address")}</p>
          <ul className="mt-2 space-y-1.5">
            {addresses.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveAddress(a.id)}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] ${
                    a.id === (addr?.id ?? "") ? "border-primary bg-secondary" : "border-border"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-navy">{a.area}</span>
                    {a.details && <span className="block truncate text-muted-foreground">{a.details}</span>}
                  </span>
                  {a.id === (addr?.id ?? "") && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
                {addresses.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAddress(a.id)}
                    aria-label={t("মুছুন", "Remove")}
                    className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {adding ? (
            <div className="mt-3 rounded-xl border border-border p-3">
              <AddressPicker value={draft} onChange={setDraft} compact />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={save}
                  className="rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground"
                >
                  {t("ঠিকানা সংরক্ষণ", "Save address")}
                </button>
                <button type="button" onClick={() => setAdding(false)} className="px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                  {t("বাতিল", "Cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-primary px-3 py-2 text-[11px] font-semibold text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> {t("জিপিএস দিয়ে নতুন ঠিকানা", "Add address with GPS")}
            </button>
          )}

          {/* রাইডার লাইভ ট্র্যাকিং */}
          <p className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-navy">
            <Truck className="h-3.5 w-3.5 text-primary" /> {t("রাইডার লাইভ ট্র্যাকিং", "Live rider tracking")}
          </p>

          {user && live && live.length > 0 ? (
            <div className="mt-2 space-y-3">
              {live.map((d) => (
                <div key={d.id} className="rounded-xl border border-border p-2.5">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-bold text-navy">#{d.order_no}</span>
                    <span className="text-muted-foreground">
                      {t(DELIVERY_STATUS[d.status]?.bn ?? d.status, DELIVERY_STATUS[d.status]?.en ?? d.status)}
                      {d.riders?.name ? ` · ${d.riders.name}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => void navigate({ to: "/track/$no", params: { no: d.order_no } })}
                      className="ml-auto flex items-center gap-1 font-semibold text-primary"
                    >
                      <Navigation className="h-3 w-3" /> {t("ট্র্যাক", "Track")}
                    </button>
                  </div>
                  {d.last_lat != null && d.last_lng != null ? (
                    <LiveMap riderLat={Number(d.last_lat)} riderLng={Number(d.last_lng)} lastSeen={d.last_seen_at} />
                  ) : (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {t("রাইডার লোকেশন শেয়ার করলে ম্যাপ দেখা যাবে।", "Map appears once the rider shares location.")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2">
              <div className="flex gap-2">
                <input
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  placeholder={t("অর্ডার নম্বর", "Order number")}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[11px]"
                />
                <button
                  type="button"
                  disabled={!orderNo.trim()}
                  onClick={() => void navigate({ to: "/track/$no", params: { no: orderNo.trim() } })}
                  className="rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
                >
                  {t("লাইভ ট্র্যাক", "Live track")}
                </button>
              </div>
              {!user && (
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  {t("চলমান অর্ডারের রাইডার ম্যাপে দেখতে ", "To see your rider on the map, ")}
                  <button
                    type="button"
                    onClick={() => void navigate({ to: "/auth" })}
                    className="font-semibold text-primary underline"
                  >
                    {t("লগইন করুন", "log in")}
                  </button>
                  {t("।", ".")}
                </p>
              )}
            </div>
          )}
          </div>
        </>
      )}
    </div>
  );
}
