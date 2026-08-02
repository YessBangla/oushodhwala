/** ক্রিটিক্যাল অ্যাকশনের ক্লায়েন্ট-সাইড র‍্যাপার — লগিং কখনো ইউজার ফ্লো ভাঙবে না */
import { logOpsEvent, type OpsAction, type OpsEventInput } from "@/lib/ops-log.functions";

function fire(data: OpsEventInput) {
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  void logOpsEvent({ data: { ...data, path: data.path ?? path } }).catch(() => {
    /* লগ ব্যর্থ হলেও অ্যাপ চলবে */
  });
}

export function opsStart(action: OpsAction, detail?: Record<string, unknown>) {
  fire({ action, status: "started", ...(detail ? { detail } : {}) });
}

export function opsSuccess(action: OpsAction, ref?: string, detail?: Record<string, unknown>) {
  fire({ action, status: "success", ...(ref ? { ref } : {}), ...(detail ? { detail } : {}) });
}

export function opsFailure(action: OpsAction, error: unknown, detail?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  fire({ action, status: "failure", error: message.slice(0, 400), ...(detail ? { detail } : {}) });
}

export type { OpsAction };
