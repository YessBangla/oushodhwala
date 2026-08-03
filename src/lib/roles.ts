import type { AppRole } from "@/hooks/useAuth";

export const ROLE_LABEL: Record<AppRole, { bn: string; en: string; desc: string }> = {
  super_admin: { bn: "সুপার অ্যাডমিন", en: "Super Admin", desc: "সবকিছুতে পূর্ণ অ্যাক্সেস + ভূমিকা বণ্টন" },
  admin: { bn: "অ্যাডমিন", en: "Admin", desc: "পুরো ড্যাশবোর্ড পরিচালনা" },
  erp_manager: { bn: "ইআরপি ম্যানেজার", en: "ERP Manager", desc: "ইনভেন্টরি, ক্রয়, ব্যাচ ও ইআরপি রিপোর্ট" },
  accountant: { bn: "অ্যাকাউন্ট্যান্ট", en: "Accountant", desc: "একাউন্টস, রিপোর্ট, রিটার্ন ও লয়ালটি" },
  support_agent: { bn: "সাপোর্ট এজেন্ট", en: "Support Agent", desc: "সাপোর্ট চ্যাট, অর্ডার ও গ্রাহক সহায়তা" },
  pharmacist: { bn: "ফার্মাসিস্ট", en: "Pharmacist", desc: "প্রেসক্রিপশন, কনসালটেশন ও ঔষধ তথ্য" },
  rider: { bn: "ডেলিভারি রাইডার", en: "Rider", desc: "রাইডার প্যানেল ও ডেলিভারি আপডেট" },
  user: { bn: "সাধারণ ব্যবহারকারী", en: "Customer", desc: "শুধু নিজের অর্ডার ও প্রোফাইল" },
};

/** ভূমিকা অনুযায়ী ড্যাশবোর্ডে কোন ট্যাবগুলো দেখা যাবে ("*" = সব) */
export const ROLE_TABS: Record<AppRole, string[]> = {
  super_admin: ["*"],
  admin: ["*"],
  erp_manager: [
    "dash", "workspace", "orders", "inventory", "products", "suppliers", "purchases",
    "batches", "erpreports", "audit", "monitor", "health",
    "stockadj", "stockcount", "labels", "branches", "transfers", "zones", "pos",
  ],
  accountant: [
    "dash", "workspace", "orders", "accounts", "reports", "returns", "loyalty",
    "expenses", "coa", "journal", "daybook", "financials", "party",
  ],
  support_agent: ["dash", "workspace", "support", "orders", "customers", "rx", "consults", "returns", "reviews"],
  pharmacist: ["dash", "workspace", "pos", "rx", "consults", "products", "inventory", "lab", "diagnostics", "doctors", "labels"],
  rider: [],
  user: [],
};

/** ব্যবহারকারীর ভূমিকাগুলোর ভিত্তিতে অনুমোদিত ট্যাব-সেট */
export function allowedTabs(roles: AppRole[]): "all" | Set<string> {
  if (roles.some((r) => ROLE_TABS[r]?.includes("*"))) return "all";
  const set = new Set<string>();
  roles.forEach((r) => (ROLE_TABS[r] ?? []).forEach((t) => set.add(t)));
  return set;
}
