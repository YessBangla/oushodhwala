import { publicClient } from "@/lib/public-supabase.server";

export type SharedMed = {
  name: string;
  generic: string;
  strength: string;
  form: string;
  dose: string;
  duration: string;
  instruction: string;
  price?: number;
  productId?: string;
  inStock?: boolean;
};

/** শেয়ার লিংকে দাম দেখানোর অনুমতি থাকলে ক্যাটালগ থেকে সেরা মিল বের করে */
export async function attachPrices(items: SharedMed[]): Promise<SharedMed[]> {
  const sb = publicClient();
  const out: SharedMed[] = [];
  for (const it of items) {
    const term = (it.name || it.generic || "").replace(/[%,()]/g, " ").trim();
    if (!term) {
      out.push(it);
      continue;
    }
    const { data } = await sb
      .from("products")
      .select("id, name, en, generic, strength, price, stock")
      .eq("active", true)
      .or(`en.ilike.%${term}%,brand.ilike.%${term}%,name.ilike.%${term}%,generic.ilike.%${term}%`)
      .order("stock", { ascending: false })
      .limit(5);
    const rows = data ?? [];
    const num = (s: string) => (s.match(/\d+(\.\d+)?/g) ?? []).join(" ");
    const best =
      rows.find((r) => it.strength && num(r.strength ?? "") === num(it.strength)) ?? rows[0];
    out.push(
      best
        ? { ...it, price: Number(best.price ?? 0), productId: String(best.id), inStock: Number(best.stock ?? 0) > 0 }
        : it,
    );
  }
  return out;
}
