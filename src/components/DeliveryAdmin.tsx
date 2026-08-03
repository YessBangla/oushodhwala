import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Truck, Bike, Plus, Trash2, Send, Search, Share2, Wifi, Check, FlaskConical, RotateCcw, XCircle,
  Link2, ShieldCheck, Timer, Map as MapIcon, Bell, BellOff,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";
import { DELIVERY_STATUS, fmtTime } from "@/lib/delivery";
import { copyTrackLink } from "@/lib/track-link";
import { CHANNEL_LABEL, notifyLink, withAbsoluteLinks, type NotifyChannel } from "@/lib/notify";
import { RouteMap, type PathPoint } from "@/components/RouteMap";
import { enablePush, disablePush, notifyPush, pushEnabled, pushSupported } from "@/lib/webpush";

type Delivery = {
  id: string;
  order_id: string;
  order_no: string;
  status: string;
  otp: string;
  rider_id: string | null;
  eta_minutes: number;
  public_token: string;
  token_expires_at: string | null;
  token_revoked: boolean;
  token_scope: string;
  last_lat: number | null;
  last_lng: number | null;
  last_seen_at: string | null;
  pod_photo_url: string;
  pod_signature_url: string;
  pod_receiver_name: string;
  riders: { name: string; phone: string } | null;
};


type Rider = { id: string; name: string; phone: string; vehicle: string; zone: string; active: boolean; user_id: string | null };

type OrderRow = {
  id: string;
  order_no: string;
  customer_name: string;
  phone: string;
  address: string;
  area: string | null;
  thana: string | null;
  total: number;
  status: string;
  created_at: string;
};

type Notif = {
  id: string;
  order_no: string;
  channel: string;
  target: string;
  status_key: string;
  body: string;
  status: string;
  created_at: string;
};

export function DeliveryAdmin() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"deliveries" | "riders" | "notifications" | "demo">("deliveries");
  const [live, setLive] = useState(false);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fArea, setFArea] = useState("all");
  const [fPriority, setFPriority] = useState<"all" | "unassigned" | "active" | "urgent">("all");
  const [copied, setCopied] = useState("");
  const [openRow, setOpenRow] = useState("");
  const [push, setPush] = useState(false);

  useEffect(() => setPush(pushEnabled()), []);


  const { data: riders = [] } = useQuery({
    queryKey: ["admin-riders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("riders").select("*").order("created_at");
      if (error) throw error;
      return data as Rider[];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-deliverable-orders"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_no, customer_name, phone, address, area, thana, total, status, created_at")
        .in("status", ["confirmed", "processing", "shipped"])
        .order("created_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return data as unknown as OrderRow[];
    },
  });

  const { data: deliveries = [], dataUpdatedAt } = useQuery({
    queryKey: ["admin-deliveries"],
    // পোলিং — রিয়েল-টাইম বন্ধ থাকলেও প্রতি ১৫ সেকেন্ডে স্ট্যাটাস/ETA হালনাগাদ হয়
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("*, riders(name, phone)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as Delivery[];
    },
  });

  // রিয়েল-টাইম (WebSocket) সিঙ্ক
  useEffect(() => {
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ["admin-deliveries"] });
      void qc.invalidateQueries({ queryKey: ["admin-deliverable-orders"] });
    };
    const ch = supabase
      .channel("admin-delivery-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_events" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refresh)
      .subscribe((s) => setLive(s === "SUBSCRIBED"));
    return () => {
      setLive(false);
      void supabase.removeChannel(ch);
    };
  }, [qc]);

  // স্ট্যাটাস বা ETA বদলালে অ্যাডমিনকে ব্রাউজার নোটিফিকেশন
  const prevRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const prev = prevRef.current;
    const next = new Map<string, string>();
    deliveries.forEach((d) => {
      const key = `${d.status}|${d.eta_minutes}`;
      next.set(d.id, key);
      const old = prev.get(d.id);
      if (prev.size > 0 && old && old !== key) {
        notifyPush(
          `#${d.order_no} — ${DELIVERY_STATUS[d.status]?.bn ?? d.status}`,
          `ETA ${bn(d.eta_minutes)} মিনিট${d.riders?.name ? ` · ${d.riders.name}` : ""}`,
        );
      }
    });
    prevRef.current = next;
  }, [deliveries]);

  const byOrder = useMemo(() => new Map(deliveries.map((d) => [d.order_id, d])), [deliveries]);


  const areaOf = (o: OrderRow) => (o.area || o.thana || (o.address ?? "").split(",")[0] || "").trim();
  const areas = Array.from(new Set(orders.map(areaOf).filter(Boolean))).sort();

  const term = q.trim().toLowerCase();
  const list = orders.filter((o) => {
    const d = byOrder.get(o.id);
    if (term) {
      const hay = [o.order_no, o.customer_name, o.phone, o.address, areaOf(o), d?.riders?.name ?? ""].join(" ").toLowerCase();
      if (!hay.includes(term)) return false;
    }
    if (fStatus !== "all" && (d?.status ?? "unassigned") !== fStatus) return false;
    if (fArea !== "all" && areaOf(o) !== fArea) return false;
    if (fPriority === "unassigned" && d) return false;
    if (fPriority === "active" && (!d || ["delivered", "failed"].includes(d.status))) return false;
    if (fPriority === "urgent" && !(d && (["arrived", "on_the_way"].includes(d.status) || Number(d.eta_minutes) <= 20))) return false;
    return true;
  });
  const filtering = term !== "" || fStatus !== "all" || fArea !== "all" || fPriority !== "all";

  const assign = async (orderId: string, riderId: string) => {
    const { error } = await supabase.rpc("admin_assign_delivery", { _order_id: orderId, _rider_id: riderId, _eta: 45 });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("ডেলিভারিম্যান নিয়োগ হয়েছে");
    void qc.invalidateQueries({ queryKey: ["admin-deliveries"] });
  };

  const force = async (deliveryId: string, status: string) => {
    const { error } = await supabase.rpc("rider_update_delivery", { _delivery_id: deliveryId, _status: status, _note: "অ্যাডমিন কর্তৃক আপডেট" });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("আপডেট হয়েছে");
    void qc.invalidateQueries({ queryKey: ["admin-deliveries"] });
    void qc.invalidateQueries({ queryKey: ["admin-deliverable-orders"] });
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {([
          { id: "deliveries", t: "ডেলিভারি", icon: Truck },
          { id: "riders", t: "ডেলিভারিম্যান", icon: Bike },
          { id: "notifications", t: "নোটিফিকেশন", icon: Send },
          { id: "demo", t: "ডেমো কন্ট্রোল", icon: FlaskConical },
        ] as const).map((x) => (
          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === x.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            <x.icon className="h-3.5 w-3.5" /> {x.t}
          </button>
        ))}
        {pushSupported() && (
          <button
            onClick={async () => {
              if (push) {
                disablePush();
                setPush(false);
                return;
              }
              const ok = await enablePush();
              setPush(ok);
              if (!ok) toast.error("ব্রাউজার নোটিফিকেশনের অনুমতি পাওয়া যায়নি");
            }}
            className={`ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${push ? "bg-secondary text-primary-dark" : "bg-muted"}`}
          >
            {push ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            {push ? "পুশ অ্যালার্ট চালু" : "পুশ অ্যালার্ট"}
          </button>
        )}
        <span className={`flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground ${pushSupported() ? "" : "ml-auto"}`}>
          <Wifi className={`h-3.5 w-3.5 ${live ? "text-primary" : ""}`} />
          {live ? "লাইভ সিঙ্ক চালু" : "প্রতি ১৫ সেকেন্ডে রিফ্রেশ"}
          {dataUpdatedAt > 0 && ` · সর্বশেষ ${fmtTime(new Date(dataUpdatedAt).toISOString())}`}
        </span>

      </div>

      {tab === "deliveries" && (
        <>
          {/* ফিল্টার ও সার্চ */}
          <div className="mb-3 rounded-xl border border-border bg-card p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="অর্ডার নম্বর, গ্রাহক, ফোন, ঠিকানা বা ডেলিভারিম্যান খুঁজুন"
                className="min-h-10 w-full rounded-lg border border-border bg-muted pl-9 pr-3 text-xs outline-none focus:border-primary"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="min-h-9 rounded-lg border border-border bg-card px-2 font-semibold" aria-label="অবস্থা">
                <option value="all">সব অবস্থা</option>
                {["unassigned", "assigned", "picked", "on_the_way", "arrived", "delivered", "failed"].map((s) => (
                  <option key={s} value={s}>
                    {DELIVERY_STATUS[s]?.bn ?? s}
                  </option>
                ))}
              </select>
              <select value={fArea} onChange={(e) => setFArea(e.target.value)} className="min-h-9 rounded-lg border border-border bg-card px-2 font-semibold" aria-label="এলাকা">
                <option value="all">সব এলাকা</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <select
                value={fPriority}
                onChange={(e) => setFPriority(e.target.value as typeof fPriority)}
                className="min-h-9 rounded-lg border border-border bg-card px-2 font-semibold"
                aria-label="অগ্রাধিকার"
              >
                <option value="all">সব অগ্রাধিকার</option>
                <option value="unassigned">ডেলিভারিম্যান নেই</option>
                <option value="active">চলমান</option>
                <option value="urgent">জরুরি (ETA ≤ ২০ মিনিট / পথে)</option>
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
                  ফিল্টার মুছুন
                </button>
              )}
              <span className="ml-auto self-center text-[10px] text-muted-foreground">
                {bn(list.length)}
                {filtering ? `/${bn(orders.length)}` : ""} টি অর্ডার
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">অর্ডার</th>
                  <th className="px-3 py-2">গ্রাহক</th>
                  <th className="px-3 py-2">ঠিকানা</th>
                  <th className="px-3 py-2">ডেলিভারিম্যান</th>
                  <th className="px-3 py-2">অবস্থা</th>
                  <th className="px-3 py-2">ওটিপি</th>
                  <th className="px-3 py-2">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => {
                  const d = byOrder.get(o.id);
                  return (
                    <Fragment key={o.id}>
                    <tr className="border-t border-border align-top">
                      <td className="px-3 py-2 font-bold">
                        #{o.order_no}
                        {d && (
                          <button
                            onClick={() => {
                              void copyTrackLink(d.public_token);
                              setCopied(d.id);
                              setTimeout(() => setCopied(""), 2000);
                            }}
                            className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-primary"
                          >
                            <Share2 className="h-3 w-3" /> {copied === d.id ? "কপি হয়েছে" : "ট্র্যাকিং লিংক"}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {o.customer_name}
                        <span className="block text-[10px] text-muted-foreground">{o.phone}</span>
                      </td>
                      <td className="max-w-[220px] px-3 py-2 text-[11px] text-muted-foreground">{o.address}</td>
                      <td className="px-3 py-2">
                        <select
                          value={d?.rider_id ?? ""}
                          onChange={(e) => e.target.value && void assign(o.id, e.target.value)}
                          className="rounded-lg border border-border bg-card px-2 py-1 text-[11px]"
                        >
                          <option value="">— নির্বাচন করুন —</option>
                          {riders.filter((r) => r.active).map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.phone})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        {d ? (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary-dark">
                            {DELIVERY_STATUS[d.status]?.bn ?? d.status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                        {d?.eta_minutes ? <span className="block text-[10px] text-muted-foreground">ETA {bn(d.eta_minutes)} মিনিট</span> : null}
                        {d?.last_seen_at && <span className="block text-[10px] text-muted-foreground">{fmtTime(String(d.last_seen_at))}</span>}
                        {(d?.pod_photo_url || d?.pod_signature_url) && (
                          <span className="mt-0.5 block text-[10px] font-semibold text-primary">
                            ✓ প্রমাণ সংরক্ষিত{d?.pod_receiver_name ? ` · ${d.pod_receiver_name}` : ""}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-2 font-mono text-[11px]">{d?.otp ?? "—"}</td>
                      <td className="px-3 py-2">
                        {d && (
                          <div className="flex flex-col gap-1">
                            <select
                              value=""
                              onChange={(e) => e.target.value && void force(d.id, e.target.value)}
                              className="rounded-lg border border-border bg-card px-2 py-1 text-[11px]"
                            >
                              <option value="">অবস্থা বদলান</option>
                              {["picked", "on_the_way", "arrived", "delivered", "failed"].map((s) => (
                                <option key={s} value={s}>
                                  {DELIVERY_STATUS[s]?.bn ?? s}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => setOpenRow(openRow === d.id ? "" : d.id)}
                              className="flex items-center gap-1 text-[10px] font-semibold text-primary"
                            >
                              <MapIcon className="h-3 w-3" /> {openRow === d.id ? "বন্ধ করুন" : "ম্যাপ ও লিংক"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {d && openRow === d.id && (
                      <tr className="border-t border-border bg-muted/40">
                        <td colSpan={7} className="px-3 py-3">
                          <DeliveryDetail delivery={d} />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );

                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      {filtering ? "এই ফিল্টারে কোনো অর্ডার নেই।" : "ডেলিভারির জন্য কোনো অর্ডার নেই।"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "riders" && <Riders riders={riders} />}
      {tab === "notifications" && <NotificationQueue />}
      {tab === "demo" && <DemoControls deliveries={deliveries} riders={riders} />}
    </div>
  );
}

/** এক ডেলিভারির রুট/মুভমেন্ট ম্যাপ, ETA এবং ট্র্যাকিং লিংক নিয়ন্ত্রণ */
function DeliveryDetail({ delivery }: { delivery: Delivery }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState("");
  const [eta, setEta] = useState(String(delivery.eta_minutes ?? ""));
  const [hours, setHours] = useState("48");
  const [scope, setScope] = useState(delivery.token_scope || "public");

  const { data: path = [] } = useQuery({
    queryKey: ["delivery-path", delivery.id],
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_events")
        .select("lat, lng, created_at")
        .eq("delivery_id", delivery.id)
        .not("lat", "is", null)
        .order("created_at");
      if (error) throw error;
      const pts = (data ?? [])
        .filter((r) => r.lat != null && r.lng != null)
        .map((r) => ({ lat: Number(r.lat), lng: Number(r.lng), at: r.created_at as string }));
      if (delivery.last_lat != null && delivery.last_lng != null) {
        pts.push({ lat: Number(delivery.last_lat), lng: Number(delivery.last_lng), at: delivery.last_seen_at ?? "" });
      }
      return pts as PathPoint[];
    },
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-deliveries"] });

  const saveEta = async () => {
    const n = Number(eta);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("সঠিক ETA দিন");
      return;
    }
    setBusy("eta");
    const { error } = await supabase.rpc("admin_set_delivery_eta", { _delivery_id: delivery.id, _eta: Math.round(n) });
    setBusy("");
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("ETA হালনাগাদ হয়েছে — গ্রাহককে নোটিফিকেশন পাঠানো হয়েছে");
    refresh();
  };

  const setLink = async (args: { _hours?: number; _revoked?: boolean; _rotate?: boolean; _scope?: string }, msg: string) => {
    setBusy("link");
    const { error } = await supabase.rpc("admin_set_track_link", { _delivery_id: delivery.id, ...args });
    setBusy("");
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(msg);
    refresh();
  };

  const expired = delivery.token_expires_at ? new Date(delivery.token_expires_at).getTime() < Date.now() : false;

  return (
    <div className="space-y-3">
      <RouteMap path={path} lastSeen={delivery.last_seen_at} height="h-56" />

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="flex items-center gap-1 font-bold text-navy">
          <Timer className="h-3.5 w-3.5 text-primary" /> ETA
        </span>
        <input
          value={eta}
          onChange={(e) => setEta(e.target.value)}
          inputMode="numeric"
          className="min-h-9 w-20 rounded-lg border border-border bg-card px-2 text-center"
          aria-label="ETA মিনিট"
        />
        <span className="text-muted-foreground">মিনিট</span>
        <button
          onClick={() => void saveEta()}
          disabled={busy === "eta"}
          className="min-h-9 rounded-lg bg-primary px-3 font-semibold text-primary-foreground disabled:opacity-60"
        >
          সংরক্ষণ ও নোটিফাই
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <p className="flex items-center gap-1.5 text-xs font-bold">
          <Link2 className="h-3.5 w-3.5 text-primary" /> শেয়ারেবল ট্র্যাকিং লিংক
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          অবস্থা:{" "}
          <strong className={delivery.token_revoked || expired ? "text-destructive" : "text-primary"}>
            {delivery.token_revoked ? "বাতিল করা হয়েছে" : expired ? "মেয়াদোত্তীর্ণ" : "সক্রিয়"}
          </strong>
          {delivery.token_expires_at ? ` · মেয়াদ ${fmtTime(delivery.token_expires_at)}` : " · মেয়াদহীন"} ·{" "}
          {delivery.token_scope === "staff" ? "শুধু স্টাফ" : delivery.token_scope === "authenticated" ? "লগইন করা ব্যবহারকারী" : "সবার জন্য উন্মুক্ত"}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="min-h-9 rounded-lg border border-border bg-muted px-2" aria-label="অ্যাক্সেস">
            <option value="public">সবার জন্য উন্মুক্ত</option>
            <option value="authenticated">লগইন করা ব্যবহারকারী</option>
            <option value="staff">শুধু স্টাফ</option>
          </select>
          <select value={hours} onChange={(e) => setHours(e.target.value)} className="min-h-9 rounded-lg border border-border bg-muted px-2" aria-label="মেয়াদ">
            <option value="6">৬ ঘণ্টা</option>
            <option value="24">২৪ ঘণ্টা</option>
            <option value="48">৪৮ ঘণ্টা</option>
            <option value="168">৭ দিন</option>
            <option value="0">মেয়াদহীন</option>
          </select>
          <button
            onClick={() => void setLink({ _hours: Number(hours), _scope: scope, _revoked: false }, "লিংক সেটিংস সংরক্ষিত হয়েছে")}
            disabled={busy === "link"}
            className="flex min-h-9 items-center gap-1 rounded-lg bg-primary px-3 font-semibold text-primary-foreground disabled:opacity-60"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> প্রয়োগ করুন
          </button>
          <button
            onClick={() => void copyTrackLink(delivery.public_token)}
            className="flex min-h-9 items-center gap-1 rounded-lg bg-muted px-3 font-semibold"
          >
            <Share2 className="h-3.5 w-3.5 text-primary" /> লিংক কপি
          </button>
          <button
            onClick={() => void setLink({ _rotate: true }, "নতুন লিংক তৈরি হয়েছে — পুরোনো লিংক আর কাজ করবে না")}
            disabled={busy === "link"}
            className="flex min-h-9 items-center gap-1 rounded-lg bg-muted px-3 font-semibold disabled:opacity-60"
          >
            <RotateCcw className="h-3.5 w-3.5" /> নতুন লিংক
          </button>
          <button
            onClick={() => void setLink({ _revoked: !delivery.token_revoked }, delivery.token_revoked ? "লিংক আবার চালু হয়েছে" : "লিংক বাতিল হয়েছে")}
            disabled={busy === "link"}
            className={`flex min-h-9 items-center gap-1 rounded-lg px-3 font-semibold disabled:opacity-60 ${delivery.token_revoked ? "bg-secondary text-primary-dark" : "bg-destructive/10 text-destructive"}`}
          >
            <XCircle className="h-3.5 w-3.5" /> {delivery.token_revoked ? "পুনরায় চালু" : "লিংক বাতিল"}
          </button>
        </div>
      </div>
    </div>
  );
}



/** ডেমো ডাটা কন্ট্রোল — mock ডেলিভারি অর্ডার তৈরি, বাতিল ও রিসেট */
function DemoControls({ deliveries, riders }: { deliveries: Delivery[]; riders: Rider[] }) {
  const qc = useQueryClient();
  const [zone, setZone] = useState("");
  const [count, setCount] = useState(1);
  const [scenario, setScenario] = useState("mixed");
  const [busy, setBusy] = useState("");

  const zones = Array.from(new Set(riders.map((r) => r.zone).filter(Boolean)));
  const demo = deliveries.filter((d) => d.order_no.startsWith("OWDEMO"));

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-deliveries"] });
    void qc.invalidateQueries({ queryKey: ["admin-deliverable-orders"] });
  };

  const create = async () => {
    setBusy("create");
    const { data, error } = await supabase.rpc("demo_seed_bulk", { _zone: zone, _count: count, _scenario: scenario });
    setBusy("");
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${bn(Number(data ?? count))} টি ডেমো ডেলিভারি তৈরি হয়েছে`);
    refresh();
  };

  const cancelAll = async () => {
    const open = demo.filter((d) => !["delivered", "failed"].includes(d.status));
    if (open.length === 0) {
      toast.info("বাতিল করার মতো চলমান ডেমো ডেলিভারি নেই");
      return;
    }
    setBusy("cancel-all");
    for (const d of open) {
      const { error } = await supabase.rpc("demo_cancel_delivery", { _delivery_id: d.id });
      if (error) {
        setBusy("");
        toast.error(error.message);
        return;
      }
    }
    setBusy("");
    toast.success(`${bn(open.length)} টি ডেমো ডেলিভারি বাতিল হয়েছে`);
    refresh();
  };


  const cancel = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.rpc("demo_cancel_delivery", { _delivery_id: id });
    setBusy("");
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("ডেলিভারি বাতিল হয়েছে");
    refresh();
  };

  const reset = async () => {
    if (!window.confirm("সব ডেমো ডেলিভারি ডাটা মুছে ফেলা হবে। নিশ্চিত?")) return;
    setBusy("reset");
    const { data, error } = await supabase.rpc("demo_reset_deliveries");
    setBusy("");
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${bn(Number(data ?? 0))} টি ডেমো অর্ডার মুছে ফেলা হয়েছে`);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold">
          <FlaskConical className="h-3.5 w-3.5 text-primary" /> নতুন ডেমো ডেলিভারি অর্ডার
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          পরীক্ষার জন্য mock অর্ডার তৈরি হবে (অর্ডার নম্বর OWDEMO…) এবং সক্রিয় ডেলিভারিম্যানের কাছে স্বয়ংক্রিয়ভাবে নিয়োগ হবে।
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <select value={zone} onChange={(e) => setZone(e.target.value)} className="min-h-9 rounded-lg border border-border bg-muted px-2" aria-label="এলাকা">
            <option value="">যেকোনো এলাকা</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="min-h-9 rounded-lg border border-border bg-muted px-2"
            aria-label="সংখ্যা"
          >
            {[1, 3, 5].map((c) => (
              <option key={c} value={c}>
                {bn(c)} টি
              </option>
            ))}
          </select>
          <button
            onClick={() => void create()}
            disabled={busy === "create"}
            className="flex min-h-9 items-center gap-1 rounded-lg bg-primary px-3 font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" /> তৈরি করুন
          </button>
          <button
            onClick={() => void reset()}
            disabled={busy === "reset"}
            className="ml-auto flex min-h-9 items-center gap-1 rounded-lg bg-destructive/10 px-3 font-semibold text-destructive disabled:opacity-60"
          >
            <RotateCcw className="h-3.5 w-3.5" /> ডেমো ডাটা রিসেট
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">অর্ডার</th>
              <th className="px-3 py-2">ডেলিভারিম্যান</th>
              <th className="px-3 py-2">অবস্থা</th>
              <th className="px-3 py-2">ট্র্যাকিং</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {demo.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="px-3 py-2 font-bold">#{d.order_no}</td>
                <td className="px-3 py-2">{d.riders?.name ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary-dark">
                    {DELIVERY_STATUS[d.status]?.bn ?? d.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => void copyTrackLink(d.public_token)} className="flex items-center gap-1 text-[10px] font-semibold text-primary">
                    <Share2 className="h-3 w-3" /> লিংক কপি
                  </button>
                </td>
                <td className="px-3 py-2">
                  {!["delivered", "failed"].includes(d.status) && (
                    <button
                      onClick={() => void cancel(d.id)}
                      disabled={busy === d.id}
                      className="flex items-center gap-1 text-[10px] font-semibold text-destructive disabled:opacity-60"
                    >
                      <XCircle className="h-3.5 w-3.5" /> বাতিল
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {demo.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  এখনো কোনো ডেমো ডেলিভারি নেই।
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function NotificationQueue() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"queued" | "sent" | "all">("queued");

  const { data: rows = [] } = useQuery({
    queryKey: ["admin-delivery-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_notifications")
        .select("id, order_no, channel, target, status_key, body, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Notif[];
    },
  });

  const list = rows.filter((r) => filter === "all" || r.status === filter);

  const markSent = async (id: string) => {
    const { error } = await supabase
      .from("delivery_notifications")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-delivery-notifications"] });
  };

  const send = (n: Notif) => {
    const url = notifyLink(n.channel as NotifyChannel, n.target, withAbsoluteLinks(n.body));
    window.open(url, "_blank", "noopener");
    void markSent(n.id);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["queued", "sent", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            {f === "queued" ? "পাঠানো বাকি" : f === "sent" ? "পাঠানো হয়েছে" : "সব"} ({bn(rows.filter((r) => f === "all" || r.status === f).length)})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {list.map((n) => (
          <div key={n.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">{CHANNEL_LABEL[n.channel as NotifyChannel]?.emoji ?? "🔔"}</span>
              <span className="text-xs font-bold">#{n.order_no}</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary-dark">
                {CHANNEL_LABEL[n.channel as NotifyChannel]?.bn ?? n.channel}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {DELIVERY_STATUS[n.status_key]?.bn ?? n.status_key} · {n.target || "—"} · {fmtTime(n.created_at)}
              </span>
              <span className="ml-auto flex gap-1.5">
                {n.status === "queued" ? (
                  <>
                    <button
                      onClick={() => send(n)}
                      disabled={!n.target}
                      className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      <Send className="h-3 w-3" /> পাঠান
                    </button>
                    <button onClick={() => void markSent(n.id)} className="rounded-lg bg-muted px-2.5 py-1.5 text-[11px] font-semibold">
                      সম্পন্ন চিহ্নিত
                    </button>
                  </>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                    <Check className="h-3 w-3" /> পাঠানো হয়েছে
                  </span>
                )}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{n.body}</p>
          </div>
        ))}
        {list.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">কোনো বার্তা নেই।</p>}
      </div>
    </div>
  );
}


function Riders({ riders }: { riders: Rider[] }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", phone: "", vehicle: "bike", zone: "", user_id: "" });

  const add = async () => {
    if (!f.name.trim() || !f.phone.trim()) {
      toast.error("নাম ও ফোন দিন");
      return;
    }
    const { error } = await supabase.from("riders").insert({
      name: f.name,
      phone: f.phone,
      vehicle: f.vehicle,
      zone: f.zone,
      ...(f.user_id.trim() ? { user_id: f.user_id.trim() } : {}),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("ডেলিভারিম্যান যুক্ত হয়েছে");
    setF({ name: "", phone: "", vehicle: "bike", zone: "", user_id: "" });
    void qc.invalidateQueries({ queryKey: ["admin-riders"] });
  };

  const toggle = async (r: Rider) => {
    const { error } = await supabase.from("riders").update({ active: !r.active }).eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-riders"] });
  };

  const del = async (r: Rider) => {
    const { error } = await supabase.from("riders").delete().eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-riders"] });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-2 text-xs font-bold">নতুন ডেলিভারিম্যান</p>
        <div className="grid gap-2 sm:grid-cols-5">
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="নাম" className="rounded-lg border border-border bg-muted px-2 py-2 text-xs" />
          <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="ফোন" className="rounded-lg border border-border bg-muted px-2 py-2 text-xs" />
          <select value={f.vehicle} onChange={(e) => setF({ ...f, vehicle: e.target.value })} className="rounded-lg border border-border bg-muted px-2 py-2 text-xs">
            <option value="bike">মোটরসাইকেল</option>
            <option value="cycle">সাইকেল</option>
            <option value="van">ভ্যান</option>
            <option value="foot">পায়ে হেঁটে</option>
          </select>
          <input value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })} placeholder="এলাকা" className="rounded-lg border border-border bg-muted px-2 py-2 text-xs" />
          <input value={f.user_id} onChange={(e) => setF({ ...f, user_id: e.target.value })} placeholder="ইউজার আইডি (লগইনের জন্য)" className="rounded-lg border border-border bg-muted px-2 py-2 text-xs" />
        </div>
        <button onClick={() => void add()} className="mt-2 flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> যুক্ত করুন
        </button>
        <p className="mt-2 text-[10px] text-muted-foreground">
          ডেলিভারিম্যান /delivery প্যানেলে লগইন করতে হলে তার একাউন্টের ইউজার আইডি এখানে দিন।
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">নাম</th>
              <th className="px-3 py-2">ফোন</th>
              <th className="px-3 py-2">বাহন</th>
              <th className="px-3 py-2">এলাকা</th>
              <th className="px-3 py-2">সক্রিয়</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {riders.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 font-semibold">{r.name}</td>
                <td className="px-3 py-2">{r.phone}</td>
                <td className="px-3 py-2">{r.vehicle}</td>
                <td className="px-3 py-2">{r.zone || "—"}</td>
                <td className="px-3 py-2">
                  <button onClick={() => void toggle(r)} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.active ? "bg-secondary text-primary-dark" : "bg-muted text-muted-foreground"}`}>
                    {r.active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => void del(r)} className="text-destructive" aria-label="মুছুন">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {riders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  এখনো কোনো ডেলিভারিম্যান যুক্ত হয়নি। মোট: {bn(0)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** শুধু ডেলিভারিম্যান ম্যানেজমেন্ট (অ্যাডমিন সাইডবারে আলাদা ট্যাব) */
export function RidersAdmin() {
  const { data: riders = [] } = useQuery({
    queryKey: ["admin-riders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("riders").select("*").order("created_at");
      if (error) throw error;
      return data as Rider[];
    },
  });
  return <Riders riders={riders} />;
}
