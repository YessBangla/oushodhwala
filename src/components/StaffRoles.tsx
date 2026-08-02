import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, ShieldCheck, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { ROLE_LABEL } from "@/lib/roles";

type StaffRow = { user_id: string; name: string; phone: string; email: string; roles: string[] };
type FoundRow = { user_id: string; name: string; phone: string; email: string };

const ASSIGNABLE: AppRole[] = [
  "super_admin",
  "admin",
  "erp_manager",
  "accountant",
  "support_agent",
  "pharmacist",
  "rider",
];

export function StaffRoles() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useAuth();
  const [q, setQ] = useState("");

  const { data: staff = [] } = useQuery({
    queryKey: ["staff-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_staff");
      if (error) throw error;
      return (data ?? []) as StaffRow[];
    },
  });

  const { data: found = [] } = useQuery({
    queryKey: ["staff-search", q],
    enabled: q.trim().length > 1,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_customers", { _q: q.trim(), _limit: 8 });
      if (error) throw error;
      return (data ?? []) as FoundRow[];
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ id, role, grant }: { id: string; role: AppRole; grant: boolean }) => {
      const { error } = await supabase.rpc("admin_set_role", { _user_id: id, _role: role, _grant: grant });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ভূমিকা হালনাগাদ হয়েছে");
      void qc.invalidateQueries({ queryKey: ["staff-roles"] });
      void qc.invalidateQueries({ queryKey: ["erp-users"] });
    },
    onError: (e: Error) => {
      const m = e.message;
      toast.error(
        m.includes("SUPER_ADMIN_REQUIRED")
          ? "শুধু সুপার অ্যাডমিন এই ভূমিকা দিতে পারেন"
          : m.includes("CANNOT_DEMOTE_SELF")
            ? "নিজের অ্যাডমিন ভূমিকা সরানো যাবে না"
            : m,
      );
    },
  });

  const canAssign = (role: AppRole) => (role === "admin" || role === "super_admin" ? isSuperAdmin : true);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="flex items-center gap-2 text-xs font-bold text-navy">
          <UserCog className="h-4 w-4" /> ভূমিকা ও অনুমতি
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ASSIGNABLE.map((r) => (
            <div key={r} className="rounded-lg border border-border p-2">
              <p className="text-[11px] font-bold text-navy">{ROLE_LABEL[r].bn}</p>
              <p className="text-[10px] text-muted-foreground">{ROLE_LABEL[r].desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-xs font-bold text-navy">নতুন স্টাফ যোগ করুন</p>
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="নাম, ফোন বা ইমেইল দিয়ে ব্যবহারকারী খুঁজুন"
            className="w-full bg-transparent py-2 text-xs outline-none"
          />
        </div>
        {found.length > 0 && (
          <div className="mt-2 space-y-2">
            {found.map((u) => (
              <RoleRow
                key={u.user_id}
                name={u.name}
                email={u.email}
                phone={u.phone}
                roles={[]}
                canAssign={canAssign}
                pending={setRole.isPending}
                onToggle={(role, grant) => setRole.mutate({ id: u.user_id, role, grant })}
              />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <p className="flex items-center gap-2 text-xs font-bold text-navy">
          <ShieldCheck className="h-4 w-4" /> বর্তমান স্টাফ ({staff.length})
        </p>
        <div className="mt-2 space-y-2">
          {staff.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">কোনো স্টাফ নেই</p>}
          {staff.map((s) => (
            <RoleRow
              key={s.user_id}
              name={s.name}
              email={s.email}
              phone={s.phone}
              roles={s.roles as AppRole[]}
              canAssign={canAssign}
              pending={setRole.isPending}
              onToggle={(role, grant) => setRole.mutate({ id: s.user_id, role, grant })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RoleRow({
  name,
  email,
  phone,
  roles,
  canAssign,
  pending,
  onToggle,
}: {
  name: string;
  email: string;
  phone: string;
  roles: AppRole[];
  canAssign: (r: AppRole) => boolean;
  pending: boolean;
  onToggle: (role: AppRole, grant: boolean) => void;
}) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <p className="text-xs font-bold text-navy">{name || "—"}</p>
      <p className="text-[10px] text-muted-foreground">
        {email || "—"} · {phone || "—"}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ASSIGNABLE.map((r) => {
          const on = roles.includes(r);
          const locked = !canAssign(r);
          return (
            <button
              key={r}
              disabled={pending || locked}
              title={locked ? "শুধু সুপার অ্যাডমিন পরিবর্তন করতে পারেন" : ""}
              onClick={() => onToggle(r, !on)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40 ${
                on ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-navy"
              }`}
            >
              {ROLE_LABEL[r].bn}
            </button>
          );
        })}
      </div>
    </div>
  );
}
