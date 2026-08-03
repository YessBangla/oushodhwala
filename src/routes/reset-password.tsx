import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "পাসওয়ার্ড রিসেট — ঔষধওয়ালা" },
      { name: "description", content: "ঔষধওয়ালা একাউন্টের নতুন পাসওয়ার্ড সেট করুন।" },
      { property: "og:title", content: "পাসওয়ার্ড রিসেট — ঔষধওয়ালা" },
      { property: "og:description", content: "নিরাপদভাবে নতুন পাসওয়ার্ড সেট করুন।" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const t = useT();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const ok = pw.length >= 6 && pw === pw2;

  const save = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success(t("পাসওয়ার্ড পরিবর্তন হয়েছে", "Password updated"));
      void navigate({ to: "/account", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("কিছু একটা ভুল হয়েছে", "Something went wrong"));
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full rounded-xl border border-border bg-background px-10 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="py-10">
      <div className="mx-auto max-w-sm rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-elevated)]">
        <BrandLogo size={38} bn={t("ঔষধওয়ালা", "Oushodhwala")} />
        <h1 className="mt-4 font-display text-lg font-bold text-navy">{t("নতুন পাসওয়ার্ড সেট করুন", "Set a new password")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("কমপক্ষে ৬ অক্ষরের একটি নিরাপদ পাসওয়ার্ড দিন।", "Choose a secure password of at least 6 characters.")}
        </p>

        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (ok) void save();
          }}
        >
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder={t("নতুন পাসওয়ার্ড", "New password")}
              className={`${field} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? t("পাসওয়ার্ড লুকান", "Hide password") : t("পাসওয়ার্ড দেখান", "Show password")}
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-muted-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder={t("পাসওয়ার্ড নিশ্চিত করুন", "Confirm password")}
              className={field}
            />
            {pw2 && pw !== pw2 && (
              <p className="mt-1 text-[11px] text-sale">{t("পাসওয়ার্ড মিলছে না", "Passwords do not match")}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!ok || busy}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("পাসওয়ার্ড সেভ করুন", "Save password")}
          </button>
        </form>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-primary" /> {t("নিরাপদ ও এনক্রিপ্টেড", "Secure and encrypted")}
        </p>
      </div>
    </div>
  );
}
