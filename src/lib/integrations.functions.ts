import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { staffClient, badRequest } from "@/lib/authz";
import { maskRow, pingUrl, type IntegrationRow } from "@/lib/integrations.server";

export type { IntegrationRow };

export type IntegrationSave = {
  id?: string;
  provider: string;
  name: string;
  category: string;
  base_url: string;
  sender_id: string;
  note: string;
  active: boolean;
  config_text: string;
  /** খালি স্ট্রিং = অপরিবর্তিত রাখুন */
  api_key?: string;
  api_secret?: string;
};

/** সব ইন্টিগ্রেশন (সিক্রেট মাস্ক করা) */
export const listIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IntegrationRow[]> => {
    const db = await staffClient(context as never);
    const { data, error } = await db.from("api_integrations").select("*").order("category").order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map(maskRow);
  });

/** ইন্টিগ্রেশন তৈরি বা হালনাগাদ */
export const saveIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: IntegrationSave) => input)
  .handler(async ({ data, context }): Promise<IntegrationRow> => {
    const db = await staffClient(context as never);
    if (!data.provider.trim() || !data.name.trim()) throw badRequest("প্রোভাইডার ও নাম দিন");
    let config: Record<string, unknown> = {};
    try {
      config = data.config_text.trim() ? JSON.parse(data.config_text) : {};
    } catch {
      throw badRequest("অতিরিক্ত কনফিগ সঠিক JSON নয়");
    }
    const patch: Record<string, unknown> = {
      provider: data.provider.trim(),
      name: data.name.trim(),
      category: data.category,
      base_url: data.base_url.trim(),
      sender_id: data.sender_id.trim(),
      note: data.note,
      active: data.active,
      config,
      updated_at: new Date().toISOString(),
    };
    if (data.api_key) patch["api_key"] = data.api_key;
    if (data.api_secret) patch["api_secret"] = data.api_secret;

    const q = data.id
      ? db.from("api_integrations").update(patch).eq("id", data.id).select("*").single()
      : db.from("api_integrations").insert(patch).select("*").single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return maskRow(row as Record<string, unknown>);
  });

/** ইন্টিগ্রেশন মুছে ফেলা */
export const deleteIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const db = await staffClient(context as never);
    const { error } = await db.from("api_integrations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** সংরক্ষিত ক্রেডেনশিয়াল দিয়ে সংযোগ টেস্ট */
export const testIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const db = await staffClient(context as never);
    const { data: row, error } = await db.from("api_integrations").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const base = String((row as Record<string, unknown>)["base_url"] ?? "").trim();
    if (!/^https?:\/\//i.test(base)) throw badRequest("টেস্ট করতে http(s):// দিয়ে শুরু হওয়া বেস URL দিন");
    const key = String((row as Record<string, unknown>)["api_key"] ?? "");
    const headers: Record<string, string> = { accept: "application/json" };
    if (key) headers["authorization"] = `Bearer ${key}`;
    const r = await pingUrl(base, headers);
    await db
      .from("api_integrations")
      .update({ last_ok: r.ok, last_status: r.status, last_tested_at: new Date().toISOString() })
      .eq("id", data.id);
    return r;
  });
