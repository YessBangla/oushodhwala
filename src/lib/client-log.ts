/** ব্রাউজারের কনসোল এরর সংগ্রহ করে রাখে — অ্যাডমিন Health/QA ড্যাশবোর্ডে দেখানোর জন্য */

export type ClientLogEntry = {
  id: string;
  at: number;
  kind: "error" | "unhandledrejection" | "console";
  message: string;
  source: string;
};

const MAX = 60;
let entries: ClientLogEntry[] = [];
const listeners = new Set<() => void>();
let installed = false;

function push(kind: ClientLogEntry["kind"], message: string, source = "") {
  const msg = String(message ?? "").slice(0, 500);
  if (!msg.trim()) return;
  entries = [
    { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now(), kind, message: msg, source },
    ...entries,
  ].slice(0, MAX);
  listeners.forEach((l) => l());
}

export function installClientErrorCapture() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e) => {
    push("error", e.message || String(e.error ?? "Unknown error"), `${e.filename ?? ""}:${e.lineno ?? 0}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as { message?: string } | string | undefined;
    push("unhandledrejection", typeof r === "string" ? r : (r?.message ?? "Promise rejected"));
  });

  const orig = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    push(
      "console",
      args.map((a) => (a instanceof Error ? a.message : typeof a === "string" ? a : safe(a))).join(" "),
    );
    orig(...args);
  };
}

function safe(v: unknown) {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function getClientErrors() {
  return entries;
}

export function clearClientErrors() {
  entries = [];
  listeners.forEach((l) => l());
}

export function subscribeClientErrors(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
