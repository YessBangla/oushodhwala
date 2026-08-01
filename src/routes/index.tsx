import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Upload,
  Truck,
  BadgePercent,
  ShieldCheck,
  Star,
  Phone,
  FlaskConical,
  Stethoscope,
  ArrowRight,
  Headphones,
  Clock,
} from "lucide-react";
import bannerMedicine from "@/assets/banner-medicine.jpg";
import bannerPharmacist from "@/assets/banner-pharmacist.jpg";
import { labTests, bn } from "@/data/catalog";
import { useCatalog } from "@/lib/catalog-db";
import { ProductCard } from "@/components/ProductCard";
import { SectionTitle } from "@/components/Layout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ঔষধওয়ালা — অনলাইন ফার্মেসি | Oushodhwala" },
      {
        name: "description",
        content:
          "ঔষধওয়ালা থেকে অরিজিনাল ঔষধ, স্বাস্থ্য পণ্য, ল্যাব টেস্ট ও ডাক্তার পরামর্শ নিন। ঢাকায় ২ ঘণ্টায় ডেলিভারি, সারাদেশে ২৪-৭২ ঘণ্টায়।",
      },
      { property: "og:title", content: "ঔষধওয়ালা — অনলাইন ফার্মেসি | Oushodhwala" },
      {
        property: "og:description",
        content: "অরিজিনাল ঔষধ, স্বাস্থ্য পণ্য ও ল্যাব টেস্ট অর্ডার করুন — ঘরে বসে।",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  const { products, categories, settings } = useCatalog();
  const popular = products.filter((p) => p.category === "medicine").slice(0, 8);
  const deals = [...products].sort((a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp).slice(0, 8);

  return (
    <div className="pb-4">
      {/* ── Bento hero ─────────────────────────────── */}
      <section className="grid gap-3 pt-5 lg:grid-cols-3 lg:grid-rows-2">
        <div className="relative overflow-hidden rounded-2xl brand-gradient p-6 text-primary-foreground shadow-[var(--shadow-elevated)] lg:col-span-2 lg:row-span-2 lg:p-9">
          <img
            src={bannerMedicine}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-luminosity"
          />
          <div className="relative max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-[11px] font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" /> DGDA অনুমোদিত সোর্স · ১০০% অরিজিনাল
            </span>
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight lg:text-5xl">
              বাংলাদেশের বিশ্বস্ত <br className="hidden sm:block" /> অনলাইন ফার্মেসি
            </h1>
            <p className="mt-3 max-w-md text-sm opacity-90 lg:text-base">
              ২৫,০০০+ ঔষধ, স্বাস্থ্য পণ্য ও ডিভাইস — ফার্মাসিস্ট যাচাইকৃত। ঢাকায় ২ ঘণ্টায়, সারাদেশে ২৪–৭২ ঘণ্টায় ডেলিভারি।
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/products"
                search={{ q: "", category: "all", sort: "popular" }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-5 py-3 text-sm font-bold text-primary"
              >
                ঔষধ অর্ডার করুন <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/prescription"
                className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/40 px-5 py-3 text-sm font-semibold"
              >
                <Upload className="h-4 w-4" /> প্রেসক্রিপশন আপলোড
              </Link>
            </div>
            <dl className="mt-8 grid max-w-md grid-cols-3 gap-3 text-center">
              {[
                { k: "২৫,০০০+", v: "ঔষধ" },
                { k: "২ ঘণ্টা", v: "ঢাকায় ডেলিভারি" },
                { k: "২৪/৭", v: "ফার্মাসিস্ট" },
              ].map((s) => (
                <div key={s.v} className="rounded-xl bg-primary-foreground/12 px-2 py-3">
                  <dt className="font-display text-lg font-extrabold">{s.k}</dt>
                  <dd className="text-[10px] opacity-85">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {settings.expressEnabled ? (
          <div className="surface-card flex flex-col justify-between gap-3 border-sale/40 p-5">
            <div>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-sale/10 text-xl">🚑</span>
              <p className="mt-3 font-display text-base font-bold text-navy">জরুরি ডেলিভারি — {settings.expressEta}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                ইমার্জেন্সি ঔষধ ও অক্সিজেন অগ্রাধিকারে পৌঁছে দেওয়া হয়।
              </p>
            </div>
            <a
              href={`tel:${settings.emergencyPhone}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sale px-4 py-2.5 text-xs font-bold text-sale-foreground"
            >
              <Phone className="h-3.5 w-3.5" /> {settings.emergencyPhone}
            </a>
          </div>
        ) : (
          <div className="surface-card p-5">
            <Headphones className="h-6 w-6 text-primary" />
            <p className="mt-3 font-display text-base font-bold text-navy">ফার্মাসিস্ট সাপোর্ট</p>
            <p className="mt-1 text-xs text-muted-foreground">প্রতিদিন সকাল ৮টা – রাত ১১টা</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link to="/lab-test" className="surface-card flex flex-col justify-between p-4 transition hover:border-primary">
            <FlaskConical className="h-6 w-6 text-primary" />
            <span className="mt-4">
              <span className="block font-display text-sm font-bold text-navy">ল্যাব টেস্ট</span>
              <span className="block text-[10px] text-muted-foreground">ঘরে বসে স্যাম্পল</span>
            </span>
          </Link>
          <Link
            to="/doctor-consultation"
            className="surface-card flex flex-col justify-between p-4 transition hover:border-primary"
          >
            <Stethoscope className="h-6 w-6 text-primary" />
            <span className="mt-4">
              <span className="block font-display text-sm font-bold text-navy">ডাক্তার পরামর্শ</span>
              <span className="block text-[10px] text-muted-foreground">অনলাইনে ভিডিও কল</span>
            </span>
          </Link>
        </div>
      </section>

      {/* ── Trust strip ────────────────────────────── */}
      <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: ShieldCheck, t: "১০০% অরিজিনাল", s: "সরাসরি কোম্পানি সোর্স" },
          { icon: Truck, t: "দ্রুত ডেলিভারি", s: "ঢাকায় ২ ঘণ্টা" },
          { icon: BadgePercent, t: "সেরা দামে", s: "১৫% পর্যন্ত ছাড়" },
          { icon: Clock, t: "২৪/৭ সাপোর্ট", s: "লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট" },
        ].map(({ icon: Icon, t, s }) => (
          <div key={t} className="surface-card flex items-center gap-3 p-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">
              <Icon className="h-5 w-5 text-primary" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold text-navy">{t}</span>
              <span className="block truncate text-[10px] text-muted-foreground">{s}</span>
            </span>
          </div>
        ))}
      </section>

      {/* ── Prescription CTA ───────────────────────── */}
      <section className="mt-3">
        <div className="surface-card grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 sm:flex">
          <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground sm:grid">
            <Upload className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-navy">প্রেসক্রিপশন আপলোড করুন</p>
            <p className="text-xs text-muted-foreground">ছবি দিন — ফার্মাসিস্ট ঔষধ সাজিয়ে অর্ডার নিশ্চিত করবেন</p>
          </div>
          <Link
            to="/prescription"
            className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground sm:ml-auto"
          >
            আপলোড
          </Link>
        </div>
      </section>

      {/* ── Categories ─────────────────────────────── */}
      <section className="pt-8">
        <SectionTitle title="ক্যাটাগরি" to="/categories" />
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
          {categories.slice(0, 8).map((c) => (
            <Link
              key={c.slug}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="surface-card px-1 py-4 text-center transition hover:border-primary"
            >
              <span className="text-2xl">{c.emoji}</span>
              <p className="mt-1.5 text-[11px] font-bold leading-tight text-navy">{c.bn}</p>
              <p className="text-[9px] text-muted-foreground">{c.en}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Popular ────────────────────────────────── */}
      <section className="pt-8">
        <SectionTitle title="জনপ্রিয় ঔষধ" to="/category/medicine" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {popular.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      {/* ── Offer banner ───────────────────────────── */}
      <section className="pt-8">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl bg-navy p-6 text-navy-foreground lg:col-span-2">
            <p className="text-xs font-semibold text-primary">সব ঔষধে</p>
            <p className="mt-1 font-display text-3xl font-extrabold">১৫% পর্যন্ত ছাড়</p>
            <p className="mt-1 text-xs opacity-75">নিয়মিত ঔষধে সাবস্ক্রিপশন করলে বাড়তি সাশ্রয়।</p>
            <Link
              to="/offers"
              className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
            >
              অফার দেখুন <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="relative overflow-hidden rounded-2xl">
            <img
              src={bannerPharmacist}
              alt="ফার্মাসিস্টের পরামর্শ"
              width={800}
              height={600}
              loading="lazy"
              className="h-full min-h-40 w-full object-cover"
            />
            <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-navy/85 to-transparent p-4 text-navy-foreground">
              <p className="font-display text-sm font-bold">ফার্মাসিস্টের ফ্রি পরামর্শ</p>
              <p className="text-[11px] opacity-80">প্রতিদিন সকাল ৮টা – রাত ১১টা</p>
              <a
                href="tel:16700"
                className="mt-2 flex w-fit items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                <Phone className="h-3.5 w-3.5" /> কল করুন
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Deals ──────────────────────────────────── */}
      <section className="pt-8">
        <SectionTitle title="সেরা ডিসকাউন্ট" to="/offers" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {deals.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      {/* ── Lab tests ──────────────────────────────── */}
      <section className="pt-8">
        <SectionTitle title="জনপ্রিয় ল্যাব টেস্ট" to="/lab-test" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {labTests.slice(0, 4).map((t) => (
            <Link key={t.id} to="/lab-test" className="surface-card flex items-center gap-3 p-3.5 transition hover:border-primary">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">🧪</span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-navy">{t.bn}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{t.en}</span>
              </span>
              <span className="ml-auto shrink-0 font-display text-sm font-extrabold text-primary">৳{bn(t.price)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Reviews ────────────────────────────────── */}
      <section className="pt-8">
        <SectionTitle title="গ্রাহকের মতামত" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { n: "রিফাত হাসান", r: "সময়মতো ডেলিভারি পেয়েছি, দামও কম।" },
            { n: "নুসরাত জাহান", r: "প্রেসক্রিপশন আপলোড করেই অর্ডার — খুব সহজ।" },
            { n: "তানভীর আহমেদ", r: "জরুরি ঔষধ এক ঘণ্টার মধ্যেই হাতে পেয়েছি।" },
          ].map((c) => (
            <div key={c.n} className="surface-card p-4">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-current text-sale" />
                ))}
                <span className="ml-1 text-xs font-bold text-navy">{c.n}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{c.r}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
