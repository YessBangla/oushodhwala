import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Star, Truck, ShieldCheck, Minus, Plus, RotateCcw } from "lucide-react";
import { products as staticProducts, bn } from "@/data/catalog";
import { useCatalog } from "@/lib/catalog-db";
import { ProductCard } from "@/components/ProductCard";
import { useStore, toLine } from "@/lib/store";

export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => {
    const product = staticProducts.find((p) => p.id === params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "পণ্য পাওয়া যায়নি — ঔষধওয়ালা" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.product;
    const title = `${p.name} — দাম ৳${p.price} | ঔষধওয়ালা`;
    const desc = `${p.name} (${p.en}) — ${p.generic}, ${p.brand}। ৳${p.price} টাকায় অনলাইনে অর্ডার করুন, দ্রুত হোম ডেলিভারি।`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            brand: p.brand,
            description: desc,
            offers: { "@type": "Offer", price: p.price, priceCurrency: "BDT", availability: "https://schema.org/InStock" },
            aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviews },
          }),
        },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { products } = useCatalog();
  const { product: base } = Route.useLoaderData();
  const p = products.find((x) => x.id === base.id) ?? {
    ...base,
    stock: 50,
    lowStock: 10,
    image: "",
    descEn: "",
    indications: "",
    indicationsEn: "",
    dosage: "",
    dosageEn: "",
    sideEffects: "",
    sideEffectsEn: "",
    manufacturer: "",
  };
  const { add, cart, setQty, wishlist, toggleWish } = useStore();
  const [qty, setLocalQty] = useState(1);
  const line = cart.find((l) => l.id === p.id);
  const off = Math.round(((p.mrp - p.price) / p.mrp) * 100);
  const related = products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);

  return (
    <div className="pt-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative grid h-56 place-items-center overflow-hidden rounded-xl bg-secondary text-7xl">
          {p.image ? (
            <img src={p.image} alt={p.name} className="h-full w-full object-contain p-3" />
          ) : (
            p.emoji
          )}
          {off > 0 && (
            <span className="absolute left-3 top-3 rounded bg-sale px-2 py-0.5 text-[11px] font-bold text-sale-foreground">
              {bn(off)}% OFF
            </span>
          )}
        </div>


        <div>
          <h1 className="text-lg font-bold leading-snug">{p.name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{p.en}</p>
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(p.rating) ? "fill-current text-sale" : "text-muted-foreground"}`} />
            ))}
            <span className="ml-1 text-xs text-muted-foreground">
              {bn(p.rating)} ({bn(p.reviews)} রিভিউ)
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary-dark">৳{bn(p.price)}</span>
            {p.mrp > p.price && <span className="text-sm text-muted-foreground line-through">৳{bn(p.mrp)}</span>}
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div><dt className="text-muted-foreground">ব্র্যান্ড</dt><dd className="font-semibold">{p.brand}</dd></div>
            <div><dt className="text-muted-foreground">জেনেরিক</dt><dd className="font-semibold">{p.generic}</dd></div>
            <div><dt className="text-muted-foreground">ধরন</dt><dd className="font-semibold">{p.form}</dd></div>
            <div><dt className="text-muted-foreground">প্যাক সাইজ</dt><dd className="font-semibold">{p.pack}</dd></div>
          </dl>

          {p.rx && (
            <p className="mt-3 rounded-lg border border-sale/40 bg-sale/10 p-2 text-[11px] font-semibold text-sale">
              এই ঔষধটি কিনতে ডাক্তারের প্রেসক্রিপশন প্রয়োজন।{" "}
              <Link to="/prescription" className="underline">আপলোড করুন</Link>
            </p>
          )}

          {p.stock <= 0 ? (
            <p className="mt-3 rounded-lg bg-secondary p-2 text-[11px] font-bold text-sale">এই পণ্যটির স্টক শেষ।</p>
          ) : p.stock <= p.lowStock ? (
            <p className="mt-3 rounded-lg bg-secondary p-2 text-[11px] font-bold text-sale">
              কম স্টক — মাত্র {bn(p.stock)} টি বাকি।
            </p>
          ) : null}

          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
              <button onClick={() => setLocalQty((q) => Math.max(1, q - 1))} aria-label="কমান"><Minus className="h-4 w-4" /></button>
              <span className="text-sm font-bold">{bn(qty)}</span>
              <button
                disabled={qty >= p.stock}
                onClick={() => setLocalQty((q) => Math.min(p.stock, q + 1))}
                aria-label="বাড়ান"
                className="disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {line ? (
              <div className="flex flex-1 items-center gap-2">
                <span className="text-xs font-semibold text-primary">কার্টে {bn(line.qty)} টি আছে</span>
                <Link to="/cart" className="ml-auto rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground">
                  কার্ট দেখুন
                </Link>
                <button onClick={() => setQty(p.id, 0)} className="rounded-lg border border-border px-3 py-2.5 text-xs font-semibold">
                  সরান
                </button>
              </div>
            ) : (
              <button
                disabled={p.stock <= 0}
                onClick={() => add(toLine(p), Math.min(qty, p.stock))}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {p.stock <= 0 ? "স্টক শেষ" : "কার্টে যোগ করুন"}
              </button>
            )}
            <button onClick={() => toggleWish(p.id)} className="rounded-lg border border-border p-2.5" aria-label="উইশলিস্ট">
              <Heart className={`h-4 w-4 ${wishlist.includes(p.id) ? "fill-current text-sale" : ""}`} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-[10px]">
            {[
              { icon: Truck, t: "ঢাকায় ২ ঘণ্টায়" },
              { icon: ShieldCheck, t: "১০০% অরিজিনাল" },
              { icon: RotateCcw, t: "সহজ রিটার্ন" },
            ].map(({ icon: Icon, t }) => (
              <div key={t} className="rounded-lg border border-border bg-card p-2 text-center">
                <Icon className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 font-semibold">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="pt-6">
        <h2 className="mb-2 text-sm font-bold">পণ্যের বিবরণ</h2>
        <p className="rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
      </section>

      <section className="pt-6">
        <h2 className="mb-2 text-sm font-bold">সম্পর্কিত পণ্য</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {related.map((r) => (
            <ProductCard key={r.id} p={r} />
          ))}
        </div>
      </section>
    </div>
  );
}
