import { supabase } from "@/integrations/supabase/client";

export const CONSULT_BUCKET = "consultations";

export type CallMode = "phone" | "whatsapp" | "video";

export const MODE_LABEL: Record<CallMode, { bn: string; en: string; emoji: string }> = {
  phone: { bn: "ফোন কল", en: "Phone call", emoji: "📞" },
  whatsapp: { bn: "হোয়াটসঅ্যাপ কল", en: "WhatsApp call", emoji: "💬" },
  video: { bn: "ভিডিও কল", en: "Video call", emoji: "🎥" },
};

export const PAYMENT_LABEL: Record<string, string> = {
  cod: "ক্যাশ (কল শেষে)",
  bkash: "bKash",
  nagad: "Nagad",
  card: "কার্ড",
};

export const STATUS_LABEL: Record<string, string> = {
  confirmed: "নিশ্চিত",
  completed: "সম্পন্ন",
  cancelled: "বাতিল",
};

/** 10:00 → 21:30, 30 minute slots */
export function slotTimes(): string[] {
  const out: string[] = [];
  for (let h = 10; h <= 21; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
}

export function nextDays(count = 14): Date[] {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => new Date(base.getTime() + i * 86400000));
}

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function slotDate(day: Date, time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("bn-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("bn-BD", { hour: "numeric", minute: "2-digit" });
}

export function waNumber(v: string) {
  const d = (v || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("880")) return d;
  if (d.startsWith("0")) return `88${d}`;
  return d;
}

export function telNumber(v: string) {
  return (v || "").replace(/[^\d+]/g, "");
}

export async function uploadConsultFile(userId: string, appointmentId: string, file: File) {
  const safe = file.name.replace(/[^\w.\-]/g, "_");
  const path = `${userId}/${appointmentId}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from(CONSULT_BUCKET).upload(path, file);
  if (error) throw error;
  return { path, name: file.name };
}

export async function openConsultFile(path: string) {
  const { data, error } = await supabase.storage.from(CONSULT_BUCKET).createSignedUrl(path, 600);
  if (error) throw error;
  window.open(data.signedUrl, "_blank", "noopener");
}
