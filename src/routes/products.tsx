import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { categories, products, bn } from "@/data/catalog";
import { ProductCard } from "@/components/ProductCard";

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
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [maxPrice, setMaxPrice] = useState(6000);
  const [rxOnly, setRxOnly] = useState(false);

  const list = useMemo(() => {
    const q = search.q.trim().toLowerCase();
    let out = products.filter((p) => {
      const inCat = search.category === "all" || p.category === search.category;
      const matches =
        !q ||
        [p.name, p.en, p.brand, p.generic].some((f) => f.toLowerCase().includes(q));
      return inCat && matches && p.price <= maxPrice && (!rxOnly || p.rx);
    });
    if (search.sort === "low") out = [...out].sort((a, b) => a.price - b.price);
    if (search.sort === "high") out = [...out].sort((a, b) => b.price - a.price);
    if (search.sort === "discount")
      out = [...out].sort((a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp);
    if (search.sort === "rating") out = [...out].sort((a, b) => b.rating - a.rating);
    return out;
  }, [search, maxPrice, rxOnly]);

  const set = (patch: Partial<Search>) => navigate({ search: (prev: Search) => ({ ...prev, ...patch }) });

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">
        {search.q ? `“${search.q}” এর ফলাফল` : "সব পণ্য"}{" "}
        <span className="text-xs font-normal text-muted-foreground">({bn(list.length)} টি)</span>
      </h1>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => set({ category: "all" })}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
            search.category === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
          }`}
        >
          সব
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            onClick={() => set({ category: c.slug })}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
              search.category === c.slug ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
            }`}
          >
            {c.emoji} {c.bn}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <label className="flex items-center gap-2 text-xs font-semibold">
          সাজান:
          <select
            value={search.sort}
            onChange={(e) => set({ sort: e.target.value })}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            <option value="popular">জনপ্রিয়</option>
            <option value="low">দাম: কম থেকে বেশি</option>
            <option value="high">দাম: বেশি থেকে কম</option>
            <option value="discount">সর্বোচ্চ ছাড়</option>
            <option value="rating">রেটিং</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold">
          সর্বোচ্চ দাম: ৳{bn(maxPrice)}
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
          শুধু প্রেসক্রিপশন ঔষধ
        </label>
      </div>

      {list.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold">কোনো পণ্য পাওয়া যায়নি</p>
          <p className="mt-1 text-xs text-muted-foreground">অন্য নাম দিয়ে খুঁজুন অথবা প্রেসক্রিপশন আপলোড করুন।</p>
          <Link
            to="/prescription"
            className="mt-3 inline-block rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
          >
            প্রেসক্রিপশন আপলোড
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
