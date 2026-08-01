import { useEffect, useState } from "react";

const KEY = "ow.recent.v1";
const MAX = 12;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function pushRecent(id: string) {
  if (typeof window === "undefined" || !id) return;
  const next = [id, ...read().filter((x) => x !== id)].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("ow-recent"));
  } catch {
    /* storage unavailable */
  }
}

export function clearRecent() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("ow-recent"));
}

/** Recently viewed product ids — hydration-safe (empty on first render). */
export function useRecent(): string[] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setIds(read());
    sync();
    window.addEventListener("ow-recent", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ow-recent", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return ids;
}
