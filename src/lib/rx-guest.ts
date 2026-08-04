/** লগইন ছাড়া প্রেসক্রিপশন জমা দেওয়ার জন্য ব্রাউজারে রাখা গোপন গেস্ট কোড */
const KEY = "rx-guest-token";
const LIST = "rx-guest-ids";

function randomToken() {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** এই ব্রাউজারের গেস্ট কোড — না থাকলে তৈরি করে রাখে */
export function getGuestToken(): string {
  if (typeof window === "undefined") return "";
  let tok = window.localStorage.getItem(KEY);
  if (!tok || tok.length < 24) {
    tok = randomToken();
    window.localStorage.setItem(KEY, tok);
  }
  return tok;
}

export function rememberGuestRx(id: string) {
  if (typeof window === "undefined") return;
  try {
    const ids = JSON.parse(window.localStorage.getItem(LIST) ?? "[]") as string[];
    if (!ids.includes(id)) window.localStorage.setItem(LIST, JSON.stringify([id, ...ids].slice(0, 20)));
  } catch {
    window.localStorage.setItem(LIST, JSON.stringify([id]));
  }
}

export function guestRxIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LIST) ?? "[]") as string[];
  } catch {
    return [];
  }
}
