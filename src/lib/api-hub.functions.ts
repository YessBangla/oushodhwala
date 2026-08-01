import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertStaff(context: Ctx) {
  const [{ data: a }, { data: e }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "erp_manager" }),
  ]);
  if (a !== true && e !== true) throw new Error("FORBIDDEN");
}

export type ApiTestInput = {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
};

export type ApiTestResult = {
  ok: boolean;
  status: number;
  ms: number;
  contentType: string;
  excerpt: string;
  error: string;
};

/** সার্ভার থেকে যেকোনো API কল করে ফলাফল ফেরত দেয় (CORS সমস্যা এড়ায়) */
export const runApiTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ApiTestInput) => input)
  .handler(async ({ data, context }): Promise<ApiTestResult> => {
    await assertStaff(context as unknown as Ctx);

    const method = (data.method || "GET").toUpperCase();
    let url = (data.url || "").trim();
    if (!url) throw new Error("URL_REQUIRED");
    if (url.startsWith("/")) {
      const origin = process.env["PUBLIC_ORIGIN"] || "http://localhost:8080";
      url = origin.replace(/\/$/, "") + url;
    }
    if (!/^https?:\/\//i.test(url)) throw new Error("BAD_URL");

    const headers: Record<string, string> = { ...(data.headers ?? {}) };
    if (data.body && !headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }

    const started = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, {
        method,
        headers,
        body: method === "GET" || method === "HEAD" ? undefined : (data.body || undefined),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const text = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        ms: Date.now() - started,
        contentType: res.headers.get("content-type") ?? "",
        excerpt: text.slice(0, 4000),
        error: "",
      };
    } catch (err) {
      return {
        ok: false,
        status: 0,
        ms: Date.now() - started,
        contentType: "",
        excerpt: "",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });
