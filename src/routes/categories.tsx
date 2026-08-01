import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, HomeIcon, Clock } from "lucide-react";

import { useCatalog } from "@/lib/catalog-db";
import { useT } from "@/lib/i18n";
import { useLang, pick } from "@/lib/lang";
import type { Category } from "@/data/catalog";

const SITE = "https://oushodhwala.lovable.app";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "সব ক্যাটাগরি ও হোম সার্ভিস — ঔষধওয়ালা" },
      {
        name: "description",
        content:
          "ঔষধ, ডায়াবেটিস কেয়ার, অর্থোপেডিক, ফার্স্ট এইড থেকে হোম নার্সিং ও ডাক্তার ভিজিট — সব স্বাস্থ্যসেবা হোম ডেলিভারিসহ এক জায়গায়।",
      },
      { property: "og:title", content: "সব ক্যাটাগরি ও হোম সার্ভিস — ঔষধওয়ালা" },
      { property: "og:description", content: "প্রতিটি ক্যাটাগরিতে হোম ডেলিভারি বা হোম সার্ভিস সুবিধা।" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "ঔষধওয়ালা · Oushodhwala" },
      { property: "og:locale", content: "bn_BD" },
      { property: "og:locale:alternate", content: "en_US" },
      { property: "og:url", content: `${SITE}/categories` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "All categories & home services — Oushodhwala" },
      {
        name: "twitter:description",
        content: "Medicines, health devices, home nursing, doctor visits and diagnostics — all with home delivery.",
      },
    ],
    links: [
      { rel: "canonical", href: `${SITE}/categories` },
      { rel: "alternate", hrefLang: "bn", href: `${SITE}/categories` },
      { rel: "alternate", hrefLang: "en", href: `${SITE}/categories` },
      { rel: "alternate", hrefLang: "x-default", href: `${SITE}/categories` },
    ],
  }),
  component: CategoriesPage,
});


function CategoriesPage() {
  const t = useT();
  const { lang } = useLang();
  const { products, categories } = useCatalog();

  const productCats = categories.filter((c) => c.kind !== "service");
  const serviceCats = categories.filter((c) => c.kind === "service");

  const count = (slug: string) => products.filter((p) => p.category === slug).length;

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">{t("সব ক্যাটাগরি", "All categories")}</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {t(
          "প্রতিটি ক্যাটাগরিতে হোম ডেলিভারি অথবা হোম সার্ভিস সুবিধা রয়েছে।",
          "Every category comes with home delivery or an at-home service option.",
        )}
      </p>

      <h2 className="mt-4 text-sm font-bold">{t("পণ্য ক্যাটাগরি", "Product categories")}</h2>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {productCats.map((c) => (
          <Link
            key={c.slug}
            to="/category/$slug"
            params={{ slug: c.slug }}
            className="flex gap-3 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)] transition-colors hover:border-primary/40"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-secondary text-xl">{c.emoji}</span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold">{pick(lang, c.bn, c.en)}</span>
              <span className="mt-0.5 block line-clamp-2 text-[10px] text-muted-foreground">
                {pick(lang, c.desc, c.descEn) ||
                  t(`${t.n(count(c.slug))} টি পণ্য`, `${t.n(count(c.slug))} products`)}
              </span>
              <Badges c={c} />
            </span>
          </Link>
        ))}
      </div>

      <h2 className="mt-6 text-sm font-bold">{t("হোম সার্ভিস", "Home services")}</h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {t("প্রশিক্ষিত টিম আপনার বাসায় এসে সেবা দেবে।", "Our trained team delivers care at your doorstep.")}
      </p>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {serviceCats.map((c) => (
          <Link
            key={c.slug}
            to={c.serviceRoute === "/home-diagnostics" ? "/home-diagnostics" : "/home-services"}
            search={c.serviceRoute === "/home-diagnostics" ? undefined : { s: c.slug }}
            className="flex gap-3 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)] transition-colors hover:border-primary/40"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-xl">{c.emoji}</span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold">{pick(lang, c.bn, c.en)}</span>
              <span className="mt-0.5 block line-clamp-2 text-[10px] text-muted-foreground">{pick(lang, c.desc, c.descEn)}</span>
              <Badges c={c} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Badges({ c }: { c: Category }) {
  const t = useT();
  const { lang } = useLang();
  const eta = pick(lang, c.eta, c.etaEn);
  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-1">
      {c.homeDelivery && (
        <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-primary-dark">
          <Truck className="h-2.5 w-2.5" /> {t("হোম ডেলিভারি", "Home delivery")}
        </span>
      )}
      {c.homeService && (
        <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
          <HomeIcon className="h-2.5 w-2.5" /> {t("হোম সার্ভিস", "Home service")}
        </span>
      )}
      {eta && (
        <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" /> {eta}
        </span>
      )}
      {c.baseFee > 0 && (
        <span className="text-[9px] font-semibold text-primary-dark">
          {t(`শুরু ৳${t.n(c.baseFee)}`, `from ৳${t.n(c.baseFee)}`)}
        </span>
      )}
    </span>
  );
}
