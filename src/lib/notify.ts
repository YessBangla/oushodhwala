/** ডেলিভারি নোটিফিকেশন — চ্যানেল অনুযায়ী পাঠানোর লিংক তৈরি */

export type NotifyChannel = "whatsapp" | "sms" | "email";

export const CHANNEL_LABEL: Record<NotifyChannel, { bn: string; en: string; emoji: string }> = {
  whatsapp: { bn: "হোয়াটসঅ্যাপ", en: "WhatsApp", emoji: "💬" },
  sms: { bn: "এসএমএস", en: "SMS", emoji: "✉️" },
  email: { bn: "ইমেইল", en: "Email", emoji: "📧" },
};

/** বাংলাদেশি নম্বরকে আন্তর্জাতিক রূপে (৮৮০...) আনে */
export function intlPhone(raw: string) {
  const d = (raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("880")) return d;
  if (d.startsWith("0")) return `880${d.slice(1)}`;
  if (d.length === 10) return `880${d}`;
  return d;
}

export function notifyLink(channel: NotifyChannel, target: string, body: string, subject = "ঔষধওয়ালা — ডেলিভারি আপডেট") {
  const text = encodeURIComponent(body);
  if (channel === "whatsapp") {
    const p = intlPhone(target);
    return p ? `https://wa.me/${p}?text=${text}` : `https://wa.me/?text=${text}`;
  }
  if (channel === "sms") return `sms:${target}?&body=${text}`;
  return `mailto:${target}?subject=${encodeURIComponent(subject)}&body=${text}`;
}

/** নোটিফিকেশনের বডিতে থাকা আপেক্ষিক ট্র্যাকিং লিংককে পূর্ণ লিংকে রূপ দেয় */
export function withAbsoluteLinks(body: string, origin?: string) {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  if (!base) return body;
  return body.replace(/\/track\/([A-Za-z0-9-]+)/g, `${base}/track/$1`);
}
