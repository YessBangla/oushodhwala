export const DELIVERY_STATUS: Record<string, { bn: string; en: string; emoji: string }> = {
  unassigned: { bn: "ডেলিভারিম্যান নির্ধারণ হয়নি", en: "Awaiting rider", emoji: "🕓" },
  assigned: { bn: "ডেলিভারিম্যান নিয়োগ হয়েছে", en: "Rider assigned", emoji: "👤" },
  picked: { bn: "পার্সেল সংগ্রহ হয়েছে", en: "Parcel picked up", emoji: "📦" },
  on_the_way: { bn: "পথে আছে", en: "On the way", emoji: "🛵" },
  arrived: { bn: "আপনার ঠিকানায় পৌঁছেছে", en: "Arrived at your address", emoji: "📍" },
  delivered: { bn: "ডেলিভারি সম্পন্ন", en: "Delivered", emoji: "✅" },
  failed: { bn: "ডেলিভারি ব্যর্থ", en: "Delivery failed", emoji: "⚠️" },
};

export const DELIVERY_FLOW = ["assigned", "picked", "on_the_way", "arrived", "delivered"] as const;

export function fmtTime(iso: string | null | undefined, en = false) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(en ? "en-GB" : "bn-BD", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
