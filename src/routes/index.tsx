import { createFileRoute, Link } from "@tanstack/react-router";
import { Upload, Truck, BadgePercent, ShieldCheck, Star, Phone, FlaskConical, Stethoscope } from "lucide-react";
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
  const popular = products.filter((p) => p.category === "medicine").slice(0, 6);
  const deals = [...products].sort((a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp).slice(0, 6);

  return (
    <div>
      {settings.expressEnabled && (
        <section className="pt-4">
          <div className="flex items-center gap-3 rounded-xl border border-sale/40 bg-secondary p-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-sale/10 text-xl">🚑</span>
            <div className="min-w-0">
              <p className="text-sm font-bold">জরুরি ডেলিভারি — {settings.expressEta}</p>
              <p className="text-xs text-muted-foreground">
                ইমার্জেন্সি ঔষধ ও অক্সিজেন অগ্রাধিকারে · হটলাইন {settings.emergencyPhone}
              </p>
            </div>
            <a
              href={`tel:${settings.emergencyPhone}`}
              className="ml-auto shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              কল করুন
            </a>
          </div>
        </section>
      )}

      <section className="pt-4">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Upload className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">প্রেসক্রিপশন আপলোড করুন</p>
            <p className="text-xs text-muted-foreground">ছবি দিন, ফার্মাসিস্ট ঔষধ সাজিয়ে দেবেন</p>
          </div>
          <Link
            to="/prescription"
            className="ml-auto shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
          >
            আপলোড
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 pt-4">
        <Link to="/lab-test" className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
          <FlaskConical className="h-5 w-5 text-primary" />
          <span>
            <span className="block text-xs font-bold">ল্যাব টেস্ট</span>
            <span className="block text-[10px] text-muted-foreground">ঘরে বসে স্যাম্পল</span>
          </span>
        </Link>
        <Link to="/doctor-consultation" className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
          <Stethoscope className="h-5 w-5 text-primary" />
          <span>
            <span className="block text-xs font-bold">ডাক্তার পরামর্শ</span>
            <span className="block text-[10px] text-muted-foreground">অনলাইনে ভিডিও কল</span>
          </span>
        </Link>
      </section>

      <section className="pt-5">
        <SectionTitle title="ক্যাটাগরি" to="/categories" />
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {categories.slice(0, 8).map((c) => (
            <Link
              key={c.slug}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="rounded-xl border border-border bg-card px-1 py-3 text-center shadow-[var(--shadow-card)]"
            >
              <span className="text-xl">{c.emoji}</span>
              <p className="mt-1 text-[11px] font-semibold leading-tight">{c.bn}</p>
              <p className="text-[9px] text-muted-foreground">{c.en}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="pt-5">
        <div className="relative overflow-hidden rounded-xl">
          <img src={bannerMedicine} alt="ঔষধের অফার ব্যানার" width={1200} height={600} className="h-36 w-full object-cover sm:h-56" />
          <div className="absolute inset-0 flex flex-col justify-center gap-1 p-4">
            <p className="text-xs font-semibold text-primary-dark">সব ঔষধে</p>
            <p className="text-2xl font-bold text-primary-dark">১৫% পর্যন্ত ছাড়</p>
            <Link to="/offers" className="mt-1 w-fit rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              অর্ডার করুন
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 pt-4">
        {[
          { icon: Truck, t: "দ্রুত ডেলিভারি" },
          { icon: BadgePercent, t: "সেরা দামে" },
          { icon: ShieldCheck, t: "১০০% অরিজিনাল" },
        ].map(({ icon: Icon, t }) => (
          <div key={t} className="rounded-xl border border-border bg-card p-2.5 text-center shadow-[var(--shadow-card)]">
            <Icon className="mx-auto h-5 w-5 text-primary" />
            <p className="mt-1 text-[10px] font-semibold leading-tight">{t}</p>
          </div>
        ))}
      </section>

      <section className="pt-6">
        <SectionTitle title="জনপ্রিয় ঔষধ" to="/category/medicine" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {popular.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      <section className="pt-6">
        <SectionTitle title="সেরা ডিসকাউন্ট" to="/offers" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {deals.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      <section className="pt-6">
        <SectionTitle title="জনপ্রিয় ল্যাব টেস্ট" to="/lab-test" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {labTests.slice(0, 4).map((t) => (
            <Link
              key={t.id}
              to="/lab-test"
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary">🧪</span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">{t.bn}</span>
                <span className="block text-[10px] text-muted-foreground">{t.en}</span>
              </span>
              <span className="ml-auto text-sm font-bold text-primary-dark">৳{bn(t.price)}</span>
            </Link>
          ))}
        </div>
      </section>

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
            <a
              href="tel:16700"
              className="mt-1 flex w-fit items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <Phone className="h-3.5 w-3.5" /> কল করুন
            </a>
          </div>
        </div>
      </section>

      <section className="pt-6">
        <h2 className="mb-3 text-sm font-bold">গ্রাহকের মতামত</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { n: "রিফাত হাসান", r: "সময়মতো ডেলিভারি পেয়েছি, দামও কম।" },
            { n: "নুসরাত জাহান", r: "প্রেসক্রিপশন আপলোড করেই অর্ডার — খুব সহজ।" },
          ].map((c) => (
            <div key={c.n} className="rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
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
    </div>
  );
}
