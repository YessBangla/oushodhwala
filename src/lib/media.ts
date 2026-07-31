import { supabase } from "@/integrations/supabase/client";

export const MEDIA_BUCKET = "media";
export const mediaQueryKey = ["media-assets"] as const;

export const MEDIA_KINDS = [
  { id: "box", t: "পণ্যের বক্স" },
  { id: "medicine", t: "ঔষধের ছবি" },
  { id: "banner", t: "ব্যানার" },
  { id: "category", t: "ক্যাটাগরি" },
  { id: "site", t: "ওয়েবসাইট" },
  { id: "other", t: "অন্যান্য" },
] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number]["id"];

export type MediaAsset = {
  id: string;
  url: string;
  path: string;
  name: string;
  kind: string;
  tags: string[];
  size: number;
  created_at: string;
};

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export async function listMedia(kind?: string, q?: string): Promise<MediaAsset[]> {
  let query = supabase.from("media_assets").select("*").order("created_at", { ascending: false }).limit(300);
  if (kind && kind !== "all") query = query.eq("kind", kind);
  if (q && q.trim()) query = query.ilike("name", `%${q.trim()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MediaAsset[];
}

export async function uploadMedia(file: File, kind: MediaKind, tags: string[] = []): Promise<MediaAsset> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { upsert: false });
  if (upErr) throw upErr;
  const { data: signed, error: sErr } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, TEN_YEARS);
  if (sErr) throw sErr;
  const { data, error } = await supabase
    .from("media_assets")
    .insert({ url: signed.signedUrl, path, name: file.name, kind, tags, size: file.size })
    .select()
    .single();
  if (error) throw error;
  return data as MediaAsset;
}

export async function addMediaByUrl(url: string, name: string, kind: MediaKind, tags: string[] = []) {
  const { data, error } = await supabase
    .from("media_assets")
    .insert({ url, name: name || url.split("/").pop() || "image", kind, tags, path: "" })
    .select()
    .single();
  if (error) throw error;
  return data as MediaAsset;
}

export async function deleteMedia(asset: MediaAsset) {
  if (asset.path) await supabase.storage.from(MEDIA_BUCKET).remove([asset.path]);
  const { error } = await supabase.from("media_assets").delete().eq("id", asset.id);
  if (error) throw error;
}
