import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Truck,
  User,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "লগইন / রেজিস্ট্রেশন — ঔষধওয়ালা" },
      { name: "description", content: "ঔষধওয়ালা একাউন্টে লগইন করুন বা নতুন একাউন্ট খুলে অর্ডার শুরু করুন।" },
      { property: "og:title", content: "লগইন / রেজিস্ট্রেশন — ঔষধওয়ালা" },
      { property: "og:description", content: "একাউন্ট খুলে অর্ডার, প্রেসক্রিপশন ও ল্যাব টেস্ট ম্যানেজ করুন।" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const t = useT();
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<"reset" | "confirm" | null>(null);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/account" });
  }, [loading, user, navigate]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const phoneOk = mode !== "signup" || /^01\d{9}$/.test(form.phone.trim());
  const pwOk = mode === "forgot" || form.password.length >= 6;
  const nameOk = mode !== "signup" || form.name.trim().length >= 2;
  const canSubmit = emailOk && pwOk && phoneOk && nameOk && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("reset");
        toast.success(t("রিসেট লিংক পাঠানো হয়েছে", "Reset link sent"));
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name: form.name.trim(), phone: form.phone.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent("confirm");
          toast.success(t("ইমেইল যাচাই করুন", "Please verify your email"));
          return;
        }
        toast.success(t("একাউন্ট তৈরি হয়েছে", "Account created"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) throw error;
        toast.success(t("লগইন সফল", "Login successful"));
      }
      await refresh();
      void navigate({ to: "/account" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const friendly = /invalid login credentials/i.test(msg)
        ? t("ইমেইল বা পাসওয়ার্ড সঠিক নয়", "Incorrect email or password")
        : /already registered|user already/i.test(msg)
          ? t("এই ইমেইলে একাউন্ট আছে — লগইন করুন", "An account with this email exists — please log in")
          : msg || t("কিছু একটা ভুল হয়েছে", "Something went wrong");
      toast.error(friendly);
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "signin" ? t("লগইন", "Log in") : mode === "signup" ? t("রেজিস্ট্রেশন", "Create account") : t("পাসওয়ার্ড রিসেট", "Reset password");

  const perks = [
    { icon: ShieldCheck, t: t("১০০% অরিজিনাল ঔষধ", "100% authentic medicine") },
    { icon: Truck, t: t("সারাদেশে হোম ডেলিভারি", "Nationwide home delivery") },
    { icon: Clock, t: t("জরুরি ডেলিভারি ৩০–৬০ মিনিট", "Express delivery in 30–60 min") },
    { icon: CheckCircle2, t: t("অর্ডার, প্রেসক্রিপশন ও লয়ালটি পয়েন্ট এক জায়গায়", "Orders, prescriptions & loyalty in one place") },
  ];

  const field = "w-full rounded-xl border border-border bg-background px-10 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="py-6 lg:py-12">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-elevated)] lg:grid-cols-2">
        {/* Brand panel */}
        <aside className="hidden flex-col justify-between bg-navy p-8 text-navy-foreground lg:flex">
          <div>
            <BrandLogo size={44} tone="light" bn={t("ঔষধওয়ালা", "Oushodhwala")} />
            <h2 className="mt-6 font-display text-2xl font-bold leading-snug">
              {t("আপনার বিশ্বস্ত অনলাইন ফার্মেসি", "Your trusted online pharmacy")}
            </h2>
            <ul className="mt-6 space-y-3 text-sm opacity-85">
              {perks.map((p) => (
                <li key={p.t} className="flex items-start gap-2.5">
                  <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{p.t}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-8 text-[11px] opacity-60">
            {t("ঔষধওয়ালা — Shondhaan (Yess Bangla Private Limited এর সিস্টার কনসার্ন)", "Oushodhwala — part of Shondhaan, a sister concern of Yess Bangla Private Limited")}
          </p>
        </aside>

        {/* Form panel */}
        <div className="p-6 sm:p-8">
          <div className="lg:hidden">
            <BrandLogo size={38} bn={t("ঔষধওয়ালা", "Oushodhwala")} />
          </div>

          <h1 className="mt-4 font-display text-xl font-bold text-navy lg:mt-0">{title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "forgot"
              ? t("আপনার ইমেইলে রিসেট লিংক পাঠানো হবে।", "We'll email you a password reset link.")
              : t("ইমেইল ও পাসওয়ার্ড দিয়ে ঔষধওয়ালা একাউন্ট ব্যবহার করুন।", "Use your email and password to access your Oushodhwala account.")}
          </p>

          {mode !== "forgot" && (
            <div className="mt-4 flex rounded-xl bg-muted p-1 text-xs font-bold">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={`min-h-11 flex-1 rounded-lg px-3 ${mode === m ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
                >
                  {m === "signin" ? t("লগইন", "Log in") : t("নতুন একাউন্ট", "Sign up")}
                </button>
              ))}
            </div>
          )}

          {sent ? (
            <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              <p className="mt-2 text-sm font-semibold text-navy">
                {sent === "reset"
                  ? t("রিসেট লিংক পাঠানো হয়েছে", "Reset link sent")
                  : t("ইমেইল যাচাই করুন", "Verify your email")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("আমরা", "We sent an email to")} <b>{form.email}</b>{" "}
                {sent === "reset"
                  ? t("ঠিকানায় একটি রিসেট লিংক পাঠিয়েছি। ইনবক্স/স্প্যাম চেক করুন।", "with a reset link. Check your inbox or spam folder.")
                  : t("ঠিকানায় একটি কনফার্মেশন লিংক পাঠিয়েছি। লিংকে ক্লিক করলেই একাউন্ট চালু হবে।", "with a confirmation link. Click it to activate your account.")}
              </p>
              <button
                onClick={() => {
                  setSent(null);
                  setMode("signin");
                }}
                className="mt-3 text-xs font-bold text-primary underline"
              >
                {t("লগইনে ফিরে যান", "Back to log in")}
              </button>
            </div>
          ) : (
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {mode === "signup" && (
                <>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={form.name}
                      autoComplete="name"
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={t("আপনার নাম", "Your full name")}
                      className={field}
                    />
                  </div>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={form.phone}
                      inputMode="numeric"
                      autoComplete="tel"
                      onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                      placeholder={t("মোবাইল নম্বর (01XXXXXXXXX)", "Mobile number (01XXXXXXXXX)")}
                      className={field}
                    />
                    {form.phone && !phoneOk && (
                      <p className="mt-1 text-[11px] text-sale">{t("১১ ডিজিটের সঠিক নম্বর দিন", "Enter a valid 11-digit number")}</p>
                    )}
                  </div>
                </>
              )}

              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={t("ইমেইল", "Email address")}
                  className={field}
                />
                {form.email && !emailOk && (
                  <p className="mt-1 text-[11px] text-sale">{t("সঠিক ইমেইল দিন", "Enter a valid email")}</p>
                )}
              </div>

              {mode !== "forgot" && (
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPw ? "text" : "password"}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={t("পাসওয়ার্ড", "Password")}
                    className={`${field} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? t("পাসওয়ার্ড লুকান", "Hide password") : t("পাসওয়ার্ড দেখান", "Show password")}
                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-muted-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {mode === "signup" && form.password && !pwOk && (
                    <p className="mt-1 text-[11px] text-sale">{t("কমপক্ষে ৬ অক্ষর", "At least 6 characters")}</p>
                  )}
                </div>
              )}

              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="block w-full text-right text-[11px] font-semibold text-primary underline"
                >
                  {t("পাসওয়ার্ড ভুলে গেছেন?", "Forgot password?")}
                </button>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "signin"
                  ? t("লগইন করুন", "Log in")
                  : mode === "signup"
                    ? t("একাউন্ট তৈরি করুন", "Create account")
                    : t("রিসেট লিংক পাঠান", "Send reset link")}
              </button>

              {mode === "forgot" && (
                <button type="button" onClick={() => setMode("signin")} className="w-full text-xs font-semibold text-primary underline">
                  {t("লগইনে ফিরে যান", "Back to log in")}
                </button>
              )}
            </form>
          )}

          <p className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-primary" />
            {t("আপনার তথ্য এনক্রিপ্টেড ও সুরক্ষিত", "Your data is encrypted and secure")}
          </p>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            <Link to="/terms" className="underline">{t("শর্তাবলি", "Terms")}</Link>
            {" · "}
            <Link to="/privacy" className="underline">{t("গোপনীয়তা নীতি", "Privacy policy")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
