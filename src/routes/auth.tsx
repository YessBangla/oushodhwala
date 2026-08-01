import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";

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

function AuthPage() {
  const t = useT();
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/account" });
  }, [loading, user, navigate]);

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name: form.name, phone: form.phone },
          },
        });
        if (error) throw error;
        await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        toast.success(t("একাউন্ট তৈরি হয়েছে", "Account created"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        toast.success(t("লগইন সফল", "Login successful"));
      }
      await refresh();
      void navigate({ to: "/account" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("কিছু একটা ভুল হয়েছে", "Something went wrong"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-10">
      <div className="mx-auto max-w-sm rounded-xl border border-border bg-card p-5">
        <h1 className="text-base font-bold">{mode === "signin" ? t("লগইন", "Login") : t("রেজিস্ট্রেশন", "Registration")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("ইমেইল ও পাসওয়ার্ড দিয়ে ঔষধওয়ালা একাউন্ট ব্যবহার করুন।", "Use your email and password to access your Oushodhwala account.")}</p>

        {mode === "signup" && (
          <>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("আপনার নাম", "Your name")}
              className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={t("মোবাইল নম্বর (01XXXXXXXXX)", "Mobile number (01XXXXXXXXX)")}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            />
          </>
        )}

        <input
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder={t("ইমেইল", "Email")}
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        />
        <input
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder={t("পাসওয়ার্ড", "Password")}
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        />

        <button
          disabled={busy || !form.email || !form.password}
          onClick={() => void submit()}
          className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? t("অপেক্ষা করুন...", "Please wait...") : mode === "signin" ? t("লগইন করুন", "Log in") : t("একাউন্ট তৈরি করুন", "Create account")}
        </button>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-3 w-full text-xs font-semibold text-primary underline"
        >
          {mode === "signin" ? t("নতুন একাউন্ট খুলুন", "Create a new account") : t("আগের একাউন্টে লগইন করুন", "Log in to your existing account")}
        </button>

        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          <Link to="/help" className="underline">{t("শর্তাবলি ও গোপনীয়তা নীতি", "Terms & privacy policy")}</Link>
        </p>
      </div>
    </div>
  );
}
