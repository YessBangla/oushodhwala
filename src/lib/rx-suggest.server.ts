import { expandQuery } from "@/lib/bn-search";
import { publicClient } from "@/lib/public-supabase.server";

/** প্রেসক্রিপশন টেবিলের ঔষধ-পিকারে যে ফিল্ডগুলো দরকার (rx-read এর ম্যাচের মতোই) */
const SELECT =
  "id, name, en, brand, generic, strength, form, pack, price, mrp, stock, rx, emoji, image_url, medicine_image_url, manufacturer, therapeutic_class, therapeutic_class_en, indications, indications_en, dosage, dosage_en, side_effects, side_effects_en, precautions, precautions_en, contraindications, contraindications_en, pregnancy, pregnancy_en";

/** এক অক্ষর লিখলেই ডাটাবেজ থেকে মিল করা ঔষধের তালিকা */
export async function suggestMedicineRows(term: string, limit: number) {
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

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const low = clean.toLowerCase();
  // যে নামগুলো লেখা অক্ষর দিয়ে শুরু হয় সেগুলো আগে দেখাই
  return rows.sort((a, b) => {
    const sa = String(a.en ?? a.name ?? "").toLowerCase().startsWith(low) ? 0 : 1;
    const sb = String(b.en ?? b.name ?? "").toLowerCase().startsWith(low) ? 0 : 1;
    return sa - sb;
  });
}
