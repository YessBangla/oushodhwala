import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { categories as staticCategories } from "@/data/catalog";
import { mapProduct } from "@/lib/catalog-db";
import { searchProducts } from "@/lib/catalog.functions";
import { ProductCard } from "@/components/ProductCard";
import { useT } from "@/lib/i18n";
import { useLang, pick } from "@/lib/lang";

export const Route = createFileRoute("/category/$slug")({
  loader: ({ params }) => {
    const cat = staticCategories.find((c) => c.slug === params.slug);
    if (!cat) throw notFound();
    return { cat };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "ক্যাটাগরি পাওয়া যায়নি — ঔষধওয়ালা" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.cat.bn} — ${loaderData.cat.en} | ঔষধওয়ালা`;
    const desc = `${loaderData.cat.bn} ক্যাটাগরির অরিজিনাল পণ্য সেরা দামে অর্ডার করুন ঔষধওয়ালা থেকে।`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const t = useT();
  const { lang } = useLang();
  const { cat } = Route.useLoaderData();
  const { data } = useQuery({
    queryKey: ["category-products", cat.slug],
    queryFn: () => searchProducts({ data: { category: cat.slug, limit: 60 } }),
    staleTime: 30_000,
  });
  const list = (data?.rows ?? []).map(mapProduct);
  const total = data?.count ?? 0;

  return (
    <div className="pt-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-secondary text-xl">{cat.emoji}</span>
        <div>
          <h1 className="text-base font-bold">{pick(lang, cat.bn, cat.en)}</h1>
          <p className="text-xs text-muted-foreground">
            {lang === "en" ? cat.bn : cat.en} · {t(`${t.n(total)} টি পণ্য`, `${t.n(total)} products`)}
          </p>
        </div>
        <Link
          to="/products"
          search={{ q: "", category: cat.slug, sort: "popular" }}
          className="ml-auto rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold"
        >
          {t("ফিল্টার", "Filter")}
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}
