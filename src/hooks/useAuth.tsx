import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = { id: string; name: string; phone: string };

export type AppRole =
  | "super_admin"
  | "admin"
  | "erp_manager"
  | "support_agent"
  | "accountant"
  | "pharmacist"
  | "rider"
  | "user";

/** ব্যাক-অফিস ভূমিকাগুলো — এদের যেকোনোটি থাকলে ড্যাশবোর্ডে ঢোকা যাবে */
export const STAFF_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "erp_manager",
  "support_agent",
  "accountant",
  "pharmacist",
];

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isStaff: boolean;
  hasRole: (r: AppRole) => boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMeta = async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      setRoles([]);
      return;
    }
    const [{ data: p }, { data: myRoles }] = await Promise.all([
      supabase.from("profiles").select("id, name, phone").eq("id", uid).maybeSingle(),
      supabase.rpc("my_roles"),
    ]);
    setProfile(p ?? null);
    setRoles(((myRoles as string[] | null) ?? []) as AppRole[]);
  };


  useEffect(() => {
    let alive = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!alive) return;
      setSession(s);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setRoles([]);
      } else {
        void loadMeta(s?.user.id);
      }
    });
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await loadMeta(data.session?.user.id);
      setLoading(false);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const hasRole = (r: AppRole) => roles.includes(r);
  const isSuperAdmin = hasRole("super_admin");
  const isAdmin = isSuperAdmin || hasRole("admin");
  const isStaff = isAdmin || STAFF_ROLES.some((r) => roles.includes(r));

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    profile,
    roles,
    isAdmin,
    isSuperAdmin,
    isStaff,
    hasRole,
    loading,
    refresh: async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      await loadMeta(data.session?.user.id);
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
      setRoles([]);
    },
  };


  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
