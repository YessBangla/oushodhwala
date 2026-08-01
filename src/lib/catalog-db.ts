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
  image: string;
  medicineImage?: string;
  descEn: string;
  indications: string;
  indicationsEn: string;
  dosage: string;
  dosageEn: string;
  sideEffects: string;
  sideEffectsEn: string;
  manufacturer: string;
  strength: string;
  baseName: string;
  contraindications: string;
  contraindicationsEn: string;
  pregnancy: string;
  pregnancyEn: string;
  precautions: string;
  precautionsEn: string;
  therapeuticClass: string;
  therapeuticClassEn: string;
  storage: string;
  storageEn: string;
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

export type ShopLabTest = {
  id: string;
  bn: string;
  en: string;
  price: number;
  mrp: number;
  group: string;
  prep: string;
};

export type ShopDoctor = {
  id: string;
  name: string;
  spec: string;
  degree: string;
  exp: string;
  fee: number;
  emoji: string;
  photo: string;
  phone: string;
  whatsapp: string;
  videoUrl: string;
  online: boolean;
  workStart: string;
  workEnd: string;
  slotMinutes: number;
  workDays: number[];
};

export type ShopSettings = {
  deliveryFee: number;
  freeDeliveryMin: number;
  supportPhone: string;
  announcement: string;
  cod: boolean;
  bkash: boolean;
  nagad: boolean;
  card: boolean;
  expressEnabled: boolean;
  expressFee: number;
  expressEta: string;
  emergencyPhone: string;
};

export type Catalog = {
  products: ShopProduct[];
  categories: Category[];
  offers: ShopOffer[];
  labTests: ShopLabTest[];
  doctors: ShopDoctor[];
  settings: ShopSettings;
};

export const defaultSettings: ShopSettings = {
  deliveryFee: 60,
  freeDeliveryMin: 500,
  supportPhone: "09610-000000",
  announcement: "",
  cod: true,
  bkash: true,
  nagad: true,
  card: true,
  expressEnabled: true,
  expressFee: 120,
  expressEta: "৩০–৬০ মিনিট",
  emergencyPhone: "01700-000911",
};

const fallback: Catalog = {
  products: staticProducts.map((p) => ({
    ...p,
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
    strength: "",
    baseName: "",
    contraindications: "",
    contraindicationsEn: "",
    pregnancy: "",
    pregnancyEn: "",
    precautions: "",
    precautionsEn: "",
    therapeuticClass: "",
    therapeuticClassEn: "",
    storage: "",
    storageEn: "",
  })),
  categories: staticCategories,
  offers: [],
  labTests: [],
  doctors: [],
  settings: defaultSettings,
};

type ProductRow = Awaited<ReturnType<typeof getCatalog>>["products"][number];

export function mapProduct(r: ProductRow): ShopProduct {
  return {
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
    image: r.image_url ?? "",
    medicineImage: (r as { medicine_image_url?: string }).medicine_image_url ?? "",
    descEn: r.description_en ?? "",
    indications: r.indications ?? "",
    indicationsEn: r.indications_en ?? "",
    dosage: r.dosage ?? "",
    dosageEn: r.dosage_en ?? "",
    sideEffects: r.side_effects ?? "",
    sideEffectsEn: r.side_effects_en ?? "",
    manufacturer: r.manufacturer ?? "",
    strength: (r as { strength?: string }).strength ?? "",
    baseName: (r as { base_name?: string }).base_name ?? "",
    contraindications: (r as { contraindications?: string }).contraindications ?? "",
    contraindicationsEn: (r as { contraindications_en?: string }).contraindications_en ?? "",
    pregnancy: (r as { pregnancy?: string }).pregnancy ?? "",
    pregnancyEn: (r as { pregnancy_en?: string }).pregnancy_en ?? "",
    precautions: (r as { precautions?: string }).precautions ?? "",
    precautionsEn: (r as { precautions_en?: string }).precautions_en ?? "",
    therapeuticClass: (r as { therapeutic_class?: string }).therapeutic_class ?? "",
    therapeuticClassEn: (r as { therapeutic_class_en?: string }).therapeutic_class_en ?? "",
    storage: (r as { storage?: string }).storage ?? "",
    storageEn: (r as { storage_en?: string }).storage_en ?? "",
  };
}

export const catalogQueryKey = ["catalog"] as const;

export function useCatalog(): Catalog {
  const { data } = useQuery({
    queryKey: catalogQueryKey,
    queryFn: () => getCatalog(),
    staleTime: 30_000,
    select: (raw): Catalog => {
      const map = new Map((raw.settings ?? []).map((s) => [s.key, s.value]));
      const num = (k: string, d: number) => {
        const v = Number(map.get(k));
        return Number.isFinite(v) ? v : d;
      };
      const bool = (k: string) => map.get(k) !== "false";
      return {
        products: raw.products.map(mapProduct),
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
        labTests: (raw.labTests ?? []).map((t) => ({
          id: t.id,
          bn: t.bn,
          en: t.en,
          price: Number(t.price),
          mrp: Number(t.mrp),
          group: t.grp,
          prep: t.prep,
        })),
        doctors: (raw.doctors ?? []).map((d) => ({
          id: d.id,
          name: d.name,
          spec: d.spec,
          degree: d.degree,
          exp: d.exp,
          fee: Number(d.fee),
          emoji: d.emoji,
          photo: d.photo_url ?? "",
          phone: (d as { phone?: string }).phone ?? "",
          whatsapp: (d as { whatsapp?: string }).whatsapp ?? "",
          videoUrl: (d as { video_url?: string }).video_url ?? "",
          online: (d as { online?: boolean }).online ?? true,
          workStart: (d as { work_start?: string }).work_start || "10:00",
          workEnd: (d as { work_end?: string }).work_end || "22:00",
          slotMinutes: Number((d as { slot_minutes?: number }).slot_minutes ?? 30) || 30,
          workDays: (d as { work_days?: number[] }).work_days ?? [0, 1, 2, 3, 4, 5, 6],
        })),
        settings: {
          deliveryFee: num("delivery_fee", 60),
          freeDeliveryMin: num("free_delivery_min", 500),
          supportPhone: map.get("support_phone") ?? defaultSettings.supportPhone,
          announcement: map.get("announcement") ?? "",
          cod: bool("cod_enabled"),
          bkash: bool("bkash_enabled"),
          nagad: bool("nagad_enabled"),
          card: bool("card_enabled"),
          expressEnabled: bool("express_enabled"),
          expressFee: num("express_fee", 120),
          expressEta: map.get("express_eta") ?? defaultSettings.expressEta,
          emergencyPhone: map.get("emergency_phone") ?? defaultSettings.emergencyPhone,
        },
      };
    },
  });

  if (!data || data.products.length === 0) return fallback;
  return data;
}

/** ডেলিভারি চার্জ হিসাব — ব্যাকএন্ড সেটিংস অনুযায়ী */
export function deliveryChargeFor(payable: number, settings: ShopSettings) {
  if (payable <= 0) return 0;
  return payable >= settings.freeDeliveryMin ? 0 : settings.deliveryFee;
}
