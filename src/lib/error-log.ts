/** ব্রাউজার এরর রেকর্ডার — এরর লগ ড্যাশবোর্ডে দেখা যায় */
import { supabase } from "@/integrations/supabase/client";

let installed = false;
const seen = new Set<string>();

async function log(message: string, stack: string, severity: "error" | "warning") {
  const key = `${severity}:${message}`.slice(0, 200);
  if (!message || seen.has(key)) return;
  seen.add(key);
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from("error_logs").insert({
      message: message.slice(0, 500),
      stack: stack.slice(0, 2000),
      severity,
      source: "client",
      path: window.location.pathname,
      user_id: data.user?.id ?? null,
    });
  } catch {
    /* লগ করতে ব্যর্থ হলে অ্যাপ থামানো যাবে না */
  }
}

export function installErrorLogger() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e) => {
    void log(e.message || String(e.error), e.error?.stack ?? "", "error");
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as { message?: string; stack?: string } | string | undefined;
    const msg = typeof r === "string" ? r : (r?.message ?? "Unhandled promise rejection");
    void log(msg, typeof r === "object" ? (r?.stack ?? "") : "", "error");
  });
}
