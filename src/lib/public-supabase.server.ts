import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** সার্ভার-সাইড পাবলিক (anon) Supabase ক্লায়েন্ট — RLS প্রযোজ্য */
export function publicClient() {
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
