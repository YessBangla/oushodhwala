import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("FORBIDDEN");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

const PACK_RE = /data-src="(https:\/\/medex\.com\.bd\/storage\/images\/packaging\/[^"]+)"/g;
const OG_RE = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function fetchText(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; OushodhwalaBot/1.0)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

/** Scrape one product's real packaging photos. Returns box + medicine image URLs. */
async function scrapeOne(source: string, product: { id: string; en: string; name: string }) {
  if (source === "medex") {
    const bid = product.id.startsWith("mx-") ? product.id.slice(3) : "";
    if (!bid) throw new Error("NO_MEDEX_ID");
    const html = await fetchText(`https://medex.com.bd/brands/${bid}/x`);
    const imgs: string[] = [];
    for (const m of html.matchAll(PACK_RE)) if (!imgs.includes(m[1]!)) imgs.push(m[1]!);
    if (imgs.length === 0) throw new Error("NO_IMAGE_ON_PAGE");
    return { box: imgs[0]!, medicine: imgs[1] ?? "" };
  }
  const slug = slugify(product.en || product.name);
  if (!slug) throw new Error("NO_SLUG");
  const html = await fetchText(`https://medeasy.health/medicines/${slug}`);
  const og = OG_RE.exec(html)?.[1] ?? "";
  if (!og || og.includes("Medeasy-website") || og.includes("default-medicine")) throw new Error("NO_IMAGE_ON_PAGE");
  return { box: og, medicine: "" };
}

export const getImageAuditSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context as Ctx);
    const statuses = ["ok", "placeholder", "duplicate", "missing", "broken"];
    const counts: Record<string, number> = {};
    await Promise.all(
      statuses.map(async (s) => {
        const { count } = await admin.from("product_image_audit").select("product_id", { count: "exact", head: true }).eq("status", s);
        counts[s] = count ?? 0;
      }),
    );
    const { count: total } = await admin.from("product_image_audit").select("product_id", { count: "exact", head: true });
    const { count: withMedicine } = await admin
      .from("product_image_audit").select("product_id", { count: "exact", head: true }).neq("medicine_url", "");
    const { data: last } = await admin.from("product_image_audit").select("checked_at").order("checked_at", { ascending: false }).limit(1);
    return { counts, total: total ?? 0, withMedicine: withMedicine ?? 0, lastCheckedAt: last?.[0]?.checked_at ?? null };
  });

export const listImageIssues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string; q?: string; limit?: number; offset?: number }) => d)
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context as Ctx);
    const limit = Math.min(data.limit ?? 40, 200);
    let q = admin.from("product_image_audit").select("*", { count: "exact" });
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    else q = q.neq("status", "ok");
    const term = (data.q ?? "").trim().replace(/[%,()]/g, " ");
    if (term) q = q.or(`product_name.ilike.%${term}%,product_id.ilike.%${term}%`);
    const { data: rows, count } = await q.order("status").order("product_name").range(data.offset ?? 0, (data.offset ?? 0) + limit - 1);
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const exportImageIssuesCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string }) => d)
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context as Ctx);
    let q = admin.from("product_image_audit").select("product_id,product_name,status,box_url,medicine_url,http_status,source,note,checked_at");
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    else q = q.neq("status", "ok");
    const { data: rows } = await q.order("status").order("product_name").limit(30000);
    const head = ["product_id", "product_name", "status", "box_url", "medicine_url", "http_status", "source", "note", "checked_at"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [head.join(","), ...(rows ?? []).map((r: any) => head.map((h) => esc(r[h])).join(","))].join("\n");
    return { csv, rows: rows?.length ?? 0 };
  });

/** Re-verify that stored image URLs actually load (HTTP check) for a batch. */
export const rescanImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number }) => d)
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context as Ctx);
    const limit = Math.min(data.limit ?? 60, 120);
    const { data: prods } = await admin
      .from("products").select("id,name,image_url,medicine_image_url").order("updated_at", { ascending: false }).limit(limit);
    let ok = 0, broken = 0, placeholder = 0, missing = 0;
    const rows = await Promise.all(
      (prods ?? []).map(async (p: any) => {
        const url = p.image_url as string;
        let status = "ok", http = 0, note = "";
        if (!url) { status = "missing"; note = "কোনো ছবি নেই"; }
        else if (url.includes("dosage-forms") || url.includes("default-medicine")) { status = "placeholder"; note = "জেনেরিক প্লেসহোল্ডার ছবি"; }
        else {
          try {
            const r = await fetch(url, { method: "GET", headers: { Range: "bytes=0-64" } });
            http = r.status;
            if (!r.ok) { status = "broken"; note = `HTTP ${r.status}`; }
          } catch (e) { status = "broken"; note = String(e).slice(0, 80); }
        }
        if (status === "ok") ok++; else if (status === "broken") broken++; else if (status === "placeholder") placeholder++; else missing++;
        return {
          product_id: p.id, product_name: p.name, box_url: url ?? "", medicine_url: p.medicine_image_url ?? "",
          status, http_status: http, source: url?.includes("medeasy") ? "medeasy" : url?.includes("medex") ? "medex" : "",
          note, checked_at: new Date().toISOString(),
        };
      }),
    );
    if (rows.length) await admin.from("product_image_audit").upsert(rows, { onConflict: "product_id" });
    return { checked: rows.length, ok, broken, placeholder, missing };
  });

/** Import real packaging photos from medex.com.bd / medeasy.health. */
export const runImageImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { source?: "medex" | "medeasy"; mode?: "missing" | "failed"; limit?: number; runId?: string }) => d)
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context as Ctx);
    const source = data.source ?? "medex";
    const mode = data.mode ?? "missing";
    const limit = Math.min(data.limit ?? 25, 40);

    let targets: { id: string; en: string; name: string }[] = [];
    let failureIds: Record<string, string> = {};
    if (mode === "failed") {
      let fq = admin.from("image_import_failures").select("id,product_id").eq("resolved", false).eq("source", source);
      if (data.runId) fq = fq.eq("run_id", data.runId);
      const { data: fails } = await fq.limit(limit);
      const ids = (fails ?? []).map((f: any) => f.product_id);
      for (const f of fails ?? []) failureIds[f.product_id] = f.id;
      if (ids.length) {
        const { data: ps } = await admin.from("products").select("id,en,name").in("id", ids);
        targets = ps ?? [];
      }
    } else {
      const { data: bad } = await admin
        .from("product_image_audit").select("product_id").in("status", ["placeholder", "missing", "broken", "duplicate"]).limit(limit);
      const ids = (bad ?? []).map((b: any) => b.product_id);
      if (ids.length) {
        const { data: ps } = await admin.from("products").select("id,en,name").in("id", ids);
        targets = ps ?? [];
      }
    }

    const { data: run } = await admin
      .from("image_import_runs").insert({ source, mode, status: "running", total: targets.length }).select().single();

    let okCount = 0, failCount = 0;
    for (const p of targets) {
      try {
        const { box, medicine } = await scrapeOne(source, p);
        await admin.from("products").update({ image_url: box, medicine_image_url: medicine }).eq("id", p.id);
        await admin.from("product_image_audit").upsert(
          {
            product_id: p.id, product_name: p.name, box_url: box, medicine_url: medicine,
            status: "ok", http_status: 200, source, note: "", checked_at: new Date().toISOString(),
          },
          { onConflict: "product_id" },
        );
        const assets = [box, medicine].filter(Boolean).map((url) => ({ url, name: p.name, kind: url === box ? "box" : "medicine", tags: [source] }));
        if (assets.length) await admin.from("media_assets").insert(assets);
        if (failureIds[p.id]) await admin.from("image_import_failures").update({ resolved: true }).eq("id", failureIds[p.id]);
        okCount++;
      } catch (e) {
        failCount++;
        const reason = String((e as Error).message ?? e).slice(0, 200);
        if (failureIds[p.id]) {
          const { data: prev } = await admin.from("image_import_failures").select("attempts").eq("id", failureIds[p.id]).maybeSingle();
          await admin.from("image_import_failures").update({ reason, attempts: (prev?.attempts ?? 1) + 1, run_id: run?.id }).eq("id", failureIds[p.id]);
        } else {
          await admin.from("image_import_failures").upsert(
            { run_id: run?.id, product_id: p.id, product_name: p.name, source, reason, url: "" },
            { onConflict: "product_id,source", ignoreDuplicates: false },
          );
        }
      }
    }

    await admin
      .from("image_import_runs")
      .update({ status: "done", ok_count: okCount, fail_count: failCount, finished_at: new Date().toISOString() })
      .eq("id", run?.id);

    return { runId: run?.id ?? "", total: targets.length, ok: okCount, failed: failCount };
  });

export const listImportRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context as Ctx);
    const { data: runs } = await admin.from("image_import_runs").select("*").order("created_at", { ascending: false }).limit(25);
    const { data: fails, count } = await admin
      .from("image_import_failures").select("*", { count: "exact" }).eq("resolved", false).order("updated_at", { ascending: false }).limit(100);
    return { runs: runs ?? [], failures: fails ?? [], failureCount: count ?? 0 };
  });
