/** শেয়ারেবল পাবলিক ট্র্যাকিং লিংক তৈরি ও কপি করার হেল্পার */
export function trackLink(token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/t/${token}`;
}

export async function copyTrackLink(token: string) {
  const url = trackLink(token);
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    /* ক্লিপবোর্ড না থাকলে উপেক্ষা */
  }
  return url;
}

export function whatsappTrackLink(token: string, orderNo: string) {
  return `https://wa.me/?text=${encodeURIComponent(`Order #${orderNo} — ${trackLink(token)}`)}`;
}
