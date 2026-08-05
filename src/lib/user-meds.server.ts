import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { MedSuggestion } from "./rx-suggest.server";

const SELECT = "id, name, en, brand, generic, strength, form, pack, price, mrp, stock, rx, emoji, image_url, medicine_image_url, manufacturer, indications, indications_en, dosage, dosage_en, side_effects, side_effects_en, therapeutic_class, therapeutic_class_en";

async function logAudit(userId: string, action: string, metadata: any) {
  try {
    const table = "user_audit_logs" as any;
    await supabaseAdmin.from(table).insert({
      user_id: userId,
      action,
      metadata,
    });
  } catch (e) {
    console.error("Audit log failed", e);
  }
}

export async function getFavorites(userId: string): Promise<MedSuggestion[]> {
  const { data, error } = await supabaseAdmin
    .from("user_favorites")
    .select(`product:products(${SELECT}), reminder_config, sort_order` as any)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  // @ts-ignore - dynamic product structure
  return (data?.map((d: any) => ({ ...d.product, reminder_config: d.reminder_config, sort_order: d.sort_order })) || []) as MedSuggestion[];
}

export async function getRecent(userId: string): Promise<MedSuggestion[]> {
  const { data, error } = await supabaseAdmin
    .from("user_recent_medicines")
    .select(`product:products(${SELECT})`)
    .eq("user_id", userId)
    .order("last_viewed_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  // @ts-ignore - dynamic product structure
  return (data?.map((d: any) => d.product) || []) as MedSuggestion[];
}

export async function syncMedicines(userId: string, localFavIds: string[], localRecentIds: string[]) {
  const { data: existingFavs } = await supabaseAdmin
    .from("user_favorites")
    .select("product_id")
    .eq("user_id", userId);
  
  const existingIds = new Set(existingFavs?.map(e => e.product_id) || []);
  const toAddFavs = localFavIds.filter(id => !existingIds.has(id));
  
  if (toAddFavs.length > 0) {
    await supabaseAdmin
      .from("user_favorites")
      .insert(toAddFavs.map(id => ({ 
        user_id: userId, 
        product_id: id,
        sync_meta: { source: 'local_sync', timestamp: new Date().toISOString() }
      })));
    await logAudit(userId, "sync_favorites", { count: toAddFavs.length });
  }

  if (localRecentIds.length > 0) {
    const { data: existing } = await supabaseAdmin
      .from("user_recent_medicines")
      .select("product_id")
      .eq("user_id", userId);
    
    const existingIds = new Set(existing?.map(e => e.product_id) || []);
    const toAdd = localRecentIds.filter(id => !existingIds.has(id));
    
    if (toAdd.length > 0) {
      await supabaseAdmin
        .from("user_recent_medicines")
        .insert(toAdd.map(id => ({ user_id: userId, product_id: id })));
    }
  }

  return { favorites: await getFavorites(userId), recent: await getRecent(userId) };
}

export async function toggleFavorite(userId: string, productId: string) {
  const { data: existing } = await supabaseAdmin
    .from("user_favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin.from("user_favorites").delete().eq("id", existing.id);
    await logAudit(userId, "remove_favorite", { productId });
    return { favorite: false };
  } else {
    await supabaseAdmin.from("user_favorites").insert({ user_id: userId, product_id: productId });
    await logAudit(userId, "add_favorite", { productId });
    return { favorite: true };
  }
}

export async function updateReminder(userId: string, productId: string, config: any) {
  await supabaseAdmin
    .from("user_favorites")
    .update({ reminder_config: config })
    .eq("user_id", userId)
    .eq("product_id", productId);
  await logAudit(userId, "update_reminder", { productId, config });
}

export async function updateSortOrder(userId: string, productIds: string[]) {
  for (let i = 0; i < productIds.length; i++) {
    const productId = productIds[i];
    if (!productId) continue;
    await supabaseAdmin
      .from("user_favorites")
      .update({ sort_order: i } as any)
      .eq("user_id", userId)
      .eq("product_id", productId);
  }
  await logAudit(userId, "update_sort_order", { count: productIds.length });
}

export async function getAuditLogs(userId: string) {
  const table = "user_audit_logs" as any;
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addRecent(userId: string, productId: string) {
  const { data: existing } = await supabaseAdmin
    .from("user_recent_medicines")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("user_recent_medicines")
      .update({ last_viewed_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin
      .from("user_recent_medicines")
      .insert({ user_id: userId, product_id: productId });
  }
}

export async function bulkRemoveFavorites(userId: string, productIds: string[]) {
  await supabaseAdmin
    .from("user_favorites")
    .delete()
    .eq("user_id", userId)
    .in("product_id", productIds);
  await logAudit(userId, "bulk_remove_favorites", { productIds });
}

export async function bulkRemoveRecent(userId: string, productIds: string[]) {
  await supabaseAdmin
    .from("user_recent_medicines")
    .delete()
    .eq("user_id", userId)
    .in("product_id", productIds);
}

export async function bulkUpdateStatus(userId: string, productIds: string[], active: boolean) {
  await supabaseAdmin
    .from("user_favorites")
    .update({ is_active: active } as any)
    .eq("user_id", userId)
    .in("product_id", productIds);
  await logAudit(userId, "bulk_update_status", { productIds, active });
}
