import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "নোটিফিকেশন — ঔষধওয়ালা" },
      { name: "description", content: "অর্ডার আপডেট, অফার ও ঔষধ রিমাইন্ডার সংক্রান্ত সব নোটিফিকেশন।" },
      { property: "og:title", content: "নোটিফিকেশন — ঔষধওয়ালা" },
      { property: "og:description", content: "আপনার অর্ডার ও অফারের সর্বশেষ আপডেট।" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: Notifications,
});

const ICON: Record<string, string> = {
  order: "🚚",
  offer: "🎟️",
  lab: "🧪",
  diagnostic: "🧪",
  appointment: "🩺",
  service: "🏠",
  system: "🔔",
};

const FILTERS = [
  { key: "all", bn: "সব", en: "All" },
  { key: "order", bn: "ডেলিভারি", en: "Delivery" },
  { key: "appointment", bn: "কনসালটেশন", en: "Consultation" },
  { key: "service", bn: "হোম সার্ভিস", en: "Home service" },
] as const;

function Notifications() {
  const t = useT();
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data } = useQuery({
    queryKey: ["my-notifications"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // রিয়েল-টাইম — স্ট্যাটাস বদলালেই নতুন নোটিফিকেশন চলে আসবে
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("my-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () =>
        qc.invalidateQueries({ queryKey: ["my-notifications"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user, qc]);

  const unread = (data ?? []).filter((n) => !n.read).map((n) => n.id);

  useEffect(() => {
    if (unread.length === 0) return;
    void supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unread)
      .then(() => qc.invalidateQueries({ queryKey: ["my-notifications"] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread.join(",")]);

  if (loading) return <p className="pt-16 text-center text-sm text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>;

  if (!user) {
    return (
      <div className="pt-16 text-center">
        <p className="text-4xl">🔔</p>
        <h1 className="mt-3 text-base font-bold">{t("নোটিফিকেশন দেখতে লগইন করুন", "Log in to view notifications")}</h1>
        <Link to="/auth" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          {t("লগইন করুন", "Log in")}
        </Link>
      </div>
    );
  }

  const items = (data ?? []).filter((n) => filter === "all" || n.kind === filter);

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">{t("নোটিফিকেশন", "Notifications")}</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
              filter === f.key ? "border-primary bg-secondary text-primary-dark" : "border-border text-muted-foreground"
            }`}
          >
            {t(f.bn, f.en)}
          </button>
        ))}
      </div>
      {items.length === 0 && <p className="mt-3 text-xs text-muted-foreground">{t("এখনো কোনো নোটিফিকেশন নেই।", "No notifications yet.")}</p>}
      <ul className="mt-3 space-y-2">
        {items.map((n) => (
          <li key={n.id} className={`flex gap-3 rounded-xl border bg-card p-3 ${n.read ? "border-border" : "border-primary"}`}>
            <span className="text-lg">{ICON[n.kind] ?? "🔔"}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold">{n.title}</p>
              <p className="text-[11px] text-muted-foreground">{n.body}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString(t.en ? "en-US" : "bn-BD")}</p>
              {n.kind === "order" && n.order_no && (
                <Link to="/track/$no" params={{ no: n.order_no }} className="mt-1 inline-block text-[10px] font-semibold text-primary">
                  {t("লাইভ ট্র্যাক", "Live track")} →
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
