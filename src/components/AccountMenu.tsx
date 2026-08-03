import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, FileText, Heart, LogIn, LogOut, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";

/** হেডারের ডানপাশে কর্পোরেট অ্যাকাউন্ট/লগইন কন্ট্রোল (ডেস্কটপ) */
export function AccountMenu() {
  const { user, profile, isStaff, signOut, loading } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (loading) {
    return <div className="hidden h-9 w-24 animate-pulse rounded-full bg-muted lg:block" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        to="/auth"
        className="hidden items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 lg:inline-flex"
      >
        <LogIn className="h-4 w-4" /> {t("লগইন", "Log in")}
      </Link>
    );
  }

  const label = profile?.name?.trim() || user.email?.split("@")[0] || t("একাউন্ট", "Account");

  return (
    <div className="relative hidden lg:block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex max-w-[10rem] items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold text-navy hover:bg-secondary"
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          {label.charAt(0).toUpperCase()}
        </span>
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-[var(--shadow-elevated)]">
          <p className="truncate px-2.5 py-2 text-[11px] text-muted-foreground">{user.email}</p>
          <Link to="/account" className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-navy hover:bg-secondary">
            <User className="h-4 w-4 text-primary" /> {t("আমার একাউন্ট", "My account")}
          </Link>
          <Link to="/orders" className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-navy hover:bg-secondary">
            <FileText className="h-4 w-4 text-primary" /> {t("আমার অর্ডার", "My orders")}
          </Link>
          <Link to="/wishlist" className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-navy hover:bg-secondary">
            <Heart className="h-4 w-4 text-primary" /> {t("উইশলিস্ট", "Wishlist")}
          </Link>
          {isStaff && (
            <Link to="/admin" className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-navy hover:bg-secondary">
              <ShieldCheck className="h-4 w-4 text-primary" /> {t("ড্যাশবোর্ড", "Dashboard")}
            </Link>
          )}
          <button
            onClick={async () => {
              setOpen(false);
              await signOut();
              void navigate({ to: "/", replace: true });
            }}
            className="mt-1 flex w-full items-center gap-2.5 rounded-xl border-t border-border px-2.5 py-2 text-xs font-semibold text-sale hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" /> {t("লগআউট", "Log out")}
          </button>
        </div>
      )}
    </div>
  );
}
