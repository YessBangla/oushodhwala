import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { MedSuggestion } from "./rx-suggest.server";

const SELECT = "id, name, en, brand, generic, strength, form, pack, price, mrp, stock, rx, emoji, image_url, medicine_image_url, manufacturer, indications, indications_en, dosage, dosage_en, side_effects, side_effects_en, therapeutic_class, therapeutic_class_en";

export async function getFavorites(userId: string): Promise<MedSuggestion[]> {
  const { data, error } = await supabaseAdmin
    .from("user_favorites")
    .select(`product:products(${SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data?.map((d: any) => d.product) || []) as MedSuggestion[];
}

export async function getRecent(userId: string): Promise<MedSuggestion[]> {
  const { data, error } = await supabaseAdmin
    .from("user_recent_medicines")
    .select(`product:products(${SELECT})`)
    .eq("user_id", userId)
    .order("last_viewed_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data?.map((d: any) => d.product) || []) as MedSuggestion[];
}

export async function syncMedicines(userId: string, localFavIds: string[], localRecentIds: string[]) {
  // Sync favorites
  if (localFavIds.length > 0) {
    const { data: existing } = await supabaseAdmin
      .from("user_favorites")
      .select("product_id")
      .eq("user_id", userId);
    
    const existingIds = new Set(existing?.map(e => e.product_id) || []);
    const toAdd = localFavIds.filter(id => !existingIds.has(id));
    
    if (toAdd.length > 0) {
      await supabaseAdmin
        .from("user_favorites")
        .insert(toAdd.map(id => ({ user_id: userId, product_id: id })));
    }
  }

  // Sync recent
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
    await supabaseAdmin
      .from("user_favorites")
      .delete()
      .eq("id", existing.id);
    return { favorite: false };
  } else {
    await supabaseAdmin
      .from("user_favorites")
      .insert({ user_id: userId, product_id: productId });
    return { favorite: true };
  }
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
}

export async function bulkRemoveRecent(userId: string, productIds: string[]) {
  await supabaseAdmin
    .from("user_recent_medicines")
    .delete()
    .eq("user_id", userId)
    .in("product_id", productIds);
}
