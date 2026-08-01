import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { categories as staticCategories } from "@/data/catalog";
import { mapProduct } from "@/lib/catalog-db";
import { searchProducts } from "@/lib/catalog.functions";
import { ProductCard } from "@/components/ProductCard";
import { useT } from "@/lib/i18n";
import { useLang, pick } from "@/lib/lang";

const SITE = "https://oushodhwala.lovable.app";

export const Route = createFileRoute("/category/$slug")({
  loader: ({ params }) => {
    const cat = staticCategories.find((c) => c.slug === params.slug);
    if (!cat) throw notFound();
    return { cat };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "ক্যাটাগরি পাওয়া যায়নি — ঔষধওয়ালা" }, { name: "robots", content: "noindex" }] };
    }
    const c = loaderData.cat;
    const url = `${SITE}/category/${params.slug}`;
    const isService = c.kind === "service";
    const title = `${c.bn} — ${c.en} | ঔষধওয়ালা`;
    const desc = (
      c.desc ||
      (isService
        ? `${c.bn} — প্রশিক্ষিত টিম আপনার বাসায় এসে সেবা দেবে। ঔষধওয়ালা থেকে হোম সার্ভিস বুক করুন।`
        : `${c.bn} ক্যাটাগরির অরিজিনাল পণ্য সেরা দামে হোম ডেলিভারিসহ অর্ডার করুন ঔষধওয়ালা থেকে।`)
    ).slice(0, 155);
    const descEn = (
      c.descEn ||
      (isService
        ? `${c.en} at home in Bangladesh — book trained professionals from Oushodhwala.`
        : `Order authentic ${c.en} online at the best price with fast home delivery from Oushodhwala.`)
    ).slice(0, 155);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:locale", content: "bn_BD" },
        { property: "og:locale:alternate", content: "en_US" },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "ঔষধওয়ালা · Oushodhwala" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: `${c.en} — Oushodhwala` },
        { name: "twitter:description", content: descEn },
      ],
      links: [
        { rel: "canonical", href: url },
        { rel: "alternate", hrefLang: "bn", href: url },
        { rel: "alternate", hrefLang: "en", href: url },
        { rel: "alternate", hrefLang: "x-default", href: url },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "ঔষধওয়ালা", item: SITE },
              { "@type": "ListItem", position: 2, name: "ক্যাটাগরি", item: `${SITE}/categories` },
              { "@type": "ListItem", position: 3, name: c.bn, item: url },
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            isService
              ? {
                  "@context": "https://schema.org",
                  "@type": "Service",
                  name: c.en,
                  alternateName: c.bn,
                  description: descEn,
                  areaServed: "Bangladesh",
                  provider: { "@type": "Organization", name: "Oushodhwala", url: SITE },
                  ...(c.baseFee > 0
                    ? { offers: { "@type": "Offer", price: c.baseFee, priceCurrency: "BDT" } }
                    : {}),
                }
              : {
                  "@context": "https://schema.org",
                  "@type": "CollectionPage",
                  name: c.en,
                  alternateName: c.bn,
                  description: descEn,
                  url,
                  isPartOf: { "@type": "WebSite", name: "Oushodhwala", url: SITE },
                },
          ),
        },
      ],
    };
  },
  component: CategoryPage,
});


function CategoryPage() {
  const t = useT();
  const { lang } = useLang();
  const { cat } = Route.useLoaderData();
  const isService = cat.kind === "service";
  const { data } = useQuery({
    queryKey: ["category-products", cat.slug],
    queryFn: () => searchProducts({ data: { category: cat.slug, limit: 60 } }),
    staleTime: 30_000,
    enabled: !isService,
  });
  const list = (data?.rows ?? []).map(mapProduct);
  const total = data?.count ?? 0;

  return (
    <div className="pt-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-secondary text-xl">{cat.emoji}</span>
        <div className="min-w-0">
          <h1 className="text-base font-bold">{pick(lang, cat.bn, cat.en)}</h1>
          <p className="text-xs text-muted-foreground">
            {lang === "en" ? cat.bn : cat.en}
            {!isService && ` · ${t(`${t.n(total)} টি পণ্য`, `${t.n(total)} products`)}`}
          </p>
        </div>
        {!isService && (
          <Link
            to="/products"
            search={{ q: "", category: cat.slug, sort: "popular" }}
            className="ml-auto rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold"
          >
            {t("ফিল্টার", "Filter")}
          </Link>
        )}
      </div>

      {pick(lang, cat.desc, cat.descEn) && (
        <p className="mt-2 text-xs text-muted-foreground">{pick(lang, cat.desc, cat.descEn)}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-[11px]">
        {cat.homeDelivery && (
          <span className="rounded bg-secondary px-2 py-1 font-bold text-primary-dark">
            {t("হোম ডেলিভারি", "Home delivery")}
          </span>
        )}
        {cat.homeService && (
          <span className="rounded bg-primary/10 px-2 py-1 font-bold text-primary">{t("হোম সার্ভিস", "Home service")}</span>
        )}
        {pick(lang, cat.eta, cat.etaEn) && <span className="text-muted-foreground">{pick(lang, cat.eta, cat.etaEn)}</span>}
        <Link
          to={cat.serviceRoute === "/home-diagnostics" ? "/home-diagnostics" : "/home-services"}
          search={cat.serviceRoute === "/home-diagnostics" ? undefined : { s: cat.slug }}
          className="ml-auto rounded-lg bg-primary px-3 py-1.5 font-bold text-primary-foreground"
        >
          {isService ? t("সেবা বুক করুন", "Book this service") : t("বাসায় সেবা নিন", "Get care at home")}
        </Link>
      </div>

      {!isService && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
          {list.length === 0 && (
            <p className="col-span-full text-xs text-muted-foreground">
              {t("এই ক্যাটাগরিতে শীঘ্রই পণ্য যুক্ত হচ্ছে।", "Products are being added to this category soon.")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
