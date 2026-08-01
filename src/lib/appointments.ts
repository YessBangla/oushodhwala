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

export const REFUND_LABEL: Record<string, string> = {
  none: "—",
  not_applicable: "প্রযোজ্য নয়",
  not_eligible: "রিফান্ড প্রযোজ্য নয়",
  pending: "রিফান্ড প্রক্রিয়াধীন",
  processing: "রিফান্ড চলছে",
  refunded: "রিফান্ড সম্পন্ন",
};

export const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "হোয়াটসঅ্যাপ",
  sms: "এসএমএস",
  email: "ইমেইল",
  app: "অ্যাপ নোটিফিকেশন",
};

export const WEEKDAYS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];

export const REFUND_POLICY_BN =
  "বাতিলের নীতিমালা: সেশনের ২৪ ঘণ্টার বেশি আগে বাতিল করলে সম্পূর্ণ ফি ফেরত, ৬–২৪ ঘণ্টা আগে বাতিলে ৫০% ফেরত, ৬ ঘণ্টার কম সময়ে বাতিলে ফেরত প্রযোজ্য নয়। ক্যাশ পেমেন্টে কিছু কাটা হয় না।";

export function refundPreview(fee: number, scheduledAt: string, paid: boolean) {
  const hours = (new Date(scheduledAt).getTime() - Date.now()) / 3600000;
  if (!paid) return { amount: 0, text: "কোনো পেমেন্ট নেওয়া হয়নি — রিফান্ড প্রযোজ্য নয়।" };
  if (hours >= 24) return { amount: Math.round(fee), text: "সম্পূর্ণ ফি (১০০%) ফেরত পাবেন।" };
  if (hours >= 6) return { amount: Math.round(fee * 0.5), text: "৫০% ফি ফেরত পাবেন।" };
  return { amount: 0, text: "৬ ঘণ্টার কম সময় বাকি — নীতিমালা অনুযায়ী রিফান্ড প্রযোজ্য নয়।" };
}

export type DoctorAvailability = {
  workStart: string;
  workEnd: string;
  slotMinutes: number;
  workDays: number[];
};

function toMinutes(v: string) {
  const [h, m] = (v || "0:0").split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Slots generated from the doctor's own working hours + slot duration */
export function slotTimes(av?: Partial<DoctorAvailability>): string[] {
  const start = toMinutes(av?.workStart || "10:00");
  const end = toMinutes(av?.workEnd || "22:00");
  const step = Math.max(5, Number(av?.slotMinutes) || 30);
  const out: string[] = [];
  for (let m = start; m + step <= end; m += step) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

export function isWorkingDay(d: Date, av?: Partial<DoctorAvailability>) {
  const days = av?.workDays ?? [0, 1, 2, 3, 4, 5, 6];
  return days.includes(d.getDay());
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]!);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
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
