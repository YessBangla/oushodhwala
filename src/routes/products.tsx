import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useCatalog, mapProduct } from "@/lib/catalog-db";
import { searchProducts } from "@/lib/catalog.functions";
import { ProductCard } from "@/components/ProductCard";
import { useT } from "@/lib/i18n";
import { useLang, pick } from "@/lib/lang";

type Search = { q: string; category: string; sort: string };

export const Route = createFileRoute("/products")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s["q"] === "string" ? (s["q"] as string) : "",
    category: typeof s["category"] === "string" ? (s["category"] as string) : "all",
    sort: typeof s["sort"] === "string" ? (s["sort"] as string) : "popular",
  }),
  head: () => ({
    meta: [
      { title: "স্টোর — ঔষধ ও স্বাস্থ্য পণ্য খুঁজুন | ঔষধওয়ালা" },
      { name: "description", content: "ব্র্যান্ড, জেনেরিক বা ক্যাটাগরি দিয়ে ঔষধ খুঁজুন, দাম তুলনা করুন এবং অর্ডার করুন।" },
      { property: "og:title", content: "স্টোর — ঔষধ ও স্বাস্থ্য পণ্য | ঔষধওয়ালা" },
      { property: "og:description", content: "৫ হাজারের বেশি ঔষধ ও স্বাস্থ্য পণ্য — সেরা দামে।" },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const t = useT();
  const { lang } = useLang();
  const { categories } = useCatalog();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [maxPrice, setMaxPrice] = useState(6000);
  const [rxOnly, setRxOnly] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE = 40;

  useEffect(() => {
    setPage(0);
  }, [search.q, search.category, search.sort, maxPrice, rxOnly]);

  const { data, isFetching } = useQuery({
    queryKey: ["products-search", search.q, search.category, search.sort, maxPrice, rxOnly, page],
    queryFn: () =>
      searchProducts({
        data: {
          q: search.q,
          category: search.category,
          sort: search.sort,
          rx: rxOnly,
          maxPrice,
          offset: page * PAGE,
          limit: PAGE,
        },
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const list = (data?.rows ?? []).map(mapProduct);
  const total = data?.count ?? 0;

  const set = (patch: Partial<Search>) => navigate({ search: (prev: Search) => ({ ...prev, ...patch }) });

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">
        {search.q ? t(`“${search.q}” এর ফলাফল`, `Results for "${search.q}"`) : t("সব পণ্য", "All products")}{" "}
        <span className="text-xs font-normal text-muted-foreground">({t.n(total)} {t("টি", "")})</span>
      </h1>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => set({ category: "all" })}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
            search.category === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
          }`}
        >
          {t("সব", "All")}
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            onClick={() => set({ category: c.slug })}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
              search.category === c.slug ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
            }`}
          >
            {c.emoji} {pick(lang, c.bn, c.en)}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <label className="flex items-center gap-2 text-xs font-semibold">
          {t("সাজান:", "Sort:")}
          <select
            value={search.sort}
            onChange={(e) => set({ sort: e.target.value })}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            <option value="popular">{t("জনপ্রিয়", "Popular")}</option>
            <option value="low">{t("দাম: কম থেকে বেশি", "Price: low to high")}</option>
            <option value="high">{t("দাম: বেশি থেকে কম", "Price: high to low")}</option>
            <option value="discount">{t("সর্বোচ্চ ছাড়", "Highest discount")}</option>
            <option value="rating">{t("রেটিং", "Rating")}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold">
          {t("সর্বোচ্চ দাম:", "Max price:")} {t.money(maxPrice)}
          <input
            type="range"
            min={50}
            max={6000}
            step={50}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold">
          <input type="checkbox" checked={rxOnly} onChange={(e) => setRxOnly(e.target.checked)} />
          {t("শুধু প্রেসক্রিপশন ঔষধ", "Prescription medicines only")}
        </label>
      </div>

      {list.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold">{t("কোনো পণ্য পাওয়া যায়নি", "No products found")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("অন্য নাম দিয়ে খুঁজুন অথবা প্রেসক্রিপশন আপলোড করুন।", "Try another name or upload a prescription.")}</p>
          <Link
            to="/prescription"
            className="mt-3 inline-block rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
          >
            {t("প্রেসক্রিপশন আপলোড", "Upload prescription")}
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}

      {total > PAGE && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            disabled={page === 0 || isFetching}
            onClick={() => setPage((n) => Math.max(0, n - 1))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold disabled:opacity-40"
          >
            {t("আগের", "Previous")}
          </button>
          <span className="text-xs text-muted-foreground">
            {t("পৃষ্ঠা", "Page")} {t.n(page + 1)} / {t.n(Math.ceil(total / PAGE))}
          </span>
          <button
            disabled={(page + 1) * PAGE >= total || isFetching}
            onClick={() => setPage((n) => n + 1)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold disabled:opacity-40"
          >
            {t("পরের", "Next")}
          </button>
        </div>
      )}
    </div>
  );
}
