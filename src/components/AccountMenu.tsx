import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, FileText, Heart, LogIn, LogOut, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { useDismissable, menuKeyNav } from "@/hooks/useDismissable";

/** হেডারের ডানপাশে কর্পোরেট অ্যাকাউন্ট/লগইন কন্ট্রোল (ডেস্কটপ) */
export function AccountMenu() {
  const { user, profile, isStaff, signOut, loading } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { ref, triggerRef } = useDismissable<HTMLDivElement>(open, close);

  // খুললে প্রথম মেনু আইটেমে ফোকাস
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, ref]);

  if (loading) {
    return <div className="hidden h-9 w-24 animate-pulse rounded-full bg-muted lg:block" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        to="/auth"
        className="hidden items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:inline-flex"
      >
        <LogIn className="h-4 w-4" /> {t("লগইন", "Log in")}
      </Link>
    );
  }

  const label = profile?.name?.trim() || user.email?.split("@")[0] || t("একাউন্ট", "Account");
  const itemCls =
    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-navy outline-none hover:bg-secondary focus-visible:bg-secondary focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <div className="relative hidden lg:block" ref={ref} onKeyDown={(e) => menuKeyNav(ref.current, e)}>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex max-w-[10rem] items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold text-navy transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          {label.charAt(0).toUpperCase()}
        </span>
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("একাউন্ট মেনু", "Account menu")}
          className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-[var(--shadow-elevated)]"
        >
          <p className="truncate px-2.5 py-2 text-[11px] text-muted-foreground">{user.email}</p>
          <Link to="/account" role="menuitem" onClick={close} className={itemCls}>
            <User className="h-4 w-4 text-primary" /> {t("আমার একাউন্ট", "My account")}
          </Link>
          <Link to="/orders" role="menuitem" onClick={close} className={itemCls}>
            <FileText className="h-4 w-4 text-primary" /> {t("আমার অর্ডার", "My orders")}
          </Link>
          <Link to="/wishlist" role="menuitem" onClick={close} className={itemCls}>
            <Heart className="h-4 w-4 text-primary" /> {t("উইশলিস্ট", "Wishlist")}
          </Link>
          {isStaff && (
            <Link to="/admin" role="menuitem" onClick={close} className={itemCls}>
              <ShieldCheck className="h-4 w-4 text-primary" /> {t("ড্যাশবোর্ড", "Dashboard")}
            </Link>
          )}
          <button
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await signOut();
              void navigate({ to: "/", replace: true });
            }}
            className={`${itemCls} mt-1 border-t border-border text-sale`}
          >
            <LogOut className="h-4 w-4" /> {t("লগআউট", "Log out")}
          </button>
        </div>
      )}
    </div>
  );
}
