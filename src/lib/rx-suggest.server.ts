import { expandQuery } from "@/lib/bn-search";
import { publicClient } from "@/lib/public-supabase.server";

export type MedSuggestion = {
  id: string;
  name: string;
  en: string;
  brand: string;
  generic: string;
  strength: string;
  form: string;
  pack: string;
  price: number;
  mrp: number;
  stock: number;
  rx: boolean;
  emoji: string;
  image_url: string;
  medicine_image_url: string;
  manufacturer: string;
  therapeutic_class: string;
  therapeutic_class_en: string;
  indications: string;
  indications_en: string;
  dosage: string;
  dosage_en: string;
  side_effects: string;
  side_effects_en: string;
  precautions: string;
  precautions_en: string;
  contraindications: string;
  contraindications_en: string;
  pregnancy: string;
  pregnancy_en: string;
};

/** প্রেসক্রিপশন টেবিলের ঔষধ-পিকারে যে ফিল্ডগুলো দরকার (rx-read এর ম্যাচের মতোই) */
const SELECT =
  "id, name, en, brand, generic, strength, form, pack, price, mrp, stock, rx, emoji, image_url, medicine_image_url, manufacturer, therapeutic_class, therapeutic_class_en, indications, indications_en, dosage, dosage_en, side_effects, side_effects_en, precautions, precautions_en, contraindications, contraindications_en, pregnancy, pregnancy_en";

/** এক অক্ষর লিখলেই ডাটাবেজ থেকে মিল করা ঔষধের তালিকা */
export async function suggestMedicineRows(term: string, limit: number): Promise<MedSuggestion[]> {
  const clean = term.replace(/[%,()]/g, " ").trim();
  if (!clean) return [];
  const supabase = publicClient();
  const variants = Array.from(new Set([clean, ...expandQuery(clean)])).slice(0, 4);
  const ors = variants.flatMap((v) => [
    `name.ilike.%${v}%`,
    `en.ilike.%${v}%`,
    `brand.ilike.%${v}%`,
    `generic.ilike.%${v}%`,
  ]);
  const { data } = await supabase
    .from("products")
    .select(SELECT)
    .eq("active", true)
    .or(ors.join(","))
    .order("reviews", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as unknown as MedSuggestion[];
  const low = clean.toLowerCase();

  // র\u200d্যাঙ্কিং উন্নত করা হচ্ছে:
  // ১. নাম বা ইংরেজী নাম হুবহু মিলে গেলে সর্বোচ্চ অগ্রাধিকার
  // ২. নাম বা ইংরেজী নাম দিয়ে শুরু হলে অগ্রাধিকার
  // ৩. ব্র্যান্ড বা জেনেরিক দিয়ে শুরু হলে তার পরের অগ্রাধিকার
  return rows.sort((a, b) => {
    const na = String(a.name ?? "").toLowerCase();
    const ea = String(a.en ?? "").toLowerCase();
    const ga = String(a.generic ?? "").toLowerCase();
    const ba = String(a.brand ?? "").toLowerCase();

    const nb = String(b.name ?? "").toLowerCase();
    const eb = String(b.en ?? "").toLowerCase();
    const gb = String(b.generic ?? "").toLowerCase();
    const bb = String(b.brand ?? "").toLowerCase();

    const score = (name: string, en: string, generic: string, brand: string) => {
      if (name === low || en === low) return 0; // হুবহু মিল
      if (name.startsWith(low) || en.startsWith(low)) return 1; // নাম দিয়ে শুরু
      if (brand.startsWith(low) || generic.startsWith(low)) return 2; // ব্র্যান্ড/জেনেরিক দিয়ে শুরু
      return 3; // আংশিক মিল
    };

    const sa = score(na, ea, ga, ba);
    const sb = score(nb, eb, gb, bb);

    if (sa !== sb) return sa - sb;
    // স্কোর সমান হলে স্টকের পরিমাণ বা প্রাইস দিয়েও সর্ট করা যেতে পারে
    return (b.stock || 0) - (a.stock || 0);
  });
}
