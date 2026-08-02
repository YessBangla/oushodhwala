/**
 * সার্ভার ফাংশনের জন্য শেয়ার্ড অথরাইজেশন হেল্পার।
 * সঠিক HTTP স্ট্যাটাস (401/403/404) সহ Response থ্রো করে — জেনেরিক 500 নয়।
 */

export type AuthzCtx = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  userId: string;
};

export type Role = "admin" | "erp_manager";

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: code, message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function unauthorized(message = "Authentication required"): Response {
  return jsonError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "You do not have permission to perform this action"): Response {
  return jsonError(403, "FORBIDDEN", message);
}

export function notFound(message = "Resource not found"): Response {
  return jsonError(404, "NOT_FOUND", message);
}

export function badRequest(message = "Invalid request"): Response {
  return jsonError(400, "BAD_REQUEST", message);
}

async function hasRole(context: AuthzCtx, role: Role): Promise<boolean> {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: role,
  });
  if (error) return false;
  return data === true;
}

/** সাইন-ইন করা ব্যবহারকারী নিশ্চিত করে (মিডলওয়্যার ব্যর্থ হলে 401) */
export function requireUser(context: Partial<AuthzCtx> | undefined): AuthzCtx {
  if (!context?.userId || !context.supabase) throw unauthorized();
  return context as AuthzCtx;
}

/** শুধুমাত্র অ্যাডমিন — অন্যথায় 403 */
export async function requireAdmin(context: Partial<AuthzCtx> | undefined): Promise<AuthzCtx> {
  const ctx = requireUser(context);
  if (!(await hasRole(ctx, "admin"))) throw forbidden("Admin role required");
  return ctx;
}

/** অ্যাডমিন বা ইআরপি ম্যানেজার — অন্যথায় 403 */
export async function requireStaff(context: Partial<AuthzCtx> | undefined): Promise<AuthzCtx> {
  const ctx = requireUser(context);
  const [admin, erp] = await Promise.all([hasRole(ctx, "admin"), hasRole(ctx, "erp_manager")]);
  if (!admin && !erp) throw forbidden("Admin or ERP manager role required");
  return ctx;
}

/** অ্যাডমিন যাচাইয়ের পর সার্ভিস-রোল ক্লায়েন্ট ফেরত দেয় */
export async function adminClient(context: Partial<AuthzCtx> | undefined) {
  await requireAdmin(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabaseAdmin as any;
}

/** স্টাফ যাচাইয়ের পর সার্ভিস-রোল ক্লায়েন্ট ফেরত দেয় */
export async function staffClient(context: Partial<AuthzCtx> | undefined) {
  await requireStaff(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabaseAdmin as any;
}
