import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SITE = "https://oushodhwala.lovable.app";

const STATIC_PATHS = [
  "/",
  "/products",
  "/categories",
  "/offers",
  "/lab-test",
  "/home-diagnostics",
  "/home-services",
  "/doctor-consultation",
  "/prescription",
  "/about",
  "/help",
  "/contact",
  "/privacy",
  "/terms",
  "/refund-policy",
];


function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function url(loc: string, priority: string, changefreq = "weekly") {
  return `  <url><loc>${esc(SITE + loc)}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

/** SEO sitemap — static pages + active categories + top products */
export const Route = createFileRoute("/api/public/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const supabaseUrl = process.env["SUPABASE_URL"] ?? "";
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
        const lines: string[] = STATIC_PATHS.map((p) => url(p, p === "/" ? "1.0" : "0.7", "daily"));

        if (supabaseUrl && key) {
          const supabase = createClient<Database>(supabaseUrl, key, {
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

          const [cats, prods] = await Promise.all([
            supabase.from("categories").select("slug").eq("active", true).limit(200),
            supabase
              .from("products")
              .select("id")
              .eq("active", true)
              .order("reviews", { ascending: false })
              .limit(5000),
          ]);

          for (const c of cats.data ?? []) lines.push(url(`/category/${c.slug}`, "0.8"));
          for (const p of prods.data ?? []) lines.push(url(`/product/${encodeURIComponent(p.id)}`, "0.6"));
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join("\n")}\n</urlset>\n`;

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
