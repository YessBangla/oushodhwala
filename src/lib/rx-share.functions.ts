import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SharedMed } from "@/lib/rx-share.server";

export type RxScopes = {
  medicines: boolean;
  dosage: boolean;
  prices: boolean;
  patient: boolean;
  advice: boolean;
};

export const DEFAULT_SCOPES: RxScopes = {
  medicines: true,
  dosage: true,
  prices: true,
  patient: false,
  advice: true,
};

export type RxShare = {
  id: string;
  token: string;
  expiresAt: string;
  revoked: boolean;
  views: number;
  createdAt: string;
  scopes: RxScopes;
};

/** নতুন শেয়ার লিংক — মেয়াদ ও পারমিশন সহ */
export const createRxShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; hours: number; scopes: RxScopes }) => d)
  .handler(async ({ data, context }): Promise<RxShare> => {
    const { supabase, userId } = context;
    const hours = Math.min(Math.max(Math.round(data.hours) || 24, 1), 24 * 30);

    const { data: rx, error: rxErr } = await supabase
      .from("prescriptions")
      .select("id")
      .eq("id", data.id)
      .maybeSingle();
    if (rxErr) throw new Error(rxErr.message);
    if (!rx) throw new Error("প্রেসক্রিপশন পাওয়া যায়নি");

    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "").slice(0, 40);
    const expires = new Date(Date.now() + hours * 3600_000).toISOString();

    const { data: row, error } = await supabase
      .from("prescription_shares")
      .insert({
        prescription_id: data.id,
        user_id: userId,
        token,
        scopes: data.scopes as never,
        expires_at: expires,
      })
      .select("id, token, expires_at, revoked, views, created_at, scopes")
      .single();
    if (error) throw new Error(error.message);

    return {
      id: row.id as string,
      token: row.token as string,
      expiresAt: row.expires_at as string,
      revoked: row.revoked as boolean,
      views: row.views as number,
      createdAt: row.created_at as string,
      scopes: row.scopes as unknown as RxScopes,
    };
  });

/** এই প্রেসক্রিপশনের সব শেয়ার লিংক */
export const listRxShares = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }): Promise<RxShare[]> => {
    const { data: rows, error } = await context.supabase
      .from("prescription_shares")
      .select("id, token, expires_at, revoked, views, created_at, scopes")
      .eq("prescription_id", data.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id as string,
      token: r.token as string,
      expiresAt: r.expires_at as string,
      revoked: r.revoked as boolean,
      views: r.views as number,
      createdAt: r.created_at as string,
      scopes: r.scopes as unknown as RxScopes,
    }));
  });

/** লিংক বাতিল */
export const revokeRxShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { shareId: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("prescription_shares")
      .update({ revoked: true })
      .eq("id", data.shareId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type SharedRx =
  | { error: "not_found" | "revoked" | "expired" }
  | {
      ok: true;
      expiresAt: string;
      scopes: RxScopes;
      patientName: string;
      doctorName: string;
      date: string;
      advice: string;
      note: string;
      createdAt: string;
      items: SharedMed[];
    };

/** পাবলিক — টোকেন দিয়ে অনুমোদিত অংশটুকু দেখা যায় */
export const readSharedRx = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }): Promise<SharedRx> => {
    const { publicClient } = await import("@/lib/public-supabase.server");
    const { attachPrices } = await import("@/lib/rx-share.server");
    const sb = publicClient();
    const { data: res, error } = await sb.rpc("rx_share_open", { _token: data.token });
    if (error) throw new Error(error.message);
    const payload = (res ?? {}) as Record<string, unknown>;
    if (!payload["ok"]) return { error: (payload["error"] as "not_found") ?? "not_found" };

    const scopes = (payload["scopes"] ?? {}) as RxScopes;
    let items = (payload["items"] ?? []) as SharedMed[];
    if (scopes.prices) items = await attachPrices(items);

    return {
      ok: true,
      expiresAt: String(payload["expiresAt"] ?? ""),
      scopes,
      patientName: String(payload["patientName"] ?? ""),
      doctorName: String(payload["doctorName"] ?? ""),
      date: String(payload["date"] ?? ""),
      advice: String(payload["advice"] ?? ""),
      note: String(payload["note"] ?? ""),
      createdAt: String(payload["createdAt"] ?? ""),
      items,
    };
  });
