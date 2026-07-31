import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut, MapPin, FileText, Heart, Bell, HelpCircle, FlaskConical } from "lucide-react";
import { bn } from "@/data/catalog";
import { useStore } from "@/lib/store";

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
  component: Account,
});

function Account() {
  const { user, login, logout, addresses, addAddress, removeAddress, activeAddress, setActiveAddress, orders, prescriptions, wishlist } = useStore();
  const [form, setForm] = useState({ name: "", phone: "" });
  const [addr, setAddr] = useState({ label: "", area: "", details: "", phone: "" });

  if (!user) {
    return (
      <div className="pt-10">
        <div className="mx-auto max-w-sm rounded-xl border border-border bg-card p-5">
          <h1 className="text-base font-bold">লগইন / রেজিস্ট্রেশন</h1>
          <p className="mt-1 text-xs text-muted-foreground">মোবাইল নম্বর দিয়ে শুরু করুন।</p>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="আপনার নাম"
            className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="মোবাইল নম্বর (01XXXXXXXXX)"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
          />
          <button
            onClick={() => form.name && form.phone && login(form.name, form.phone)}
            className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
          >
            চালিয়ে যান
          </button>
          <p className="mt-2 text-[10px] text-muted-foreground">চালিয়ে গেলে আপনি আমাদের শর্তাবলি মেনে নিচ্ছেন।</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-xl">👤</span>
        <div>
          <p className="text-sm font-bold">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.phone}</p>
        </div>
        <button onClick={logout} className="ml-auto flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold">
          <LogOut className="h-3.5 w-3.5" /> লগআউট
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={FileText} t="অর্ডার" v={bn(orders.length)} to="/orders" />
        <Stat icon={Heart} t="উইশলিস্ট" v={bn(wishlist.length)} to="/wishlist" />
        <Stat icon={FileText} t="প্রেসক্রিপশন" v={bn(prescriptions.length)} to="/prescription" />
        <Stat icon={FlaskConical} t="ল্যাব টেস্ট" v="বুক" to="/lab-test" />
      </div>

      <section className="mt-4 rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-2 text-sm font-bold"><MapPin className="h-4 w-4" /> ঠিকানা</p>
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
              placeholder={{ label: "লেবেল", area: "এলাকা, শহর", details: "রোড, বাড়ি", phone: "মোবাইল" }[k]}
              className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
            />
          ))}
        </div>
        <button
          onClick={() => {
            if (addr.area && addr.phone) {
              addAddress({ ...addr, label: addr.label || "নতুন" });
              setAddr({ label: "", area: "", details: "", phone: "" });
            }
          }}
          className="mt-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
        >
          ঠিকানা যোগ করুন
        </button>
      </section>

      <section className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card text-xs">
        <Row to="/notifications" icon={Bell} t="নোটিফিকেশন" />
        <Row to="/help" icon={HelpCircle} t="সহায়তা ও FAQ" />
        <Row to="/about" icon={FileText} t="আমাদের সম্পর্কে" />
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
