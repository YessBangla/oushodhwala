import { supabase } from "@/integrations/supabase/client";

/** সংরক্ষিত ফাইল রেফারেন্স সরাসরি লিংক নাকি স্টোরেজ পাথ */
export function isExternalUrl(ref: string | null | undefined) {
  return !!ref && /^https?:\/\//i.test(ref);
}

/**
 * প্রাইভেট বাকেটের ফাইলের জন্য সাইনড ইউআরএল তৈরি করে।
 * ref যদি সরাসরি http লিংক হয়, সেটিই ফেরত দেয়।
 */
export async function resolveFileUrl(bucket: string, ref: string | null | undefined, expiresIn = 60 * 60) {
  if (!ref) return "";
  if (isExternalUrl(ref)) return ref;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(ref, expiresIn);
  return data?.signedUrl ?? "";
}

/** ডাউনলোড হিসেবে সাইনড ইউআরএল */
export async function resolveDownloadUrl(bucket: string, ref: string | null | undefined, fileName?: string) {
  if (!ref) return "";
  if (isExternalUrl(ref)) return ref;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(ref, 60 * 60, {
    download: fileName ?? ref.split("/").pop() ?? true,
  });
  return data?.signedUrl ?? "";
}

/** ফাইল আপলোড করে স্টোরেজ পাথ ফেরত দেয় */
export async function uploadFile(bucket: string, path: string, file: Blob, contentType?: string) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    ...(contentType ? { contentType } : {}),
  });
  if (error) throw error;
  return path;
}

export function safeName(name: string) {
  return name.replace(/[^\w.-]+/g, "_").slice(-80);
}
