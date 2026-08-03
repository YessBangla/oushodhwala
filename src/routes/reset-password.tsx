import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { BrandLogo } from "@/components/BrandLogo";
import { checkRate, cooldownLeft, recordAttempt, MAX_PER_WINDOW } from "@/lib/auth-rate-limit";

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
  ssr: false,
  component: ResetPasswordPage,
});

type Status = { kind: "info" | "success" | "error"; text: string } | null;

function ResetPasswordPage() {
  const t = useT();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<"checking" | "valid" | "invalid">("checking");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [left, setLeft] = useState(0);

  // রিকভারি লিংক থেকে আসা সেশন যাচাই
  useEffect(() => {
    let alive = true;
    const hash = window.location.hash || "";
    const err = /error_description=([^&]+)/.exec(hash);
    if (err?.[1]) {
      setReady("invalid");
      setStatus({ kind: "error", text: decodeURIComponent(err[1].replace(/\+/g, " ")) });
      return;
    }

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data.session) {
        setReady("valid");
        setEmail(data.session.user.email ?? "");
        setStatus({
          kind: "info",
          text: t("লিংক যাচাই সম্পন্ন — এখন নতুন পাসওয়ার্ড সেট করুন।", "Link verified — you can now set a new password."),
        });
      } else {
        setReady("invalid");
        setStatus({
          kind: "error",
          text: t(
            "রিসেট লিংকটি অকার্যকর বা মেয়াদোত্তীর্ণ। নিচে ইমেইল দিয়ে নতুন লিংক নিন।",
            "This reset link is invalid or has expired. Request a new link below.",
          ),
        });
      }
    };
    // hash থেকে সেশন সেট হতে একটু সময় লাগে
    const id = window.setTimeout(() => void check(), 400);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [t]);

  // কুলডাউন কাউন্টডাউন
  useEffect(() => {
    if (!email) return;
    const tick = () => setLeft(cooldownLeft(`reset:${email.trim().toLowerCase()}`));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [email]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ok = pw.length >= 6 && pw === pw2;

  const save = async () => {
    setBusy(true);
    setStatus({ kind: "info", text: t("পাসওয়ার্ড সংরক্ষণ হচ্ছে...", "Saving your new password...") });
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setStatus({ kind: "success", text: t("পাসওয়ার্ড পরিবর্তন হয়েছে — একাউন্টে নিয়ে যাচ্ছি...", "Password updated — taking you to your account...") });
      toast.success(t("পাসওয়ার্ড পরিবর্তন হয়েছে", "Password updated"));
      window.setTimeout(() => void navigate({ to: "/account", replace: true }), 900);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setStatus({
        kind: "error",
        text: /same.*password/i.test(msg)
          ? t("নতুন পাসওয়ার্ড আগেরটির থেকে আলাদা হতে হবে।", "The new password must differ from the old one.")
          : msg || t("কিছু একটা ভুল হয়েছে", "Something went wrong"),
      });
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    const key = `reset:${email.trim().toLowerCase()}`;
    const gate = checkRate(key);
    if (!gate.ok) {
      setStatus({
        kind: "error",
        text:
          gate.reason === "cooldown"
            ? t(`আবার পাঠাতে ${t.n(gate.secondsLeft)} সেকেন্ড অপেক্ষা করুন।`, `Please wait ${gate.secondsLeft}s before requesting again.`)
            : t(
                `ঘণ্টায় সর্বোচ্চ ${t.n(MAX_PER_WINDOW)} বার চেষ্টা করা যায়। ${t.n(gate.minutesLeft)} মিনিট পরে আবার চেষ্টা করুন।`,
                `Limit is ${MAX_PER_WINDOW} requests per hour. Try again in ${gate.minutesLeft} minutes.`,
              ),
      });
      return;
    }
    setBusy(true);
    setStatus({ kind: "info", text: t("নতুন লিংক পাঠানো হচ্ছে...", "Sending a new link...") });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      recordAttempt(key);
      setLeft(cooldownLeft(key));
      setStatus({
        kind: "success",
        text: t("নতুন রিসেট লিংক পাঠানো হয়েছে — ইনবক্স ও স্প্যাম ফোল্ডার দেখুন।", "A new reset link has been sent — check your inbox and spam folder."),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setStatus({
        kind: "error",
        text: /rate limit|too many/i.test(msg)
          ? t("অনেকবার চেষ্টা হয়েছে — কিছুক্ষণ পরে আবার চেষ্টা করুন।", "Too many attempts — please try again later.")
          : msg || t("লিংক পাঠানো যায়নি।", "Could not send the link."),
      });
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-xl border border-border bg-background px-10 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  const statusCls =
    status?.kind === "success"
      ? "border-primary/40 bg-primary/5 text-primary-dark"
      : status?.kind === "error"
        ? "border-sale/40 bg-sale/5 text-sale"
        : "border-border bg-secondary/50 text-muted-foreground";

  return (
    <div className="py-10">
      <div className="mx-auto max-w-sm rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-elevated)]">
        <BrandLogo size={38} bn={t("ঔষধওয়ালা", "Oushodhwala")} />
        <h1 className="mt-4 font-display text-lg font-bold text-navy">{t("নতুন পাসওয়ার্ড সেট করুন", "Set a new password")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("কমপক্ষে ৬ অক্ষরের একটি নিরাপদ পাসওয়ার্ড দিন।", "Choose a secure password of at least 6 characters.")}
        </p>

        {ready === "checking" && (
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("রিসেট লিংক যাচাই করা হচ্ছে...", "Verifying your reset link...")}
          </p>
        )}

        {status && (
          <p role="status" aria-live="polite" className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs font-medium ${statusCls}`}>
            {status.kind === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : status.kind === "error" ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{status.text}</span>
          </p>
        )}

        {ready === "valid" && (
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
              {pw2 && pw !== pw2 && <p className="mt-1 text-[11px] text-sale">{t("পাসওয়ার্ড মিলছে না", "Passwords do not match")}</p>}
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
        )}

        {/* নতুন লিংক পাঠানোর অংশ — লিংক মেয়াদোত্তীর্ণ হলেও কাজ করবে */}
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold text-navy">{t("লিংক পাননি বা মেয়াদ শেষ?", "Didn't get the link or it expired?")}</p>
          <div className="relative mt-2">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("আপনার ইমেইল", "Your email")}
              className={field}
            />
          </div>
          <button
            type="button"
            onClick={() => void resend()}
            disabled={!emailOk || busy || left > 0}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary text-xs font-bold text-primary disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            {left > 0
              ? t(`আবার পাঠান (${t.n(left)}s)`, `Resend (${left}s)`)
              : t("নতুন রিসেট লিংক পাঠান", "Send a new reset link")}
          </button>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {t(
              `নিরাপত্তার জন্য ঘণ্টায় সর্বোচ্চ ${t.n(MAX_PER_WINDOW)} বার লিংক পাঠানো যায়।`,
              `For security, at most ${MAX_PER_WINDOW} link requests are allowed per hour.`,
            )}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
          <Link to="/auth" className="font-bold text-primary underline">
            {t("লগইনে ফিরে যান", "Back to log in")}
          </Link>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-primary" /> {t("নিরাপদ ও এনক্রিপ্টেড", "Secure and encrypted")}
          </span>
        </div>
      </div>
    </div>
  );
}
