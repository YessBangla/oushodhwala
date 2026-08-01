import { createFileRoute } from "@tanstack/react-router";

/** পরিষ্কার করা (ওয়াটারমার্কমুক্ত) ছবি সার্ভ করার পাবলিক রুট */
export const Route = createFileRoute("/api/public/img/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || path.includes("..")) return new Response("Bad path", { status: 400 });

        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!url || !key) return new Response("Not configured", { status: 500 });

        const res = await fetch(`${url}/storage/v1/object/product-images/${path}`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        if (!res.ok) return new Response("Not found", { status: 404 });

        return new Response(res.body, {
          status: 200,
          headers: {
            "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
