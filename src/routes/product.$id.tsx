import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Star, Truck, ShieldCheck, Minus, Plus, RotateCcw } from "lucide-react";
import { bn } from "@/data/catalog";
import { mapProduct, type ShopProduct } from "@/lib/catalog-db";
import { getProductById } from "@/lib/catalog.functions";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";

import { useStore, toLine } from "@/lib/store";
import { useLang, pick } from "@/lib/lang";


export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => {
    const res = await getProductById({ data: { id: params.id } });
    if (!res) throw notFound();
    return {
      product: mapProduct(res.row),
      related: res.related.map(mapProduct),
      variants: res.variants ?? [],
      generic: res.generic ?? null,
    };
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

type Variant = {
  id: string;
  name: string;
  en: string;
  strength: string;
  form: string;
  pack: string;
  price: number | string;
  stock: number;
};

type GenericInfo = Record<string, string | null> | null;

function ProductPage() {
  const { product: p, related, variants, generic } = Route.useLoaderData() as {
    product: ShopProduct;
    related: ShopProduct[];
    variants: Variant[];
    generic: GenericInfo;
  };
  const { lang } = useLang();
  const isEn = lang === "en";
  const g = (k: string) => ((generic?.[k] as string) ?? "").trim();

  const { add, cart, setQty, wishlist, toggleWish } = useStore();
  const [qty, setLocalQty] = useState(1);

  const [shot, setShot] = useState(0);
  const shots = [p.image, p.medicineImage].filter(Boolean) as string[];
  const line = cart.find((l) => l.id === p.id);
  const off = Math.round(((p.mrp - p.price) / p.mrp) * 100);

  return (
    <div className="pt-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-xl border border-border bg-secondary">
          <ProductImage
            src={shots[Math.min(shot, Math.max(shots.length - 1, 0))]}
            alt={`${p.name} — ${shot === 1 ? "ঔষধের ছবি" : "বক্সের ছবি"}`}
            emoji={p.emoji}
            ratio="square"
            eager
            className="max-h-[22rem]"
          />
          {off > 0 && (
            <span className="absolute left-3 top-3 rounded bg-sale px-2 py-0.5 text-[11px] font-bold text-sale-foreground">
              {bn(off)}% OFF
            </span>
          )}
          {shots.length > 1 && (
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2">
              {shots.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setShot(i)}
                  aria-label={i === 0 ? "বক্সের ছবি" : "ঔষধের ছবি"}
                  className={`h-12 w-12 overflow-hidden rounded-lg border bg-background ${i === shot ? "border-primary" : "border-border"}`}
                >
                  <img src={src} alt="" width={48} height={48} loading="lazy" className="h-full w-full object-contain p-0.5" />
                </button>
              ))}
            </div>
          )}
        </div>



        <div>
          <h1 className="text-lg font-bold leading-snug">{isEn ? p.en || p.name : p.name}</h1>
          {!isEn && p.en && <p className="mt-1 text-xs text-muted-foreground">{p.en}</p>}
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(p.rating) ? "fill-current text-sale" : "text-muted-foreground"}`} />
            ))}
            <span className="ml-1 text-xs text-muted-foreground">
              {isEn ? `${p.rating} (${p.reviews} reviews)` : `${bn(p.rating)} (${bn(p.reviews)} রিভিউ)`}
            </span>
          </div>


          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary-dark">৳{bn(p.price)}</span>
            {p.mrp > p.price && <span className="text-sm text-muted-foreground line-through">৳{bn(p.mrp)}</span>}
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div><dt className="text-muted-foreground">{isEn ? "Brand" : "ব্র্যান্ড"}</dt><dd className="font-semibold">{p.brand}</dd></div>
            <div><dt className="text-muted-foreground">{isEn ? "Generic" : "জেনেরিক"}</dt><dd className="font-semibold">{p.generic}</dd></div>
            <div><dt className="text-muted-foreground">{isEn ? "Dosage form" : "ধরন"}</dt><dd className="font-semibold">{p.form}</dd></div>
            <div><dt className="text-muted-foreground">{isEn ? "Pack size" : "প্যাক সাইজ"}</dt><dd className="font-semibold">{p.pack}</dd></div>
            {p.strength && (
              <div><dt className="text-muted-foreground">{isEn ? "Strength" : "মাত্রা"}</dt><dd className="font-semibold">{p.strength}</dd></div>
            )}
            {pick(lang, p.therapeuticClass || g("therapeutic_class"), p.therapeuticClassEn || g("therapeutic_class_en")) && (
              <div>
                <dt className="text-muted-foreground">{isEn ? "Therapeutic class" : "থেরাপিউটিক ক্লাস"}</dt>
                <dd className="font-semibold">
                  {pick(lang, p.therapeuticClass || g("therapeutic_class"), p.therapeuticClassEn || g("therapeutic_class_en"))}
                </dd>
              </div>
            )}
          </dl>


          {variants.length > 1 && (
            <div className="mt-3">
              <p className="text-xs font-bold">{isEn ? "Available strengths" : "উপলব্ধ মাত্রা ও ধরন"}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {variants.map((v) => {
                  const active = v.id === p.id;
                  return (
                    <Link
                      key={v.id}
                      to="/product/$id"
                      params={{ id: v.id }}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                        active ? "border-primary bg-primary/10 text-primary-dark" : "border-border bg-card"
                      } ${v.stock <= 0 ? "opacity-60" : ""}`}
                    >
                      <span>{v.strength || v.en || v.name}</span>
                      <span className="ml-1 text-muted-foreground">· {v.form}</span>
                      <span className="ml-1 text-muted-foreground">৳{bn(Number(v.price))}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}


          {p.rx && (
            <p className="mt-3 rounded-lg border border-sale/40 bg-sale/10 p-2 text-[11px] font-semibold text-sale">
              {isEn ? "A doctor's prescription is required to buy this medicine." : "এই ঔষধটি কিনতে ডাক্তারের প্রেসক্রিপশন প্রয়োজন।"}{" "}
              <Link to="/prescription" className="underline">{isEn ? "Upload" : "আপলোড করুন"}</Link>
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
                {p.stock <= 0 ? (isEn ? "Out of stock" : "স্টক শেষ") : isEn ? "Add to cart" : "কার্টে যোগ করুন"}
              </button>
            )}
            <button onClick={() => toggleWish(p.id)} className="rounded-lg border border-border p-2.5" aria-label="উইশলিস্ট">
              <Heart className={`h-4 w-4 ${wishlist.includes(p.id) ? "fill-current text-sale" : ""}`} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-[10px]">
            {[
              { icon: Truck, t: isEn ? "2-hour Dhaka delivery" : "ঢাকায় ২ ঘণ্টায়" },
              { icon: ShieldCheck, t: isEn ? "100% authentic" : "১০০% অরিজিনাল" },
              { icon: RotateCcw, t: isEn ? "Easy returns" : "সহজ রিটার্ন" },
            ].map(({ icon: Icon, t }) => (
              <div key={t} className="rounded-lg border border-border bg-card p-2 text-center">
                <Icon className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 font-semibold">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(pick(lang, p.desc, p.descEn) || p.manufacturer) && (
        <section className="pt-6">
          <h2 className="mb-2 text-sm font-bold">{isEn ? "Product Description" : "পণ্যের বিবরণ"}</h2>
          <div className="space-y-2 rounded-xl border border-border bg-card p-3 text-xs leading-relaxed">
            {pick(lang, p.desc, p.descEn) && (
              <p className="text-muted-foreground">{pick(lang, p.desc, p.descEn)}</p>
            )}
            {p.manufacturer && (
              <p>
                <span className="font-semibold">{isEn ? "Manufacturer:" : "প্রস্তুতকারক:"}</span>{" "}
                <span className="text-muted-foreground">{p.manufacturer}</span>
              </p>
            )}
          </div>
        </section>
      )}


      {[
        { bnT: "নির্দেশনা", enT: "Indications", bnv: p.indications || g("indications"), env: p.indicationsEn || g("indications_en") },
        { bnT: "ফার্মাকোলজি", enT: "Pharmacology", bnv: g("pharmacology"), env: g("pharmacology_en") },
        { bnT: "মাত্রা ও সেবনবিধি", enT: "Dosage & Administration", bnv: p.dosage || g("dosage"), env: p.dosageEn || g("dosage_en") },
        { bnT: "ঔষধের মিথস্ক্রিয়া", enT: "Interaction", bnv: g("interaction"), env: g("interaction_en") },
        { bnT: "প্রতিনির্দেশনা", enT: "Contraindications", bnv: p.contraindications || g("contraindications"), env: p.contraindicationsEn || g("contraindications_en") },
        { bnT: "পার্শ্বপ্রতিক্রিয়া", enT: "Side Effects", bnv: p.sideEffects || g("side_effects"), env: p.sideEffectsEn || g("side_effects_en") },
        { bnT: "গর্ভাবস্থায় ও স্তন্যদানকালে", enT: "Pregnancy & Lactation", bnv: p.pregnancy || g("pregnancy"), env: p.pregnancyEn || g("pregnancy_en") },
        { bnT: "সতর্কতা", enT: "Precautions & Warnings", bnv: p.precautions || g("precautions"), env: p.precautionsEn || g("precautions_en") },
        { bnT: "বিশেষ ক্ষেত্রে ব্যবহার", enT: "Use in Special Populations", bnv: g("special_populations"), env: g("special_populations_en") },
        { bnT: "মাত্রাধিক্য", enT: "Overdose Effects", bnv: g("overdose"), env: g("overdose_en") },
        { bnT: "থেরাপিউটিক ক্লাস", enT: "Therapeutic Class", bnv: p.therapeuticClass || g("therapeutic_class"), env: p.therapeuticClassEn || g("therapeutic_class_en") },
        { bnT: "সংরক্ষণ", enT: "Storage Conditions", bnv: p.storage || g("storage"), env: p.storageEn || g("storage_en") },
      ]
        .map((s) => ({ t: isEn ? s.enT : s.bnT, body: pick(lang, s.bnv, s.env) }))
        .filter((s) => s.body)
        .map((s) => (
          <section key={s.t} className="pt-6">
            <h2 className="mb-2 text-sm font-bold">{s.t}</h2>
            <div className="space-y-2 rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
              <p className="whitespace-pre-line">{s.body}</p>
            </div>
          </section>
        ))}




      <section className="pt-6">
        <h2 className="mb-2 text-sm font-bold">{isEn ? "Related products" : "সম্পর্কিত পণ্য"}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {related.map((r) => (
            <ProductCard key={r.id} p={r} />
          ))}
        </div>
      </section>
    </div>
  );
}
