import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, MapPin, FileText, Heart, Bell, HelpCircle, FlaskConical, ShieldCheck, CalendarDays } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "আমার একাউন্ট — ঔষধওয়ালা" },
      { name: "description", content: "প্রোফাইল, ঠিকানা, অর্ডার ইতিহাস ও প্রেসক্রিপশন ম্যানেজ করুন।" },
      { property: "og:title", content: "আমার একাউন্ট — ঔষধওয়ালা" },
      { property: "og:description", content: "আপনার প্রোফাইল ও ঠিকানা সেটিংস।" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: Account,
});

function Account() {
  const t = useT();
  const { addresses, addAddress, removeAddress, activeAddress, setActiveAddress, prescriptions, wishlist } = useStore();
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [addr, setAddr] = useState({ label: "", area: "", details: "", phone: "" });

  const { data: orderCount } = useQuery({
    queryKey: ["my-order-count"],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase.from("orders").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: apptCount } = useQuery({
    queryKey: ["my-appointment-count"],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase.from("appointments").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  if (loading) return <p className="pt-16 text-center text-sm text-muted-foreground">{t("লোড হচ্ছে...", "Loading...")}</p>;

  if (!user) {
    return (
      <div className="pt-16 text-center">
        <p className="text-4xl">👤</p>
        <h1 className="mt-3 text-base font-bold">{t("একাউন্টে প্রবেশ করুন", "Sign in to your account")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("অর্ডার, প্রেসক্রিপশন ও নোটিফিকেশন দেখতে লগইন করুন।", "Log in to view orders, prescriptions and notifications.")}</p>
        <Link to="/auth" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          {t("লগইন / রেজিস্ট্রেশন", "Login / Register")}
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-xl">👤</span>
        <div>
          <p className="text-sm font-bold">{profile?.name || user.email}</p>
          <p className="text-xs text-muted-foreground">{profile?.phone || user.email}</p>
        </div>
        <button onClick={() => { void (async () => { qc.clear(); await signOut(); void navigate({ to: "/" }); })(); }} className="ml-auto flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold">
          <LogOut className="h-3.5 w-3.5" /> {t("লগআউট", "Log out")}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={FileText} t={t("অর্ডার", "Orders")} v={t.n(orderCount ?? 0)} to="/orders" />
        <Stat icon={Heart} t={t("উইশলিস্ট", "Wishlist")} v={t.n(wishlist.length)} to="/wishlist" />
        <Stat icon={FileText} t={t("প্রেসক্রিপশন", "Prescriptions")} v={t.n(prescriptions.length)} to="/prescription" />
        <Stat icon={CalendarDays} t={t("অ্যাপয়েন্টমেন্ট", "Appointments")} v={t.n(apptCount ?? 0)} to="/appointments" />
        <Stat icon={FlaskConical} t={t("ল্যাব টেস্ট", "Lab test")} v={t("বুক", "Book")} to="/lab-test" />
      </div>


      <section className="mt-4 rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-2 text-sm font-bold"><MapPin className="h-4 w-4" /> {t("ঠিকানা", "Address")}</p>
        <div className="mt-2 space-y-2">
          {addresses.map((a) => (
            <div key={a.id} className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${activeAddress === a.id ? "border-primary" : "border-border"}`}>
              <input type="radio" checked={activeAddress === a.id} onChange={() => setActiveAddress(a.id)} className="mt-1" />
              <span>
                <span className="block font-semibold">{a.label} · {a.area}</span>
                <span className="block text-muted-foreground">{a.details} · {a.phone}</span>
              </span>
              <button onClick={() => removeAddress(a.id)} className="ml-auto text-muted-foreground">✕</button>
            </div>
          ))}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(["label", "area", "details", "phone"] as const).map((k) => (
            <input
              key={k}
              value={addr[k]}
              onChange={(e) => setAddr({ ...addr, [k]: e.target.value })}
              placeholder={{ label: t("লেবেল", "Label"), area: t("এলাকা, শহর", "Area, city"), details: t("রোড, বাড়ি", "Road, house"), phone: t("মোবাইল", "Mobile") }[k]}
              className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
            />
          ))}
        </div>
        <button
          onClick={() => {
            if (addr.area && addr.phone) {
              addAddress({ ...addr, label: addr.label || t("নতুন", "New") });
              setAddr({ label: "", area: "", details: "", phone: "" });
            }
          }}
          className="mt-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
        >
          {t("ঠিকানা যোগ করুন", "Add address")}
        </button>
      </section>

      <section className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card text-xs">
        {isAdmin && <Row to="/admin" icon={ShieldCheck} t={t("অ্যাডমিন প্যানেল", "Admin panel")} />}
        <Row to="/notifications" icon={Bell} t={t("নোটিফিকেশন", "Notifications")} />
        <Row to="/help" icon={HelpCircle} t={t("সহায়তা ও FAQ", "Help & FAQ")} />
        <Row to="/about" icon={FileText} t={t("আমাদের সম্পর্কে", "About us")} />
      </section>
    </div>
  );
}

function Stat({ icon: Icon, t, v, to }: { icon: typeof Heart; t: string; v: string; to: string }) {
  return (
    <Link to={to} className="rounded-xl border border-border bg-card p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <p className="mt-1 text-sm font-bold">{v}</p>
      <p className="text-[10px] text-muted-foreground">{t}</p>
    </Link>
  );
}

function Row({ to, icon: Icon, t }: { to: string; icon: typeof Heart; t: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 p-3 font-semibold">
      <Icon className="h-4 w-4 text-primary" /> {t}
    </Link>
  );
}
