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
import { labTests } from "@/data/catalog";
import { useCatalog } from "@/lib/catalog-db";
import { ProductCard } from "@/components/ProductCard";
import { SectionTitle } from "@/components/Layout";
import { useT } from "@/lib/i18n";

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
  const t = useT();
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
              <ShieldCheck className="h-3.5 w-3.5" /> {t("DGDA অনুমোদিত সোর্স · ১০০% অরিজিনাল", "DGDA-approved source · 100% authentic")}
            </span>
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight lg:text-5xl">
              {t("বাংলাদেশের বিশ্বস্ত", "Bangladesh's most trusted")} <br className="hidden sm:block" /> {t("অনলাইন ফার্মেসি", "online pharmacy")}
            </h1>
            <p className="mt-3 max-w-md text-sm opacity-90 lg:text-base">
              {t(
                "২৫,০০০+ ঔষধ, স্বাস্থ্য পণ্য ও ডিভাইস — ফার্মাসিস্ট যাচাইকৃত। ঢাকায় ২ ঘণ্টায়, সারাদেশে ২৪–৭২ ঘণ্টায় ডেলিভারি।",
                "25,000+ medicines, health products & devices — pharmacist verified. Delivery in 2 hours in Dhaka, 24–72 hours nationwide."
              )}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/products"
                search={{ q: "", category: "all", sort: "popular" }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-5 py-3 text-sm font-bold text-primary"
              >
                {t("ঔষধ অর্ডার করুন", "Order medicine")} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/prescription"
                className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/40 px-5 py-3 text-sm font-semibold"
              >
                <Upload className="h-4 w-4" /> {t("প্রেসক্রিপশন আপলোড", "Upload prescription")}
              </Link>
            </div>
            <dl className="mt-8 grid max-w-md grid-cols-3 gap-3 text-center">
              {[
                { k: t.n(25000) + "+", v: t("ঔষধ", "Medicines") },
                { k: t("২ ঘণ্টা", "2 hours"), v: t("ঢাকায় ডেলিভারি", "Delivery in Dhaka") },
                { k: "24/7", v: t("ফার্মাসিস্ট", "Pharmacist") },
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
              <p className="mt-3 font-display text-base font-bold text-navy">{t("জরুরি ডেলিভারি", "Express delivery")} — {settings.expressEta}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("ইমার্জেন্সি ঔষধ ও অক্সিজেন অগ্রাধিকারে পৌঁছে দেওয়া হয়।", "Emergency medicine and oxygen delivered on priority.")}
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
            <p className="mt-3 font-display text-base font-bold text-navy">{t("ফার্মাসিস্ট সাপোর্ট", "Pharmacist support")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("প্রতিদিন সকাল ৮টা – রাত ১১টা", "Every day 8 AM – 11 PM")}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link to="/lab-test" className="surface-card flex flex-col justify-between p-4 transition hover:border-primary">
            <FlaskConical className="h-6 w-6 text-primary" />
            <span className="mt-4">
              <span className="block font-display text-sm font-bold text-navy">{t("ল্যাব টেস্ট", "Lab test")}</span>
              <span className="block text-[10px] text-muted-foreground">{t("ঘরে বসে স্যাম্পল", "Sample collection at home")}</span>
            </span>
          </Link>
          <Link
            to="/doctor-consultation"
            className="surface-card flex flex-col justify-between p-4 transition hover:border-primary"
          >
            <Stethoscope className="h-6 w-6 text-primary" />
            <span className="mt-4">
              <span className="block font-display text-sm font-bold text-navy">{t("ডাক্তার পরামর্শ", "Doctor consultation")}</span>
              <span className="block text-[10px] text-muted-foreground">{t("অনলাইনে ভিডিও কল", "Online video call")}</span>
            </span>
          </Link>
        </div>
      </section>

      {/* ── Trust strip ────────────────────────────── */}
      <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: ShieldCheck, t: t("১০০% অরিজিনাল", "100% authentic"), s: t("সরাসরি কোম্পানি সোর্স", "Direct from company source") },
          { icon: Truck, t: t("দ্রুত ডেলিভারি", "Fast delivery"), s: t("ঢাকায় ২ ঘণ্টা", "2 hours in Dhaka") },
          { icon: BadgePercent, t: t("সেরা দামে", "Best price"), s: t("১৫% পর্যন্ত ছাড়", "Up to 15% off") },
          { icon: Clock, t: t("২৪/৭ সাপোর্ট", "24/7 support"), s: t("লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট", "Licensed pharmacists") },
        ].map(({ icon: Icon, t: tt, s }) => (
          <div key={tt} className="surface-card flex items-center gap-3 p-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">
              <Icon className="h-5 w-5 text-primary" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold text-navy">{tt}</span>
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
            <p className="font-display text-sm font-bold text-navy">{t("প্রেসক্রিপশন আপলোড করুন", "Upload your prescription")}</p>
            <p className="text-xs text-muted-foreground">{t("ছবি দিন — ফার্মাসিস্ট ঔষধ সাজিয়ে অর্ডার নিশ্চিত করবেন", "Send a photo — a pharmacist will prepare and confirm your order")}</p>
          </div>
          <Link
            to="/prescription"
            className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground sm:ml-auto"
          >
            {t("আপলোড", "Upload")}
          </Link>
        </div>
      </section>

      {/* ── Categories ─────────────────────────────── */}
      <section className="pt-8">
        <SectionTitle title={t("ক্যাটাগরি", "Categories")} to="/categories" label={t("সব দেখুন", "See all")} />
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
        <SectionTitle title={t("জনপ্রিয় ঔষধ", "Popular medicines")} to="/category/medicine" label={t("সব দেখুন", "See all")} />
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
            <p className="text-xs font-semibold text-primary">{t("সব ঔষধে", "On all medicines")}</p>
            <p className="mt-1 font-display text-3xl font-extrabold">{t("১৫% পর্যন্ত ছাড়", "Up to 15% off")}</p>
            <p className="mt-1 text-xs opacity-75">{t("নিয়মিত ঔষধে সাবস্ক্রিপশন করলে বাড়তি সাশ্রয়।", "Subscribe to regular medicines for extra savings.")}</p>
            <Link
              to="/offers"
              className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
            >
              {t("অফার দেখুন", "See offers")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="relative overflow-hidden rounded-2xl">
            <img
              src={bannerPharmacist}
              alt={t("ফার্মাসিস্টের পরামর্শ", "Pharmacist consultation")}
              width={800}
              height={600}
              loading="lazy"
              className="h-full min-h-40 w-full object-cover"
            />
            <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-navy/85 to-transparent p-4 text-navy-foreground">
              <p className="font-display text-sm font-bold">{t("ফার্মাসিস্টের ফ্রি পরামর্শ", "Free pharmacist consultation")}</p>
              <p className="text-[11px] opacity-80">{t("প্রতিদিন সকাল ৮টা – রাত ১১টা", "Every day 8 AM – 11 PM")}</p>
              <a
                href="tel:16700"
                className="mt-2 flex w-fit items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                <Phone className="h-3.5 w-3.5" /> {t("কল করুন", "Call now")}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Deals ──────────────────────────────────── */}
      <section className="pt-8">
        <SectionTitle title={t("সেরা ডিসকাউন্ট", "Best discounts")} to="/offers" label={t("সব দেখুন", "See all")} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {deals.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      {/* ── Lab tests ──────────────────────────────── */}
      <section className="pt-8">
        <SectionTitle title={t("জনপ্রিয় ল্যাব টেস্ট", "Popular lab tests")} to="/lab-test" label={t("সব দেখুন", "See all")} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {labTests.slice(0, 4).map((lt) => (
            <Link key={lt.id} to="/lab-test" className="surface-card flex items-center gap-3 p-3.5 transition hover:border-primary">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">🧪</span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-navy">{lt.bn}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{lt.en}</span>
              </span>
              <span className="ml-auto shrink-0 font-display text-sm font-extrabold text-primary">{t.money(lt.price)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Reviews ────────────────────────────────── */}
      <section className="pt-8">
        <SectionTitle title={t("গ্রাহকের মতামত", "Customer reviews")} />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { n: t("রিফাত হাসান", "Rifat Hasan"), r: t("সময়মতো ডেলিভারি পেয়েছি, দামও কম।", "Got timely delivery and low prices.") },
            { n: t("নুসরাত জাহান", "Nusrat Jahan"), r: t("প্রেসক্রিপশন আপলোড করেই অর্ডার — খুব সহজ।", "Just uploaded my prescription to order — very easy.") },
            { n: t("তানভীর আহমেদ", "Tanvir Ahmed"), r: t("জরুরি ঔষধ এক ঘণ্টার মধ্যেই হাতে পেয়েছি।", "Got emergency medicine within an hour.") },
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
