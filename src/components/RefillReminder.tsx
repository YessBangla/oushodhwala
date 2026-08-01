import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";

/** রিফিল রিমাইন্ডার — নির্দিষ্ট দিন পরপর ঔষধ ফুরিয়ে যাওয়ার আগে মনে করিয়ে দেয় */
export function RefillReminder({ productId, productName }: { productId: string; productName: string }) {
  const t = useT();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [days, setDays] = useState(30);

  const { data: existing } = useQuery({
    queryKey: ["refill", productId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("refill_reminders")
        .select("id, every_days, next_at, active")
        .eq("product_id", productId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("auth");
      if (existing) {
        const { error } = await supabase.from("refill_reminders").delete().eq("id", existing.id);
        if (error) throw error;
        return;
      }
      const next = new Date();
      next.setDate(next.getDate() + days);
      const { error } = await supabase.from("refill_reminders").insert({
        user_id: user.id,
        product_id: productId,
        product_name: productName,
        every_days: days,
        next_at: next.toISOString().slice(0, 10),
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["refill"] }),
  });

  if (!user) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-card p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <BellRing className="h-3.5 w-3.5 text-primary" />
        {t("রিফিল রিমাইন্ডার", "Refill reminder")}
      </p>
      {existing ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-[11px] text-muted-foreground">
            {t("পরবর্তী মনে করিয়ে দেওয়া", "Next reminder")}:{" "}
            <b>{new Date(existing.next_at).toLocaleDateString(t.en ? "en-US" : "bn-BD")}</b>
          </p>
          <button
            type="button"
            onClick={() => toggle.mutate()}
            className="ml-auto flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold"
          >
            <BellOff className="h-3 w-3" /> {t("বন্ধ করুন", "Turn off")}
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="text-[11px] text-muted-foreground">{t("প্রতি", "Every")}</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          >
            {[7, 15, 30, 60, 90].map((d) => (
              <option key={d} value={d}>
                {t.n(d)} {t("দিন", "days")}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={toggle.isPending}
            onClick={() => toggle.mutate()}
            className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {t("মনে করিয়ে দিন", "Remind me")}
          </button>
        </div>
      )}
    </div>
  );
}
