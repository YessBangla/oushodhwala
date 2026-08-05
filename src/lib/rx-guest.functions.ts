import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GuestRxRow = {
  id: string;
  status: string;
  note: string;
  adminNote: string;
  createdAt: string;
  parsedAt: string | null;
  files: number;
  medicines: number;
};

/** এই ডিভাইসের গেস্ট কোড দিয়ে জমা দেওয়া প্রেসক্রিপশনগুলোর তালিকা */
export const listGuestRx = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }): Promise<GuestRxRow[]> => {
    if (!data.token || data.token.length < 24) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("prescriptions")
      .select("id, status, note, admin_note, created_at, parsed_at, parsed, file_urls")
      .eq("guest_token", data.token)
      .is("user_id", null)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => {
      const parsed = r.parsed as { items?: unknown[] } | null;
      return {
        id: r.id as string,
        status: (r.status ?? "pending") as string,
        note: (r.note ?? "") as string,
        adminNote: (r.admin_note ?? "") as string,
        createdAt: r.created_at as string,
        parsedAt: (r.parsed_at ?? null) as string | null,
        files: Array.isArray(r.file_urls) ? r.file_urls.length : 0,
        medicines: Array.isArray(parsed?.items) ? parsed.items.length : 0,
      };
    });
  });

/** গেস্ট প্রেসক্রিপশন ও এর ফলাফল স্থায়ীভাবে মুছে ফেলা */
export const deleteGuestRx = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; token: string }) => d)
  .handler(async ({ data }) => {
    if (!data.token || data.token.length < 24) throw new Error("গেস্ট কোড সঠিক নয়");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("prescriptions")
      .select("id, guest_token, user_id, file_urls")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || row.user_id || row.guest_token !== data.token)
      throw new Error("প্রেসক্রিপশন পাওয়া যায়নি");

    const files = (row.file_urls ?? []) as string[];
    const paths = files.filter((f) => !/^https?:\/\//i.test(f));
    if (paths.length) await supabaseAdmin.storage.from("prescriptions").remove(paths);
    const { error: delErr } = await supabaseAdmin.from("prescriptions").delete().eq("id", data.id);
    if (delErr) throw new Error(delErr.message);
    return { ok: true };
  });

/** লগইনের পর এই ডিভাইসের গেস্ট প্রেসক্রিপশনগুলো ব্যবহারকারীর অ্যাকাউন্টে নিয়ে আসে */
export const claimGuestRx = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data, context }) => {
    if (!data.token || data.token.length < 24) return { claimed: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("prescriptions")
      .update({ user_id: context.userId, guest_token: null })
      .eq("guest_token", data.token)
      .is("user_id", null)
      .select("id");
    if (error) throw new Error(error.message);
    return { claimed: (rows ?? []).length };
  });
