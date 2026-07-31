import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  ShoppingCart,
  Bell,
  MapPin,
  Home,
  LayoutGrid,
  FileText,
  User,
  Upload,
  Truck,
  BadgePercent,
  ShieldCheck,
  Star,
  ChevronRight,
  Phone,
} from "lucide-react";
import bannerMedicine from "@/assets/banner-medicine.jpg";
import bannerPharmacist from "@/assets/banner-pharmacist.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ঔষধওয়ালা — অনলাইন ফার্মেসি | Oushodhwala" },
      {
        name: "description",
        content:
          "ঔষধওয়ালা থেকে অরিজিনাল ঔষধ, স্বাস্থ্য পণ্য ও ল্যাব টেস্ট অর্ডার করুন। ঢাকায় ২ ঘণ্টায় ডেলিভারি, সারাদেশে ২৪-৭২ ঘণ্টায়।",
      },
      { property: "og:title", content: "ঔষধওয়ালা — অনলাইন ফার্মেসি | Oushodhwala" },
      {
        property: "og:description",
        content: "অরিজিনাল ঔষধ, ছাড়ে হোম ডেলিভারি। প্রেসক্রিপশন আপলোড করে অর্ডার করুন।",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

const categories = [
  { bn: "ঔষধ", en: "Medicine", emoji: "💊" },
  { bn: "স্বাস্থ্য", en: "Healthcare", emoji: "🩺" },
  { bn: "ল্যাব টেস্ট", en: "Lab Test", emoji: "🧪" },
  { bn: "বেবি কেয়ার", en: "Baby Care", emoji: "🍼" },
  { bn: "সৌন্দর্য", en: "Beauty", emoji: "🧴" },
  { bn: "ডিভাইস", en: "Devices", emoji: "🌡️" },
  { bn: "ভিটামিন", en: "Vitamins", emoji: "🟠" },
  { bn: "সব দেখুন", en: "See all", emoji: "➕" },
];

const products = [
  { name: "নাপা এক্সট্রা ৫০০ মিগ্রা", sub: "Tablet · 10 pcs", price: 30, mrp: 36, off: 17 },
  { name: "সেকলো ২০ মিগ্রা", sub: "Capsule · 10 pcs", price: 42, mrp: 50, off: 16 },
  { name: "মোনাস ১০ মিগ্রা", sub: "Tablet · 10 pcs", price: 130, mrp: 150, off: 13 },
  { name: "ফেক্সো ১২০ মিগ্রা", sub: "Tablet · 10 pcs", price: 90, mrp: 100, off: 10 },
  { name: "সার্জেল ২০ মিগ্রা", sub: "Capsule · 14 pcs", price: 98, mrp: 112, off: 12 },
  { name: "ভিটামিন সি ২৫০ মিগ্রা", sub: "Tablet · 20 pcs", price: 60, mrp: 72, off: 17 },
];

function Index() {
  return (
    <div className="min-h-screen bg-background pb-20 font-sans">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 pt-3 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-foreground/15 text-lg">
                💊
              </span>
              <div className="leading-tight">
                <p className="text-base font-bold">ঔষধওয়ালা</p>
                <p className="text-[10px] opacity-80 tracking-wide">OUSHODHWALA</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <Bell className="h-5 w-5" aria-label="নোটিফিকেশন" />
              <span className="relative">
                <ShoppingCart className="h-5 w-5" aria-label="কার্ট" />
                <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-sale text-[10px] font-bold text-sale-foreground">
                  2
                </span>
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1 text-xs opacity-90">
            <MapPin className="h-3.5 w-3.5" />
            <span>ডেলিভারি: ধানমন্ডি, ঢাকা</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-lg bg-card px-3 py-2.5 shadow-[var(--shadow-card)]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="ঔষধ বা পণ্য খুঁজুন..."
              aria-label="সার্চ"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        {/* Prescription upload */}
        <section className="-mt-1 pt-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
              <Upload className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">প্রেসক্রিপশন আপলোড করুন</p>
              <p className="text-xs text-muted-foreground">ছবি দিন, আমরা ঔষধ সাজিয়ে দেব</p>
            </div>
            <button className="ml-auto shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
              আপলোড
            </button>
          </div>
        </section>

        {/* Categories */}
        <section className="pt-5">
          <h2 className="mb-3 text-sm font-bold">ক্যাটাগরি</h2>
          <div className="grid grid-cols-4 gap-3">
            {categories.map((c) => (
              <button
                key={c.en}
                className="rounded-xl border border-border bg-card px-1 py-3 text-center shadow-[var(--shadow-card)]"
              >
                <span className="text-xl">{c.emoji}</span>
                <p className="mt-1 text-[11px] font-semibold leading-tight">{c.bn}</p>
                <p className="text-[9px] text-muted-foreground">{c.en}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Hero banner */}
        <section className="pt-5">
          <div className="relative overflow-hidden rounded-xl">
            <img
              src={bannerMedicine}
              alt="ঔষধের অফার ব্যানার"
              width={1200}
              height={600}
              className="h-36 w-full object-cover sm:h-56"
            />
            <div className="absolute inset-0 flex flex-col justify-center gap-1 p-4">
              <p className="text-xs font-semibold text-primary-dark">সব ঔষধে</p>
              <p className="text-2xl font-bold text-primary-dark">১৫% পর্যন্ত ছাড়</p>
              <button className="mt-1 w-fit rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                অর্ডার করুন
              </button>
            </div>
          </div>
        </section>

        {/* Value props */}
        <section className="grid grid-cols-3 gap-2 pt-4">
          {[
            { icon: Truck, t: "দ্রুত ডেলিভারি" },
            { icon: BadgePercent, t: "সেরা দামে" },
            { icon: ShieldCheck, t: "১০০% অরিজিনাল" },
          ].map(({ icon: Icon, t }) => (
            <div
              key={t}
              className="rounded-xl border border-border bg-card p-2.5 text-center shadow-[var(--shadow-card)]"
            >
              <Icon className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-1 text-[10px] font-semibold leading-tight">{t}</p>
            </div>
          ))}
        </section>

        {/* Products */}
        <section className="pt-6">
          <div className="mb-3 flex items-center">
            <h2 className="text-sm font-bold">জনপ্রিয় ঔষধ</h2>
            <button className="ml-auto flex items-center text-xs font-semibold text-primary">
              সব দেখুন <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <article
                key={p.name}
                className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]"
              >
                <div className="relative grid h-24 place-items-center bg-secondary text-3xl">
                  💊
                  <span className="absolute left-2 top-2 rounded bg-sale px-1.5 py-0.5 text-[10px] font-bold text-sale-foreground">
                    {p.off}% OFF
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-2.5">
                  <p className="line-clamp-2 text-xs font-semibold leading-snug">{p.name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{p.sub}</p>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-sm font-bold text-primary-dark">৳{p.price}</span>
                    <span className="text-[10px] text-muted-foreground line-through">৳{p.mrp}</span>
                  </div>
                  <button className="mt-2 rounded-lg bg-primary py-1.5 text-[11px] font-semibold text-primary-foreground">
                    কার্টে যোগ করুন
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Pharmacist banner */}
        <section className="pt-6">
          <div className="relative overflow-hidden rounded-xl">
            <img
              src={bannerPharmacist}
              alt="ফার্মাসিস্টের পরামর্শ"
              width={1200}
              height={600}
              loading="lazy"
              className="h-36 w-full object-cover sm:h-56"
            />
            <div className="absolute inset-y-0 right-0 flex w-1/2 flex-col justify-center gap-1 p-4">
              <p className="text-sm font-bold text-primary-dark">ফার্মাসিস্টের ফ্রি পরামর্শ</p>
              <p className="text-[11px] text-primary-dark/80">প্রতিদিন সকাল ৮টা – রাত ১১টা</p>
              <button className="mt-1 flex w-fit items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                <Phone className="h-3.5 w-3.5" /> কল করুন
              </button>
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section className="pt-6">
          <h2 className="mb-3 text-sm font-bold">গ্রাহকের মতামত</h2>
          <div className="space-y-2">
            {[
              { n: "রিফাত হাসান", r: "সময়মতো ডেলিভারি পেয়েছি, দামও কম।" },
              { n: "নুসরাত জাহান", r: "প্রেসক্রিপশন আপলোড করেই অর্ডার — খুব সহজ।" },
            ].map((c) => (
              <div
                key={c.n}
                className="rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-current text-sale" />
                  ))}
                  <span className="ml-1 text-xs font-semibold">{c.n}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{c.r}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-8 rounded-t-xl border border-border bg-card p-4 text-center">
          <p className="text-sm font-bold">ঔষধওয়ালা · Oushodhwala</p>
          <p className="mt-1 text-xs text-muted-foreground">
            বাংলাদেশের অনলাইন ফার্মেসি — অরিজিনাল ঔষধ, ঘরে বসে।
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground">© ২০২৬ Oushodhwala Ltd.</p>
        </footer>
      </main>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-around px-2 py-2">
          {[
            { icon: Home, t: "হোম", active: true },
            { icon: LayoutGrid, t: "ক্যাটাগরি" },
            { icon: FileText, t: "অর্ডার" },
            { icon: User, t: "একাউন্ট" },
          ].map(({ icon: Icon, t, active }) => (
            <button
              key={t}
              className={`flex flex-col items-center gap-0.5 px-3 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold">{t}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
