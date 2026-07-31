import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
        toast.success("একাউন্ট তৈরি হয়েছে");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        toast.success("লগইন সফল");
      }
      await refresh();
      void navigate({ to: "/account" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "কিছু একটা ভুল হয়েছে");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-10">
      <div className="mx-auto max-w-sm rounded-xl border border-border bg-card p-5">
        <h1 className="text-base font-bold">{mode === "signin" ? "লগইন" : "রেজিস্ট্রেশন"}</h1>
        <p className="mt-1 text-xs text-muted-foreground">ইমেইল ও পাসওয়ার্ড দিয়ে ঔষধওয়ালা একাউন্ট ব্যবহার করুন।</p>

        {mode === "signup" && (
          <>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="আপনার নাম"
              className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="মোবাইল নম্বর (01XXXXXXXXX)"
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            />
          </>
        )}

        <input
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="ইমেইল"
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        />
        <input
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="পাসওয়ার্ড"
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        />

        <button
          disabled={busy || !form.email || !form.password}
          onClick={() => void submit()}
          className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "অপেক্ষা করুন..." : mode === "signin" ? "লগইন করুন" : "একাউন্ট তৈরি করুন"}
        </button>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-3 w-full text-xs font-semibold text-primary underline"
        >
          {mode === "signin" ? "নতুন একাউন্ট খুলুন" : "আগের একাউন্টে লগইন করুন"}
        </button>

        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          <Link to="/help" className="underline">শর্তাবলি ও গোপনীয়তা নীতি</Link>
        </p>
      </div>
    </div>
  );
}
