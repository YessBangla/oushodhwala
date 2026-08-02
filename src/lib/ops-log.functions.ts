import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireUser, badRequest } from "@/lib/authz";

/** যেসব ক্রিটিক্যাল অ্যাকশন সার্ভারে ট্র্যাক করা হয় */
export const OPS_ACTIONS = [
  "checkout",
  "order_status_change",
  "prescription_upload",
  "appointment_booking",
  "appointment_cancel",
  "diagnostic_booking",
] as const;

export type OpsAction = (typeof OPS_ACTIONS)[number];
export type OpsStatus = "started" | "success" | "failure";

export type OpsEventInput = {
  action: OpsAction;
  status: OpsStatus;
  /** অর্ডার নম্বর / অ্যাপয়েন্টমেন্ট আইডি ইত্যাদি */
  ref?: string;
  path?: string;
  detail?: Record<string, unknown>;
  error?: string;
};

/**
 * ক্রিটিক্যাল অ্যাকশনের সার্ভার-সাইড লগ।
 * ইউজার আইডি টোকেন থেকে নেওয়া হয় — ক্লায়েন্টের পাঠানো মান বিশ্বাস করা হয় না।
 */
export const logOpsEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: OpsEventInput) => {
    if (!d || !OPS_ACTIONS.includes(d.action)) throw badRequest("Unknown ops action");
    if (!["started", "success", "failure"].includes(d.status)) throw badRequest("Unknown ops status");
    return d;
  })
  .handler(async ({ data, context }) => {
    const ctx = requireUser(context as never);
    const severity = data.status === "failure" ? "error" : "info";
    const line = {
      ts: new Date().toISOString(),
      action: data.action,
      status: data.status,
      ref: data.ref ?? "",
      userId: ctx.userId,
      path: data.path ?? "",
      detail: data.detail ?? {},
      error: data.error ?? "",
    };

    // ওয়ার্কার লগে স্ট্রাকচার্ড আউটপুট (server-function-logs দিয়ে দেখা যায়)
    if (severity === "error") console.error("[ops]", JSON.stringify(line));
    else console.log("[ops]", JSON.stringify(line));

    const { error } = await ctx.supabase.from("error_logs").insert({
      message: `[${data.action}] ${data.status}${data.ref ? ` ref=${data.ref}` : ""}${
        data.error ? ` — ${data.error}` : ""
      }`.slice(0, 500),
      stack: JSON.stringify(line).slice(0, 2000),
      severity,
      source: "ops",
      path: (data.path ?? "").slice(0, 200),
      user_id: ctx.userId,
    });
    if (error) console.error("[ops] persist failed:", error.message);

    return { logged: true as const };
  });
