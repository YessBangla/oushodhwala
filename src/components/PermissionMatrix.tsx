import { useMemo, useState } from "react";
import { ShieldCheck, Check, Minus } from "lucide-react";
import { ROLE_LABEL, ROLE_TABS } from "@/lib/roles";
import type { AppRole } from "@/hooks/useAuth";
import { downloadCsv, printReport } from "@/lib/erp-report";

/** ড্যাশবোর্ড মডিউলের বাংলা নাম (রোল ম্যাট্রিক্সে দেখানোর জন্য) */
const MODULE_LABEL: Record<string, string> = {
  dash: "ড্যাশবোর্ড",
  workspace: "ওয়ার্কস্পেস",
  pos: "POS / কাউন্টার বিক্রয়",
  orders: "অর্ডার",
  inventory: "ইনভেন্টরি",
  products: "প্রোডাক্ট",
  categories: "ক্যাটাগরি",
  offers: "অফার",
  customers: "গ্রাহক",
  support: "সাপোর্ট ইনবক্স",
  rx: "প্রেসক্রিপশন",
  consults: "কনসালটেশন",
  doctors: "ডাক্তার",
  lab: "ল্যাব টেস্ট",
  diagnostics: "ডায়াগনস্টিক",
  services: "হোম সার্ভিস",
  delivery: "ডেলিভারি",
  riders: "রাইডার",
  zones: "ডেলিভারি জোন",
  suppliers: "সাপ্লায়ার",
  purchases: "ক্রয়",
  batches: "ব্যাচ ও মেয়াদ",
  stockadj: "স্টক অ্যাডজাস্টমেন্ট",
  stockcount: "স্টক কাউন্ট",
  labels: "লেবেল প্রিন্ট",
  branches: "ব্রাঞ্চ",
  transfers: "স্টক ট্রান্সফার",
  accounts: "অ্যাকাউন্টস",
  expenses: "খরচ",
  coa: "চার্ট অব অ্যাকাউন্টস",
  journal: "জার্নাল",
  daybook: "ডে-বুক",
  financials: "ফিন্যান্সিয়ালস",
  party: "পার্টি স্টেটমেন্ট",
  reports: "রিপোর্ট",
  erpreports: "ইআরপি রিপোর্ট",
  returns: "রিটার্ন",
  reviews: "রিভিউ",
  loyalty: "লয়ালটি",
  audit: "অডিট ট্রেইল",
  monitor: "সিস্টেম মনিটর",
  health: "ডেটা হেলথ",
  apihub: "API হাব",
  staff: "স্টাফ ও ভূমিকা",
  erproles: "ইআরপি রোল",
  gallery: "মিডিয়া গ্যালারি",
  imgupload: "ছবি আপলোড",
  imgaudit: "ছবি যাচাই",
  imgrev: "ছবি রিভিশন",
  campaigns: "ক্যাম্পেইন",
  perms: "পারমিশন ম্যাট্রিক্স",
};

const ROLES = Object.keys(ROLE_LABEL) as AppRole[];

function moduleList(): string[] {
  const set = new Set<string>(Object.keys(MODULE_LABEL));
  ROLES.forEach((r) => (ROLE_TABS[r] ?? []).forEach((t) => t !== "*" && set.add(t)));
  return [...set].sort((a, b) => (MODULE_LABEL[a] ?? a).localeCompare(MODULE_LABEL[b] ?? b, "bn"));
}

const can = (role: AppRole, mod: string) => {
  const tabs = ROLE_TABS[role] ?? [];
  return tabs.includes("*") || tabs.includes(mod);
};

/** রোল বনাম মডিউল পারমিশন ম্যাট্রিক্স — কে কোন মডিউল খুলতে পারে */
export function PermissionMatrix() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"" | AppRole>("");

  const mods = useMemo(() => {
    const all = moduleList();
    const term = q.trim().toLowerCase();
    return all.filter((m) => {
      const okQ = !term || (MODULE_LABEL[m] ?? m).toLowerCase().includes(term) || m.includes(term);
      const okR = !role || can(role, m);
      return okQ && okR;
    });
  }, [q, role]);

  const shown = role ? ([role] as AppRole[]) : ROLES;

  const cols = [{ key: "module", label: "মডিউল" }, ...shown.map((r) => ({ key: r, label: ROLE_LABEL[r].bn }))];
  const rows = mods.map((m) => {
    const row: Record<string, string> = { module: MODULE_LABEL[m] ?? m };
    shown.forEach((r) => (row[r] = can(r, m) ? "হ্যাঁ" : "না"));
    return row;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="মডিউল খুঁজুন…"
          className="min-h-11 min-w-48 flex-1 rounded-lg border border-border bg-card px-3 text-base sm:text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "" | AppRole)}
          className="min-h-11 rounded-lg border border-border bg-card px-3 text-base sm:text-sm"
        >
          <option value="">সব ভূমিকা</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r].bn}
            </option>
          ))}
        </select>
        <button
          onClick={() => downloadCsv(`permissions-${new Date().toISOString().slice(0, 10)}`, cols, rows)}
          className="min-h-11 rounded-lg border border-border px-3 text-xs font-semibold"
        >
          CSV
        </button>
        <button
          onClick={() => printReport("রোলভিত্তিক পারমিশন ম্যাট্রিক্স", `${rows.length} টি মডিউল`, cols, rows)}
          className="min-h-11 rounded-lg border border-border px-3 text-xs font-semibold"
        >
          PDF
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[760px] text-xs">
          <thead className="bg-secondary/40 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">মডিউল</th>
              {shown.map((r) => (
                <th key={r} className="px-2 py-2 text-center">
                  {ROLE_LABEL[r].bn}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mods.map((m) => (
              <tr key={m}>
                <td className="px-3 py-2">
                  <span className="font-semibold">{MODULE_LABEL[m] ?? m}</span>
                  <span className="ml-1 font-mono text-[10px] text-muted-foreground">{m}</span>
                </td>
                {shown.map((r) => (
                  <td key={r} className="px-2 py-2 text-center">
                    {can(r, m) ? (
                      <Check className="mx-auto h-4 w-4 text-primary" aria-label="অনুমোদিত" />
                    ) : (
                      <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" aria-label="নিষিদ্ধ" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {mods.length === 0 && (
              <tr>
                <td colSpan={shown.length + 1} className="p-4 text-center text-muted-foreground">
                  কোনো মডিউল মেলেনি
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ul className="space-y-1 rounded-xl border border-border bg-card p-3 text-[11px] text-muted-foreground">
        {ROLES.map((r) => (
          <li key={r}>
            <span className="font-semibold text-foreground">{ROLE_LABEL[r].bn}</span> — {ROLE_LABEL[r].desc}
          </li>
        ))}
        <li>গ্রাহক (customer) ড্যাশবোর্ডের কোনো মডিউল দেখতে পান না; তাঁরা শুধু নিজের অর্ডার, প্রোফাইল ও লয়ালটি দেখেন। ডাটাবেস স্তরে RLS ও রোল-চেক ফাংশন এই নিয়ম আলাদাভাবে বলবৎ করে।</li>
      </ul>
    </div>
  );
}
