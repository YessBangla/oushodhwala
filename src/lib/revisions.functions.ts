import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminClient } from "@/lib/authz";

const FIELD_COL: Record<string, string> = { box: "image_url", medicine: "medicine_image_url" };

async function logAudit(
  admin: any,
  row: { product_id: string; product_name?: string; action: string; field: string; from_url: string; to_url: string; revision_id?: string; actor?: string; note?: string },
) {
  await admin.from("image_audit_log").insert({
    product_id: row.product_id,
    product_name: row.product_name ?? "",
    action: row.action,
    field: row.field,
    from_url: row.from_url ?? "",
    to_url: row.to_url ?? "",
    revision_id: row.revision_id ?? null,
    actor: row.actor ?? null,
    note: row.note ?? "",
  });
}

/** গ্যালারির সারসংক্ষেপ */
export const getRevisionSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await adminClient(context as never);
    const statuses = ["pending", "approved", "rejected", "rolled_back"];
    const counts: Record<string, number> = {};
    await Promise.all(
      statuses.map(async (s) => {
        const { count } = await admin.from("image_revisions").select("id", { count: "exact", head: true }).eq("status", s);
        counts[s] = count ?? 0;
      }),
    );
    const { count: total } = await admin.from("image_revisions").select("id", { count: "exact", head: true });
    const { count: altCount } = await admin
      .from("image_revisions").select("id", { count: "exact", head: true }).eq("method", "alt-source");
    const { count: watermarked } = await admin
      .from("products").select("id", { count: "exact", head: true }).like("image_url", "%medex.com.bd/storage%");
    return { counts, total: total ?? 0, altCount: altCount ?? 0, watermarked: watermarked ?? 0 };
  });

/** রিভিশন তালিকা (রিভিউ গ্যালারি) */
export const listRevisions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string; method?: string; q?: string; limit?: number; offset?: number }) => d)
  .handler(async ({ data, context }) => {
    const admin = await adminClient(context as never);
    const limit = Math.min(data.limit ?? 24, 60);
    const offset = data.offset ?? 0;
    let q = admin.from("image_revisions").select("*", { count: "exact" });
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.method && data.method !== "all") q = q.eq("method", data.method);
    const term = (data.q ?? "").trim().replace(/[%,()]/g, " ");
    if (term) q = q.or(`product_name.ilike.%${term}%,product_id.ilike.%${term}%`);
    const { data: rows, count } = await q.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    return { rows: rows ?? [], count: count ?? 0 };
  });

/** অনুমোদন — নতুন ছবি লাইভ করা হয়, আগের ছবি রিভিশনে সংরক্ষিত থাকে */
export const approveRevisions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) => d)
  .handler(async ({ data, context }) => {
    const admin = await adminClient(context as never);
    const ids = (data.ids ?? []).slice(0, 200);
    if (!ids.length) return { applied: 0 };
    const { data: revs } = await admin.from("image_revisions").select("*").in("id", ids).eq("status", "pending");
    let applied = 0;
    for (const r of revs ?? []) {
      const col = FIELD_COL[r.field] ?? "image_url";
      if (!r.after_url) continue;
      const { data: prod } = await admin.from("products").select(`id,${col}`).eq("id", r.product_id).maybeSingle();
      const current = (prod as any)?.[col] ?? r.before_url;
      await admin.from("products").update({ [col]: r.after_url }).eq("id", r.product_id);
      await admin.from("image_revisions").update({
        status: "approved", before_url: current, reviewed_by: (context as Ctx).userId, reviewed_at: new Date().toISOString(),
      }).eq("id", r.id);
      await logAudit(admin, {
        product_id: r.product_id, product_name: r.product_name, action: "approve", field: r.field,
        from_url: current, to_url: r.after_url, revision_id: r.id, actor: (context as Ctx).userId, note: r.method,
      });
      applied++;
    }
    return { applied };
  });

/** বাতিল */
export const rejectRevisions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[]; note?: string }) => d)
  .handler(async ({ data, context }) => {
    const admin = await adminClient(context as never);
    const ids = (data.ids ?? []).slice(0, 200);
    if (!ids.length) return { rejected: 0 };
    const { data: revs } = await admin.from("image_revisions").select("*").in("id", ids);
    for (const r of revs ?? []) {
      await admin.from("image_revisions").update({
        status: "rejected", reviewed_by: (context as Ctx).userId, reviewed_at: new Date().toISOString(),
        note: data.note ? data.note : r.note,
      }).eq("id", r.id);
      await logAudit(admin, {
        product_id: r.product_id, product_name: r.product_name, action: "reject", field: r.field,
        from_url: r.before_url, to_url: r.after_url, revision_id: r.id, actor: (context as Ctx).userId, note: data.note ?? "",
      });
    }
    return { rejected: (revs ?? []).length };
  });

/** রোলব্যাক — আগের ছবিতে ফিরে যাওয়া */
export const rollbackRevisions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) => d)
  .handler(async ({ data, context }) => {
    const admin = await adminClient(context as never);
    const ids = (data.ids ?? []).slice(0, 200);
    if (!ids.length) return { restored: 0 };
    const { data: revs } = await admin.from("image_revisions").select("*").in("id", ids).eq("status", "approved");
    let restored = 0;
    for (const r of revs ?? []) {
      const col = FIELD_COL[r.field] ?? "image_url";
      await admin.from("products").update({ [col]: r.before_url }).eq("id", r.product_id);
      await admin.from("image_revisions").update({
        status: "rolled_back", reviewed_by: (context as Ctx).userId, reviewed_at: new Date().toISOString(),
      }).eq("id", r.id);
      await logAudit(admin, {
        product_id: r.product_id, product_name: r.product_name, action: "rollback", field: r.field,
        from_url: r.after_url, to_url: r.before_url, revision_id: r.id, actor: (context as Ctx).userId, note: "রোলব্যাক",
      });
      restored++;
    }
    return { restored };
  });

/** অডিট লগ */
export const listImageAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q?: string; action?: string; limit?: number; offset?: number }) => d)
  .handler(async ({ data, context }) => {
    const admin = await adminClient(context as never);
    const limit = Math.min(data.limit ?? 40, 200);
    const offset = data.offset ?? 0;
    let q = admin.from("image_audit_log").select("*", { count: "exact" });
    if (data.action && data.action !== "all") q = q.eq("action", data.action);
    const term = (data.q ?? "").trim().replace(/[%,()]/g, " ");
    if (term) q = q.or(`product_name.ilike.%${term}%,product_id.ilike.%${term}%`);
    const { data: rows, count } = await q.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    return { rows: rows ?? [], count: count ?? 0 };
  });

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** যেসব ছবির মাঝখানে লোগো আছে সেগুলোর জন্য বিকল্প সোর্স থেকে ছবি অটো-ফেচ */
export const autoFetchAlternates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number }) => d)
  .handler(async ({ data, context }) => {
    const admin = await adminClient(context as never);
    const limit = Math.min(data.limit ?? 20, 40);
    const { data: prods } = await admin
      .from("products").select("id,name,en,image_url")
      .like("image_url", "%medex.com.bd/storage%")
      .limit(limit);

    const ua = { "User-Agent": "Mozilla/5.0 (compatible; OushodhwalaBot/1.0)" };
    let queued = 0, missed = 0;
    for (const p of prods ?? []) {
      const slug = slugify(p.en || p.name);
      let found = "", source = "";
      for (const cand of [
        { url: `https://medeasy.health/medicines/${slug}`, src: "medeasy" },
        { url: `https://eessentials.com.bd/product/${slug}/`, src: "eessentials" },
      ]) {
        try {
          const res = await fetch(cand.url, { headers: ua });
          if (!res.ok) continue;
          const html = await res.text();
          const og = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i.exec(html)?.[1] ?? "";
          if (og && !/default-medicine|Medeasy-website|placeholder|no-image/i.test(og)) {
            found = og; source = cand.src; break;
          }
        } catch { /* পরের সোর্স */ }
      }
      if (!found) { missed++; continue; }
      // একই পণ্যের জন্য অপেক্ষমাণ রিভিশন থাকলে ডুপ্লিকেট নয়
      const { data: exists } = await admin
        .from("image_revisions").select("id").eq("product_id", p.id).eq("field", "box").eq("status", "pending").maybeSingle();
      if (exists) continue;
      await admin.from("image_revisions").insert({
        product_id: p.id, product_name: p.name, field: "box", before_url: p.image_url, after_url: found,
        method: "alt-source", source, score: 0, status: "pending", note: "মাঝখানে লোগো — বিকল্প সোর্স থেকে আনা",
      });
      await logAudit(admin, {
        product_id: p.id, product_name: p.name, action: "fetch-alt", field: "box",
        from_url: p.image_url, to_url: found, actor: (context as Ctx).userId, note: source,
      });
      queued++;
    }
    return { scanned: (prods ?? []).length, queued, missed };
  });
