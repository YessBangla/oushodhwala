import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const url = process.env["SUPABASE_URL"] ?? "";
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const [p, c, o, l, d, s] = await Promise.all([
    supabase.from("products").select("*").eq("active", true).order("reviews", { ascending: false }).order("name").limit(120),
    supabase.from("categories").select("*").eq("active", true).order("sort_order"),
    supabase.from("offers").select("*").eq("active", true).order("created_at"),
    supabase.from("lab_tests").select("*").eq("active", true).order("sort_order"),
    supabase.from("doctors").select("*").eq("active", true).order("sort_order"),
    supabase.from("app_settings").select("key, value"),
  ]);
  return {
    products: p.data ?? [],
    categories: c.data ?? [],
    offers: o.data ?? [],
    labTests: l.data ?? [],
    doctors: d.data ?? [],
    settings: s.data ?? [],
  };
});

export const searchProducts = createServerFn({ method: "GET" })
  .inputValidator((d: { q?: string; category?: string; sort?: string; rx?: boolean; maxPrice?: number; offset?: number; limit?: number }) => d)
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const limit = Math.min(data.limit ?? 40, 60);
    const offset = data.offset ?? 0;
    let q = supabase.from("products").select("*", { count: "exact" }).eq("active", true);
    if (data.category && data.category !== "all") q = q.eq("category", data.category);
    if (data.rx) q = q.eq("rx", true);
    if (data.maxPrice) q = q.lte("price", data.maxPrice);
    const term = (data.q ?? "").trim().replace(/[%,()]/g, " ");
    if (term) q = q.or(`name.ilike.%${term}%,en.ilike.%${term}%,brand.ilike.%${term}%,generic.ilike.%${term}%`);
    if (data.sort === "low") q = q.order("price", { ascending: true });
    else if (data.sort === "high") q = q.order("price", { ascending: false });
    else if (data.sort === "rating") q = q.order("rating", { ascending: false });
    else q = q.order("reviews", { ascending: false }).order("name");
    const { data: rows, count } = await q.range(offset, offset + limit - 1);
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const getProductById = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: row } = await supabase.from("products").select("*").eq("id", data.id).maybeSingle();
    if (!row) return null;
    const [{ data: related }, { data: variants }, { data: generic }] = await Promise.all([
      supabase.from("products").select("*").eq("active", true).eq("category", row.category).neq("id", row.id).limit(4),
      row.base_name
        ? supabase
            .from("products")
            .select("id, name, en, strength, form, pack, price, mrp, stock, emoji, image_url")
            .eq("active", true)
            .eq("base_name", row.base_name)
            .eq("brand", row.brand)
            .order("form")
            .limit(30)
        : Promise.resolve({ data: [] as never[] }),
      supabase
        .from("generic_info")
        .select("*")
        .eq("key", (row.generic ?? "").trim().toLowerCase())
        .maybeSingle(),
    ]);
    return { row, related: related ?? [], variants: variants ?? [], generic: generic ?? null };
  });

