import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Truck, Bike, Plus, Trash2, Send, Check } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";
import { DELIVERY_STATUS, fmtTime } from "@/lib/delivery";
import { CHANNEL_LABEL, notifyLink, withAbsoluteLinks, type NotifyChannel } from "@/lib/notify";

type Delivery = {
  id: string;
  order_id: string;
  order_no: string;
  status: string;
  otp: string;
  rider_id: string | null;
  last_seen_at: string | null;
  pod_photo_url: string;
  pod_signature_url: string;
  pod_receiver_name: string;
  riders: { name: string; phone: string } | null;
};

type Rider = { id: string; name: string; phone: string; vehicle: string; zone: string; active: boolean; user_id: string | null };

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
  const [tab, setTab] = useState<"deliveries" | "riders" | "notifications">("deliveries");


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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_no, customer_name, phone, address, total, status, created_at")
        .in("status", ["confirmed", "processing", "shipped"])
        .order("created_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return data;
    },
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["admin-deliveries"],
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

  const byOrder = new Map(deliveries.map((d) => [d.order_id, d]));

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
      <div className="mb-4 flex gap-2">
        {([
          { id: "deliveries", t: "ডেলিভারি", icon: Truck },
          { id: "riders", t: "ডেলিভারিম্যান", icon: Bike },
          { id: "notifications", t: "নোটিফিকেশন", icon: Send },
        ] as const).map((x) => (

          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === x.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            <x.icon className="h-3.5 w-3.5" /> {x.t}
          </button>
        ))}
      </div>

      {tab === "deliveries" && (
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
              {orders.map((o) => {
                const d = byOrder.get(o.id);
                return (
                  <tr key={o.id} className="border-t border-border align-top">
                    <td className="px-3 py-2 font-bold">#{o.order_no}</td>
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
                      )}
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                    ডেলিভারির জন্য কোনো অর্ডার নেই।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "riders" && <Riders riders={riders} />}
      {tab === "notifications" && <NotificationQueue />}
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
