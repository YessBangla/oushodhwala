import { useQuery } from "@tanstack/react-query";
import { Award, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";

const TIER: Record<string, { bn: string; en: string; emoji: string }> = {
  silver: { bn: "সিলভার", en: "Silver", emoji: "🥈" },
  gold: { bn: "গোল্ড", en: "Gold", emoji: "🥇" },
  platinum: { bn: "প্লাটিনাম", en: "Platinum", emoji: "💎" },
};

const NEXT: Record<string, number> = { silver: 1000, gold: 5000 };

export function LoyaltyCard() {
  const t = useT();

  const { data: acc } = useQuery({
    queryKey: ["my-loyalty"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_loyalty");
      if (error) throw error;
      return data as unknown as {
        points_earned: number;
        points_spent: number;
        balance: number;
        tier: string;
      } | null;
    },
  });

  const { data: tx } = useQuery({
    queryKey: ["my-loyalty-tx"],
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_transactions")
        .select("id, points, kind, order_no, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const tier = TIER[acc?.tier ?? "silver"] ?? TIER["silver"]!;
  const earned = acc?.points_earned ?? 0;
  const goal = NEXT[acc?.tier ?? "silver"];
  const pct = goal ? Math.min(100, Math.round((earned / goal) * 100)) : 100;

  return (
    <section className="mt-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold">{t("লয়ালটি পয়েন্ট", "Loyalty points")}</p>
        <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">
          {tier.emoji} {t(tier.bn, tier.en)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-secondary p-2">
          <p className="text-base font-bold text-primary">{t.n(acc?.balance ?? 0)}</p>
          <p className="text-[10px] text-muted-foreground">{t("ব্যালেন্স", "Balance")}</p>
        </div>
        <div className="rounded-lg bg-secondary p-2">
          <p className="text-base font-bold">{t.n(earned)}</p>
          <p className="text-[10px] text-muted-foreground">{t("মোট অর্জিত", "Earned")}</p>
        </div>
        <div className="rounded-lg bg-secondary p-2">
          <p className="text-base font-bold">{t.n(acc?.points_spent ?? 0)}</p>
          <p className="text-[10px] text-muted-foreground">{t("ব্যবহৃত", "Redeemed")}</p>
        </div>
      </div>

      {goal ? (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t(
              `পরবর্তী টিয়ারে পৌঁছাতে আরও ${t.n(Math.max(0, goal - earned))} পয়েন্ট দরকার`,
              `${Math.max(0, goal - earned)} more points to reach the next tier`,
            )}
          </p>
        </div>
      ) : null}

      <p className="mt-2 text-[11px] text-muted-foreground">
        {t(
          "প্রতি ১০০ টাকার ডেলিভারি সম্পন্ন অর্ডারে ১ পয়েন্ট। ১ পয়েন্ট = ১ টাকা ছাড়।",
          "1 point per ৳100 on delivered orders. 1 point = ৳1 discount.",
        )}
      </p>

      {tx && tx.length > 0 ? (
        <div className="mt-3 border-t border-border pt-2">
          <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <History className="h-3 w-3" /> {t("সাম্প্রতিক লেনদেন", "Recent activity")}
          </p>
          <ul className="divide-y divide-border text-xs">
            {tx.map((r) => (
              <li key={r.id} className="flex items-center gap-2 py-1.5">
                <span className="truncate">
                  {r.order_no || t("সমন্বয়", "Adjustment")}
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </span>
                <span className={`ml-auto font-bold ${r.points >= 0 ? "text-primary" : "text-destructive"}`}>
                  {r.points >= 0 ? "+" : "−"}
                  {t.n(Math.abs(r.points))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
