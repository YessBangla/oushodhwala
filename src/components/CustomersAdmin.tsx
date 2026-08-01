import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, ShieldCheck, ShieldOff, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";

type Row = {
  user_id: string;
  name: string;
  phone: string;
  email: string;
  is_admin: boolean;
  orders_count: number;
  total_spent: number;
  joined_at: string;
};

export function CustomersAdmin() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-customers", term],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_customers", { _q: term, _limit: 200 });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const setAdmin = useMutation({
    mutationFn: async ({ id, make }: { id: string; make: boolean }) => {
      const { error } = await supabase.rpc("admin_set_user_admin", { _user_id: id, _make_admin: make });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ভূমিকা হালনাগাদ হয়েছে");
      void qc.invalidateQueries({ queryKey: ["admin-customers"] });
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("CANNOT_DEMOTE_SELF") ? "নিজের অ্যাডমিন ভূমিকা সরানো যাবে না" : e.message),
  });

  const rows = data ?? [];
  const totalSpent = rows.reduce((s, r) => s + Number(r.total_spent || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="মোট গ্রাহক" value={bn(rows.length)} />
        <Stat label="অ্যাডমিন" value={bn(rows.filter((r) => r.is_admin).length)} />
        <Stat label="মোট বিক্রয় (তালিকাভুক্ত)" value={`৳${bn(Math.round(totalSpent))}`} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTerm(q.trim());
        }}
        className="flex gap-2"
      >
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="নাম, ফোন বা ইমেইল দিয়ে খুঁজুন"
            className="w-full bg-transparent py-2 text-xs outline-none"
          />
        </div>
        <button className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">খুঁজুন</button>
      </form>

      {error && <p className="text-xs text-sale">{(error as Error).message}</p>}
      {isLoading ? (
        <p className="py-8 text-center text-xs text-muted-foreground">লোড হচ্ছে…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">কোনো গ্রাহক পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">গ্রাহক</th>
                <th className="px-3 py-2">যোগাযোগ</th>
                <th className="px-3 py-2 text-center">অর্ডার</th>
                <th className="px-3 py-2 text-right">মোট খরচ</th>
                <th className="px-3 py-2">যোগদান</th>
                <th className="px-3 py-2 text-right">ভূমিকা</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} className="border-t border-border">
                  <td className="px-3 py-2 font-semibold text-navy">{r.name || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    <span className="block">{r.email || "—"}</span>
                    <span className="block">{r.phone || "—"}</span>
                  </td>
                  <td className="px-3 py-2 text-center">{bn(Number(r.orders_count))}</td>
                  <td className="px-3 py-2 text-right font-semibold">৳{bn(Math.round(Number(r.total_spent)))}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(r.joined_at).toLocaleDateString("bn-BD")}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      disabled={setAdmin.isPending}
                      onClick={() => setAdmin.mutate({ id: r.user_id, make: !r.is_admin })}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
                        r.is_admin
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground hover:text-navy"
                      }`}
                    >
                      {r.is_admin ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                      {r.is_admin ? "অ্যাডমিন" : "ব্যবহারকারী"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-extrabold text-navy">{value}</p>
    </div>
  );
}
