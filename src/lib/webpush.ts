/**
 * ব্রাউজার (Web) নোটিফিকেশন হেল্পার — ডেলিভারি স্ট্যাটাস/ETA বদলালে
 * গ্রাহক ও অ্যাডমিনকে সঙ্গে সঙ্গে জানানোর জন্য।
 */

export const PUSH_KEY = "ow-push-enabled";

export function pushSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function pushEnabled() {
  if (!pushSupported()) return false;
  try {
    return localStorage.getItem(PUSH_KEY) === "1" && Notification.permission === "granted";
  } catch {
    return false;
  }
}

export function pushPermission(): NotificationPermission | "unsupported" {
  return pushSupported() ? Notification.permission : "unsupported";
}

/** অনুমতি চেয়ে নোটিফিকেশন চালু করে */
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) return false;
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  const ok = perm === "granted";
  try {
    localStorage.setItem(PUSH_KEY, ok ? "1" : "0");
  } catch {
    /* ignore */
  }
  return ok;
}

export function disablePush() {
  try {
    localStorage.setItem(PUSH_KEY, "0");
  } catch {
    /* ignore */
  }
}

/** নোটিফিকেশন দেখায় (অনুমতি না থাকলে চুপচাপ উপেক্ষা করে) */
export function notifyPush(title: string, body: string, url?: string) {
  if (!pushEnabled()) return;
  try {
    const n = new Notification(title, { body, icon: "/favicon.ico", tag: url ?? title });
    if (url) {
      n.onclick = () => {
        window.focus();
        window.location.href = url;
      };
    }
  } catch {
    /* ignore */
  }
}
