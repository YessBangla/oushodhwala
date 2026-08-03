/** ক্লায়েন্ট-সাইড রেট লিমিট — রিসেট/OTP ইমেইল বারবার পাঠানো ঠেকায়। */

const KEY = "ow-auth-rate-v1";

export type RateState = { count: number; first: number; last: number };

type Store = Record<string, RateState>;

const read = (): Store => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Store;
  } catch {
    return {};
  }
};

const write = (s: Store) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

export const COOLDOWN_MS = 60_000; // দুই চেষ্টার মাঝে ৬০ সেকেন্ড
export const WINDOW_MS = 60 * 60_000; // ১ ঘণ্টার উইন্ডো
export const MAX_PER_WINDOW = 3; // ঘণ্টায় সর্বোচ্চ ৩ বার

export type RateCheck =
  | { ok: true }
  | { ok: false; reason: "cooldown"; secondsLeft: number }
  | { ok: false; reason: "limit"; minutesLeft: number };

export function checkRate(key: string, now = Date.now()): RateCheck {
  const st = read()[key];
  if (!st) return { ok: true };
  if (now - st.first > WINDOW_MS) return { ok: true };
  if (now - st.last < COOLDOWN_MS) {
    return { ok: false, reason: "cooldown", secondsLeft: Math.ceil((COOLDOWN_MS - (now - st.last)) / 1000) };
  }
  if (st.count >= MAX_PER_WINDOW) {
    return { ok: false, reason: "limit", minutesLeft: Math.ceil((WINDOW_MS - (now - st.first)) / 60_000) };
  }
  return { ok: true };
}

export function recordAttempt(key: string, now = Date.now()) {
  const all = read();
  const st = all[key];
  all[key] = !st || now - st.first > WINDOW_MS ? { count: 1, first: now, last: now } : { ...st, count: st.count + 1, last: now };
  write(all);
}

/** পরবর্তী চেষ্টার জন্য বাকি সেকেন্ড (কুলডাউন) */
export function cooldownLeft(key: string, now = Date.now()): number {
  const st = read()[key];
  if (!st) return 0;
  return Math.max(0, Math.ceil((COOLDOWN_MS - (now - st.last)) / 1000));
}
