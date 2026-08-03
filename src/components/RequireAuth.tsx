import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2, Lock } from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";

export const REDIRECT_KEY = "ow-auth-redirect";

/** লগইনের পরে যেখানে ফিরে যেতে হবে সেই পাথ (sessionStorage) */
export function takeRedirect(): string | null {
  try {
    const p = sessionStorage.getItem(REDIRECT_KEY);
    sessionStorage.removeItem(REDIRECT_KEY);
    return p;
  } catch {
    return null;
  }
}

type Props = {
  children: ReactNode;
  /** স্টাফ-অনলি এরিয়া (ড্যাশবোর্ড) */
  staffOnly?: boolean;
  roles?: AppRole[];
};

/** সুরক্ষিত রুট গার্ড — লগইন না থাকলে /auth এ পাঠায় এবং ফিরে আসার পাথ মনে রাখে */
export function RequireAuth({ children, staffOnly, roles }: Props) {
  const t = useT();
  const navigate = useNavigate();
  const { user, loading, isStaff, hasRole, expired } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.href });

  useEffect(() => {
    if (loading || user) return;
    try {
      sessionStorage.setItem(REDIRECT_KEY, pathname);
    } catch {
      /* ignore */
    }
    void navigate({ to: "/auth", replace: true });
  }, [loading, user, pathname, navigate]);

  if (loading) {
    return (
      <p className="flex items-center justify-center gap-2 pt-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("লোড হচ্ছে...", "Loading...")}
      </p>
    );
  }

  if (!user) {
    return (
      <div className="pt-16 text-center">
        <Lock className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-3 text-base font-bold">
          {expired
            ? t("সেশনের মেয়াদ শেষ — আবার লগইন করুন", "Session expired — please log in again")
            : t("এই পেজ দেখতে লগইন করুন", "Log in to view this page")}
        </h1>
        <Link to="/auth" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          {t("লগইন করুন", "Log in")}
        </Link>
      </div>
    );
  }

  const allowed = staffOnly ? isStaff : roles ? roles.some((r) => hasRole(r)) : true;
  if (!allowed) {
    return (
      <div className="pt-16 text-center">
        <Lock className="mx-auto h-8 w-8 text-sale" />
        <h1 className="mt-3 text-base font-bold">{t("অনুমতি নেই", "Access denied")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("এই অংশটি শুধু অনুমোদিত স্টাফদের জন্য।", "This area is restricted to authorised staff.")}
        </p>
        <Link to="/account" className="mt-4 inline-block rounded-lg border border-border px-4 py-2 text-xs font-semibold">
          {t("একাউন্টে ফিরে যান", "Back to account")}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
