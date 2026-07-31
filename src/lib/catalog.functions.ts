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
  const [p, c, o] = await Promise.all([
    supabase.from("products").select("*").eq("active", true).order("name"),
    supabase.from("categories").select("*").eq("active", true).order("sort_order"),
    supabase.from("offers").select("*").eq("active", true).order("created_at"),
  ]);
  return {
    products: p.data ?? [],
    categories: c.data ?? [],
    offers: o.data ?? [],
  };
});
