import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Award, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";

type Row = {
  user_id: string;
  name: string;
  phone: string;
  points_earned: number;
  points_spent: number;
  balance: number;
  tier: string;
};

const TIER_LABEL: Record<string, string> = {
  silver: "সিলভার 🥈",
  gold: "গোল্ড 🥇",
  platinum: "প্লাটিনাম 💎",
};

export function LoyaltyAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<{ id: string; pts: string; reason: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-loyalty"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_loyalty", { _limit: 200 });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const adjust = useMutation({
    mutationFn: async (v: { id: string; pts: number; reason: string }) => {
      const { error } = await supabase.rpc("admin_adjust_loyalty", {
        _user_id: v.id,
        _points: v.pts,
        _reason: v.reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("পয়েন্ট সমন্বয় হয়েছে");
      setEdit(null);
      void qc.invalidateQueries({ queryKey: ["admin-loyalty"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (data ?? []).filter(
    (r) => !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.phone.includes(q),
  );

  const totals = (data ?? []).reduce(
    (a, r) => ({
      bal: a.bal + r.balance,
      earned: a.earned + r.points_earned,
      spent: a.spent + r.points_spent,
    }),
    { bal: 0, earned: 0, spent: 0 },
  );

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { t: "সদস্য", v: bn((data ?? []).length) },
          { t: "মোট ব্যালেন্স পয়েন্ট", v: bn(totals.bal) },
          { t: "মোট অর্জিত", v: bn(totals.earned) },
          { t: "মোট ব্যবহৃত", v: bn(totals.spent) },
        ].map((c) => (
          <div key={c.t} className="rounded-xl border border-border bg-card p-3">
            <p className="text-lg font-bold text-primary">{c.v}</p>
            <p className="text-[11px] text-muted-foreground">{c.t}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card p-3">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Award className="h-4 w-4 text-primary" /> লয়ালটি সদস্য
        </h3>

        <div className="mb-3 flex items-center gap-2 rounded-lg border border-border px-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="নাম বা মোবাইল দিয়ে খুঁজুন"
            className="w-full bg-transparent py-2 text-xs outline-none"
          />
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">লোড হচ্ছে…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">কোনো সদস্য নেই</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2">গ্রাহক</th>
                  <th>টিয়ার</th>
                  <th className="text-right">অর্জিত</th>
                  <th className="text-right">ব্যবহৃত</th>
                  <th className="text-right">ব্যালেন্স</th>
                  <th className="text-right">সমন্বয়</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user_id} className="border-b border-border/60">
                    <td className="py-2">
                      <span className="block font-semibold">{r.name || "—"}</span>
                      <span className="text-[10px] text-muted-foreground">{r.phone || "—"}</span>
                    </td>
                    <td>{TIER_LABEL[r.tier] ?? r.tier}</td>
                    <td className="text-right">{bn(r.points_earned)}</td>
                    <td className="text-right">{bn(r.points_spent)}</td>
                    <td className="text-right font-bold text-primary">{bn(r.balance)}</td>
                    <td className="text-right">
                      <button
                        onClick={() => setEdit({ id: r.user_id, pts: "", reason: "" })}
                        className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold"
                      >
                        পয়েন্ট দিন
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {edit ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setEdit(null)}>
          <div className="w-full max-w-sm rounded-xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold">পয়েন্ট সমন্বয়</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              ধনাত্মক সংখ্যা দিলে পয়েন্ট যোগ হবে, ঋণাত্মক দিলে বিয়োগ হবে।
            </p>
            <input
              type="number"
              value={edit.pts}
              onChange={(e) => setEdit({ ...edit, pts: e.target.value })}
              placeholder="যেমন: 100 অথবা -50"
              className="mt-3 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none"
            />
            <input
              value={edit.reason}
              onChange={(e) => setEdit({ ...edit, reason: e.target.value })}
              placeholder="কারণ (ঐচ্ছিক)"
              className="mt-2 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none"
            />
            <div className="mt-3 flex gap-2">
              <button onClick={() => setEdit(null)} className="flex-1 rounded-lg border border-border py-2 text-xs font-semibold">
                বাতিল
              </button>
              <button
                disabled={adjust.isPending || !Number(edit.pts)}
                onClick={() =>
                  adjust.mutate({ id: edit.id, pts: Number(edit.pts), reason: edit.reason })
                }
                className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                {adjust.isPending ? "হচ্ছে…" : "নিশ্চিত করুন"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
