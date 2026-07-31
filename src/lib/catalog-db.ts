import { useQuery } from "@tanstack/react-query";
import { getCatalog } from "./catalog.functions";
import {
  products as staticProducts,
  categories as staticCategories,
  type Product,
  type Category,
} from "@/data/catalog";

export type ShopProduct = Product & {
  stock: number;
  lowStock: number;
};

export type ShopOffer = {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  emoji: string;
  discountPct: number;
  minOrder: number;
  maxDiscount: number;
};

export type Catalog = {
  products: ShopProduct[];
  categories: Category[];
  offers: ShopOffer[];
};

const fallback: Catalog = {
  products: staticProducts.map((p) => ({ ...p, stock: 50, lowStock: 10 })),
  categories: staticCategories,
  offers: [],
};

export const catalogQueryKey = ["catalog"] as const;

export function useCatalog(): Catalog {
  const { data } = useQuery({
    queryKey: catalogQueryKey,
    queryFn: () => getCatalog(),
    staleTime: 30_000,
    select: (raw): Catalog => ({
      products: raw.products.map((r) => ({
        id: r.id,
        name: r.name,
        en: r.en,
        brand: r.brand,
        generic: r.generic,
        form: r.form,
        pack: r.pack,
        price: Number(r.price),
        mrp: Number(r.mrp),
        category: r.category,
        rx: r.rx,
        rating: Number(r.rating),
        reviews: r.reviews,
        emoji: r.emoji,
        desc: r.description,
        stock: r.stock,
        lowStock: r.low_stock_threshold,
      })),
      categories: raw.categories.map((c) => ({ slug: c.slug, bn: c.bn, en: c.en, emoji: c.emoji })),
      offers: raw.offers.map((o) => ({
        id: o.id,
        code: o.code,
        title: o.title,
        subtitle: o.subtitle,
        emoji: o.emoji,
        discountPct: Number(o.discount_pct),
        minOrder: Number(o.min_order),
        maxDiscount: Number(o.max_discount),
      })),
    }),
  });

  if (!data || data.products.length === 0) return fallback;
  return data;
}
