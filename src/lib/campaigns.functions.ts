import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("FORBIDDEN");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export type Segment = "all" | "buyers30" | "inactive60" | "highvalue";

async function resolveAudience(admin: any, segment: Segment): Promise<string[]> {
  const { data: profiles, error: pe } = await admin.from("profiles").select("id").limit(20000);
  if (pe) throw new Error(pe.message);
  const allIds: string[] = (profiles ?? []).map((p: any) => p.id);
  if (segment === "all") return allIds;

  const { data: orders, error: oe } = await admin
    .from("orders")
    .select("user_id, created_at, total, status")
    .neq("status", "cancelled")
    .limit(50000);
  if (oe) throw new Error(oe.message);

  const now = Date.now();
  const last = new Map<string, number>();
  const spend = new Map<string, number>();
  for (const o of orders ?? []) {
    if (!o.user_id) continue;
    const t = new Date(o.created_at).getTime();
    last.set(o.user_id, Math.max(last.get(o.user_id) ?? 0, t));
    spend.set(o.user_id, (spend.get(o.user_id) ?? 0) + Number(o.total || 0));
  }

  if (segment === "buyers30")
    return allIds.filter((id) => (last.get(id) ?? 0) > now - 30 * 864e5);
  if (segment === "inactive60")
    return allIds.filter((id) => (last.get(id) ?? 0) < now - 60 * 864e5);
  return allIds.filter((id) => (spend.get(id) ?? 0) >= 5000);
}

/** সেগমেন্টে কতজন গ্রাহক আছে */
export const countAudience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { segment: Segment }) => d)
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context as Ctx);
    const ids = await resolveAudience(admin, data.segment);
    return { count: ids.length };
  });

/** ক্যাম্পেইন নোটিফিকেশন পাঠায় */
export const sendCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { segment: Segment; title: string; body: string }) => d)
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context as Ctx);
    const title = (data.title || "").trim();
    const body = (data.body || "").trim();
    if (!title) throw new Error("TITLE_REQUIRED");
    const ids = await resolveAudience(admin, data.segment);
    if (ids.length === 0) return { sent: 0 };

    let sent = 0;
    for (let i = 0; i < ids.length; i += 500) {
      const rows = ids.slice(i, i + 500).map((user_id) => ({
        user_id,
        title,
        body,
        kind: "campaign",
        order_no: "",
      }));
      const { error } = await admin.from("notifications").insert(rows);
      if (error) throw new Error(error.message);
      sent += rows.length;
    }
    return { sent };
  });
