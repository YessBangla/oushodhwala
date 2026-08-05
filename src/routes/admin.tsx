import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminDashboard } from "@/components/AdminDashboard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { bn } from "@/data/catalog";
import { catalogQueryKey } from "@/lib/catalog-db";
import { MediaGallery, MediaPickerModal } from "@/components/MediaGallery";
import { ImageAudit } from "@/components/ImageAudit";
import { ImageRevisions } from "@/components/ImageRevisions";
import { AdminShell, type AdminNavGroup } from "@/components/AdminShell";
import { Consultations } from "@/components/Consultations";
import { DeliveryAdmin, RidersAdmin } from "@/components/DeliveryAdmin";
import { ProductImagesAdmin } from "@/components/ProductImagesAdmin";
import { AdminHealth } from "@/components/AdminHealth";
import { DiagnosticsAdmin } from "@/components/DiagnosticsAdmin";
import { CustomersAdmin } from "@/components/CustomersAdmin";
import { ServiceRequestsAdmin } from "@/components/ServiceRequestsAdmin";
import { AccountsAdmin } from "@/components/AccountsAdmin";
import { SuppliersAdmin, PurchaseOrdersAdmin, BatchesAdmin } from "@/components/ProcurementAdmin";
import { SystemMonitor, ErpAudit, ErpReports, ErpRoles } from "@/components/SystemMonitor";
import { ApiHub } from "@/components/ApiHub";
import { SupportInbox } from "@/components/SupportInbox";
import { ReturnsAdmin, ReviewsAdmin } from "@/components/ModerationAdmin";
import { CampaignsAdmin } from "@/components/CampaignsAdmin";
import { ReportsAdmin } from "@/components/ReportsAdmin";
import { LoyaltyAdmin } from "@/components/LoyaltyAdmin";
import { RxAdmin } from "@/components/RxAdmin";
import { WEEKDAYS } from "@/lib/appointments";
import { opsStart, opsSuccess, opsFailure } from "@/lib/ops";
import { allowedTabs } from "@/lib/roles";
import { StaffRoles } from "@/components/StaffRoles";
import { PermissionMatrix } from "@/components/PermissionMatrix";
import { PosTerminal } from "@/components/PosTerminal";
import { ExpensesAdmin, ChartOfAccounts, JournalAdmin, DayBook, Financials, PartyStatement } from "@/components/FinanceAdmin";
import { StockAdjustments, StockCount, LabelPrint } from "@/components/StockOpsAdmin";
import { BranchesAdmin, StockTransfers, DeliveryZonesAdmin } from "@/components/BranchesAdmin";
import { TestReportView } from "@/components/TestReportView";
import { Workspace } from "@/components/Workspace";




export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "অ্যাডমিন প্যানেল — ঔষধওয়ালা" },
      { name: "description", content: "প্রোডাক্ট, ইনভেন্টরি, ক্যাটাগরি, অফার ও অর্ডার ম্যানেজমেন্ট ড্যাশবোর্ড।" },
      { property: "og:title", content: "অ্যাডমিন প্যানেল — ঔষধওয়ালা" },
      { property: "og:description", content: "স্টক, অর্ডার ও ক্যাম্পেইন নিয়ন্ত্রণ করুন।" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: Admin,
});

const TABS = [
  { id: "dash", t: "ড্যাশবোর্ড" },
  { id: "workspace", t: "ওয়ার্কস্পেস" },
  { id: "pos", t: "POS / কাউন্টার বিক্রয়" },
  { id: "orders", t: "অর্ডার" },
  { id: "inventory", t: "ইনভেন্টরি" },
  { id: "products", t: "প্রোডাক্ট" },
  { id: "categories", t: "ক্যাটাগরি" },
  { id: "offers", t: "অফার" },
  { id: "lab", t: "ল্যাব টেস্ট" },
  { id: "doctors", t: "ডাক্তার" },
  { id: "rx", t: "প্রেসক্রিপশন" },
  { id: "delivery", t: "ডেলিভারি" },
  { id: "riders", t: "ডেলিভারিম্যান" },
  { id: "diagnostics", t: "হোম ডায়াগনস্টিক" },
  { id: "services", t: "হোম সার্ভিস" },
  { id: "consults", t: "কনসালটেশন" },
  { id: "gallery", t: "ছবি গ্যালারি" },
  { id: "imgaudit", t: "ছবি যাচাই" },
  { id: "imgrev", t: "ছবি রিভিশন" },
  { id: "imgupload", t: "ছবি আপলোড" },
  { id: "health", t: "হেলথ ও QA" },
  { id: "customers", t: "গ্রাহক" },
  { id: "accounts", t: "একাউন্টস ও হিসাব" },
  { id: "returns", t: "রিটার্ন ও রিফান্ড" },
  { id: "reports", t: "রিপোর্ট ও বিশ্লেষণ" },
  { id: "reviews", t: "রিভিউ মডারেশন" },
  { id: "campaigns", t: "মার্কেটিং ক্যাম্পেইন" },
  { id: "loyalty", t: "লয়ালটি পয়েন্ট" },
  { id: "suppliers", t: "সাপ্লায়ার" },
  { id: "purchases", t: "ক্রয় আদেশ" },
  { id: "batches", t: "ব্যাচ ও মেয়াদ" },
  { id: "support", t: "সাপোর্ট চ্যাট" },
  { id: "apihub", t: "API HUB" },
  { id: "monitor", t: "সিস্টেম মনিটর" },
  { id: "audit", t: "ERP অডিট ট্রেইল" },
  { id: "erpreports", t: "ERP রিপোর্ট" },
  { id: "erproles", t: "ERP অ্যাক্সেস" },
  { id: "staff", t: "স্টাফ ও ভূমিকা" },
  { id: "permissions", t: "পারমিশন ম্যাট্রিক্স" },

  { id: "expenses", t: "খরচ" },
  { id: "coa", t: "চার্ট অব অ্যাকাউন্টস" },
  { id: "journal", t: "জার্নাল" },
  { id: "daybook", t: "ডে-বুক" },
  { id: "financials", t: "ফিন্যান্সিয়ালস" },
  { id: "party", t: "পার্টি স্টেটমেন্ট" },
  { id: "stockadj", t: "স্টক অ্যাডজাস্টমেন্ট" },
  { id: "stockcount", t: "স্টক কাউন্ট" },
  { id: "labels", t: "বারকোড ও লেবেল" },
  { id: "branches", t: "শাখা (মাল্টি ব্রাঞ্চ)" },
  { id: "transfers", t: "স্টক ট্রান্সফার" },
  { id: "zones", t: "ডেলিভারি জোন" },
  { id: "tests", t: "Playwright টেস্ট রিপোর্ট" },
  { id: "settings", t: "সেটিংস" },
] as const;

const pickTabs = (ids: string[]) =>
  ids.map((id) => {
    const t = TABS.find((x) => x.id === id)!;
    return { id: t.id, t: t.t, icon: t.id };
  });

const NAV_GROUPS: AdminNavGroup[] = [
  { label: "ওভারভিউ", items: pickTabs(["dash", "workspace"]) },
  { label: "বিক্রয়", items: pickTabs(["pos", "orders", "inventory", "accounts", "reports", "returns"]) },
  { label: "হিসাব ও অ্যাকাউন্টিং", items: pickTabs(["expenses", "daybook", "journal", "coa", "financials", "party"]) },
  { label: "সাপ্লাই চেইন", items: pickTabs(["suppliers", "purchases", "batches", "erpreports"]) },
  { label: "স্টক অপারেশন", items: pickTabs(["stockadj", "stockcount", "labels", "branches", "transfers"]) },
  { label: "ডেলিভারি", items: pickTabs(["delivery", "riders", "zones"]) },
  { label: "ক্যাটালগ", items: pickTabs(["products", "categories", "offers", "campaigns", "loyalty"]) },
  { label: "সেবা", items: pickTabs(["support", "lab", "diagnostics", "services", "doctors", "consults", "rx"]) },
  { label: "মিডিয়া", items: pickTabs(["gallery", "imgupload", "imgaudit", "imgrev"]) },
  { label: "মনিটরিং", items: pickTabs(["apihub", "monitor", "audit", "erproles", "staff", "permissions", "tests"]) },
  { label: "সিস্টেম", items: pickTabs(["customers", "reviews", "health", "settings"]) },
];



type TabId = (typeof TABS)[number]["id"];

const STATUS: Record<string, string> = {
  confirmed: "নিশ্চিত হয়েছে",
  processing: "প্রস্তুত হচ্ছে",
  shipped: "পথে আছে",
  delivered: "ডেলিভারি হয়েছে",
  cancelled: "বাতিল",
};

function Admin() {
  const { user, isAdmin, isStaff, roles, loading, refresh } = useAuth();
  const allowed = useMemo(() => allowedTabs(roles), [roles]);
  const visibleGroups = useMemo<AdminNavGroup[]>(() => {
    if (allowed === "all") return NAV_GROUPS;
    return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => allowed.has(i.id)) })).filter(
      (g) => g.items.length > 0,
    );
  }, [allowed]);
  const firstTab = (visibleGroups[0]?.items[0]?.id ?? "dash") as TabId;
  const [tabState, setTab] = useState<TabId | null>(null);
  const tab: TabId = tabState && (allowed === "all" || allowed.has(tabState)) ? tabState : firstTab;



  const { data: adminExists, refetch: refetchExists } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: async () => {
      const { data } = await supabase.rpc("admin_exists");
      return data === true;
    },
    enabled: !!user && !isAdmin,
  });

  if (loading) return <p className="pt-16 text-center text-sm text-muted-foreground">লোড হচ্ছে...</p>;

  if (!user) {
    return (
      <div className="pt-16 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-3 text-base font-bold">অ্যাডমিন প্যানেল</h1>
        <p className="mt-1 text-xs text-muted-foreground">চালিয়ে যেতে লগইন করুন।</p>
        <Link to="/auth" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          লগইন করুন
        </Link>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="pt-16 text-center">
        <p className="text-4xl">⛔</p>
        <h1 className="mt-3 text-base font-bold">অ্যাডমিন অনুমতি নেই</h1>
        {adminExists === false && (
          <>
            <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
              এখনো কোনো অ্যাডমিন নেই। আপনি প্রথম অ্যাডমিন হিসেবে দায়িত্ব নিতে পারেন।
            </p>
            <button
              onClick={async () => {
                const { data, error } = await supabase.rpc("claim_first_admin");
                if (error) {
                  toast.error(error.message);
                  return;
                }
                if (data === true) {
                  toast.success("আপনি এখন অ্যাডমিন");
                  await refresh();
                } else {
                  toast.error("ইতিমধ্যে একজন অ্যাডমিন আছেন");
                  void refetchExists();
                }
              }}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              প্রথম অ্যাডমিন হোন
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <AdminShell
      groups={visibleGroups}
      active={tab}
      onSelect={(id) => setTab(id as TabId)}
      title={TABS.find((t) => t.id === tab)?.t ?? "ড্যাশবোর্ড"}
      email={user.email}
      onSignOut={async () => {
        await supabase.auth.signOut();
        await refresh();
      }}
    >
      {tab === "dash" && <Dashboard />}
      {tab === "workspace" && <Workspace groups={visibleGroups} onOpen={(id) => setTab(id as TabId)} />}
      {tab === "pos" && <PosTerminal />}
      {tab === "expenses" && <ExpensesAdmin />}
      {tab === "coa" && <ChartOfAccounts />}
      {tab === "journal" && <JournalAdmin />}
      {tab === "daybook" && <DayBook />}
      {tab === "financials" && <Financials />}
      {tab === "party" && <PartyStatement />}
      {tab === "stockadj" && <StockAdjustments />}
      {tab === "stockcount" && <StockCount />}
      {tab === "labels" && <LabelPrint />}
      {tab === "branches" && <BranchesAdmin />}
      {tab === "transfers" && <StockTransfers />}
      {tab === "zones" && <DeliveryZonesAdmin />}
      {tab === "orders" && <Orders />}
      {tab === "inventory" && <Inventory />}
      {tab === "products" && <Products />}
      {tab === "categories" && <Categories />}
      {tab === "offers" && <Offers />}
      {tab === "lab" && <LabTests />}
      {tab === "doctors" && <Doctors />}
      {tab === "rx" && <RxAdmin />}
      {tab === "consults" && <Consultations />}
      {tab === "delivery" && <DeliveryAdmin />}
      {tab === "riders" && <RidersAdmin />}
      {tab === "diagnostics" && <DiagnosticsAdmin />}
      {tab === "services" && <ServiceRequestsAdmin />}
      {tab === "gallery" && <MediaGallery />}
      {tab === "imgaudit" && <ImageAudit />}
      {tab === "imgrev" && <ImageRevisions />}
      {tab === "imgupload" && <ProductImagesAdmin />}
      {tab === "health" && <AdminHealth onNavigate={(id) => setTab(id as TabId)} />}
      {tab === "customers" && <CustomersAdmin />}
      {tab === "accounts" && <AccountsAdmin />}
      {tab === "reports" && <ReportsAdmin />}
      {tab === "returns" && <ReturnsAdmin />}
      {tab === "reviews" && <ReviewsAdmin />}
      {tab === "campaigns" && <CampaignsAdmin />}
      {tab === "loyalty" && <LoyaltyAdmin />}
      {tab === "suppliers" && <SuppliersAdmin />}
      {tab === "purchases" && <PurchaseOrdersAdmin />}
      {tab === "batches" && <BatchesAdmin />}
      {tab === "support" && <SupportInbox />}
      {tab === "apihub" && <ApiHub />}
      {tab === "monitor" && <SystemMonitor />}
      {tab === "audit" && <ErpAudit />}
      {tab === "erpreports" && <ErpReports />}
      {tab === "erproles" && <ErpRoles />}
      {tab === "staff" && <StaffRoles />}
      {tab === "permissions" && <PermissionMatrix />}
      {tab === "tests" && <TestReportView />}
      {tab === "settings" && <Settings />}
    </AdminShell>
  );
}

/* ---------------- data hooks ---------------- */

function useProducts() {
  return useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

function useOrders() {
  return useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

/* ---------------- dashboard ---------------- */

function Dashboard() {
  const products = useProducts();
  const orders = useOrders();
  return (
    <AdminDashboard
      orders={(orders.data ?? []) as never[]}
      products={(products.data ?? []) as never[]}
      loading={orders.isLoading || products.isLoading}
    />
  );
}

/* ---------------- orders ---------------- */

function Orders() {
  const qc = useQueryClient();
  const { data, isLoading } = useOrders();
  const [filter, setFilter] = useState("all");

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      opsStart("order_status_change", { orderId: id, status });
      const { error } = await supabase.rpc("admin_set_order_status", { _order_id: id, _status: status });
      if (error) {
        opsFailure("order_status_change", error, { orderId: id, status });
        throw error;
      }
      opsSuccess("order_status_change", id, { status });
    },
    onSuccess: () => {
      toast.success("অর্ডার আপডেট হয়েছে — গ্রাহককে নোটিফিকেশন পাঠানো হয়েছে");
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
      void qc.invalidateQueries({ queryKey: catalogQueryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>;
  const list = (data ?? []).filter((o) => filter === "all" || o.status === filter);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {["all", ...Object.keys(STATUS)].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
              filter === s ? "border-primary text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {s === "all" ? "সব" : STATUS[s]}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="text-xs text-muted-foreground">কোনো অর্ডার নেই।</p>}
      <div className="space-y-2">
        {list.map((o) => (
          <article key={o.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold">#{o.order_no}</p>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">{STATUS[o.status] ?? o.status}</span>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px]">
                {o.payment_method.toUpperCase()} · {o.payment_status === "paid" ? "পরিশোধিত" : "বাকি"}
              </span>
              <p className="ml-auto text-sm font-bold text-primary-dark">৳{bn(Math.round(Number(o.total)))}</p>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {o.customer_name} · {o.phone} · {o.address}
            </p>
            <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString("bn-BD")} · {o.slot}</p>
            <ul className="mt-2 space-y-0.5 text-[11px]">
              {o.order_items.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span className="text-muted-foreground">{i.name} × {bn(i.qty)}</span>
                  <span>৳{bn(Math.round(Number(i.price) * i.qty))}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(STATUS).map(([k, label]) => (
                <button
                  key={k}
                  disabled={o.status === k || setStatus.isPending}
                  onClick={() => setStatus.mutate({ id: o.id, status: k })}
                  className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold disabled:opacity-40"
                >
                  {label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------------- inventory ---------------- */

type InvProduct = {
  id: string;
  name: string;
  emoji: string;
  stock: number;
  low_stock_threshold: number;
  brand?: string | null;
  manufacturer?: string | null;
  generic?: string | null;
  strength?: string | null;
  form?: string | null;
};

function Inventory() {
  const qc = useQueryClient();
  const { data, isLoading } = useProducts();
  const [onlyLow, setOnlyLow] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const save = useMutation({
    mutationFn: async ({ id, stock, low }: { id: string; stock: number; low: number }) => {
      const { error } = await supabase.from("products").update({ stock, low_stock_threshold: low }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("স্টক আপডেট হয়েছে");
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
      void qc.invalidateQueries({ queryKey: catalogQueryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>;

  const term = q.trim().toLowerCase();
  const list = ((data ?? []) as InvProduct[]).filter((p) => {
    if (onlyLow && p.stock > p.low_stock_threshold) return false;
    if (!term) return true;
    return [p.name, p.brand, p.manufacturer, p.generic].some((v) => (v ?? "").toLowerCase().includes(term));
  });

  const groups = new Map<string, InvProduct[]>();
  for (const p of list) {
    const company = (p.manufacturer || p.brand || "").trim() || "অন্যান্য কোম্পানি";
    const arr = groups.get(company);
    if (arr) arr.push(p);
    else groups.set(company, [p]);
  }
  const companies = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "bn"));

  return (
    <div>
      <AddProduct />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="কোম্পানি, ঔষধ বা জেনেরিক খুঁজুন"
          className="min-w-[200px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
        />
        <label className="flex items-center gap-2 text-xs font-semibold">
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
          শুধু কম স্টকের পণ্য
        </label>
        <span className="text-[11px] text-muted-foreground">
          {bn(companies.length)} কোম্পানি · {bn(list.length)} ঔষধ
        </span>
      </div>


      {companies.length === 0 && <p className="text-xs text-muted-foreground">কিছু পাওয়া যায়নি।</p>}

      <div className="space-y-2">
        {companies.map(([company, items]) => {
          const lowCount = items.filter((p) => p.stock <= p.low_stock_threshold).length;
          const expanded = open[company] ?? Boolean(term);
          const generics = [...new Set(items.map((p) => (p.generic ?? "").trim()).filter(Boolean))];
          return (
            <section key={company} className="overflow-hidden rounded-xl border border-border bg-card">
              <button
                onClick={() => setOpen((s) => ({ ...s, [company]: !expanded }))}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
              >
                <span className="text-xs">{expanded ? "▾" : "▸"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{company}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {bn(generics.length)} জেনেরিক · {generics.slice(0, 3).join(", ")}
                    {generics.length > 3 ? "…" : ""}
                  </span>
                </span>
                {lowCount > 0 && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-sale">
                    {bn(lowCount)} কম স্টক
                  </span>
                )}
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold">
                  {bn(items.length)} ঔষধ
                </span>
              </button>
              {expanded && (
                <div className="space-y-2 border-t border-border bg-background/40 p-2">
                  {items.map((p) => (
                    <StockRow key={p.id} p={p} onSave={(stock, low) => save.mutate({ id: p.id, stock, low })} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function AddProduct() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: "",
    en: "",
    brand: "",
    manufacturer: "",
    generic: "",
    strength: "",
    form: "ট্যাবলেট",
    pack: "",
    price: "",
    mrp: "",
    category: "medicine",
    emoji: "💊",
    stock: "50",
    low: "10",
    rx: false,
    image_url: "",
  });
  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  const { data: cats } = useQuery({
    queryKey: ["admin-categories-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("slug, bn").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const name = f.name.trim();
      if (!name) throw new Error("পণ্যের নাম দিন");
      const price = Number(f.price) || 0;
      if (price <= 0) throw new Error("সঠিক দাম দিন");
      const id =
        (f.en.trim() || name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 40) || "prod";
      const { error } = await supabase.from("products").insert({
        id: `${id}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        en: f.en.trim(),
        brand: f.brand.trim(),
        manufacturer: f.manufacturer.trim(),
        generic: f.generic.trim(),
        strength: f.strength.trim(),
        base_name: name.replace(/\s+\S*\d+\S*$/, "").trim(),
        form: f.form.trim(),
        pack: f.pack.trim(),
        price,
        mrp: Number(f.mrp) || price,
        category: f.category,
        emoji: f.emoji || "💊",
        rx: f.rx,
        stock: Number(f.stock) || 0,
        low_stock_threshold: Number(f.low) || 0,
        image_url: f.image_url.trim(),
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("নতুন পণ্য যুক্ত হয়েছে");
      setF((s) => ({ ...s, name: "", en: "", generic: "", strength: "", pack: "", price: "", mrp: "", image_url: "" }));
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
      void qc.invalidateQueries({ queryKey: catalogQueryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const field = (k: keyof typeof f, label: string, extra?: { numeric?: boolean }) => (
    <label className="text-[10px] font-semibold text-muted-foreground">
      {label}
      <input
        value={String(f[k])}
        onChange={(e) => set(k, e.target.value)}
        inputMode={extra?.numeric ? "numeric" : undefined}
        className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none"
      />
    </label>
  );

  return (
    <section className="mb-3 overflow-hidden rounded-xl border border-border bg-card">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
        <span className="text-xs">{open ? "▾" : "▸"}</span>
        <span className="flex-1 text-sm font-bold">➕ নতুন পণ্য যোগ করুন</span>
        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">নতুন</span>
      </button>
      {open && (
        <div className="border-t border-border p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {field("name", "নাম (বাংলা) *")}
            {field("en", "নাম (English)")}
            {field("generic", "জেনেরিক")}
            {field("strength", "মাত্রা (যেমন 500mg)")}
            {field("brand", "ব্র্যান্ড")}
            {field("manufacturer", "কোম্পানি")}
            {field("form", "ধরন (ট্যাবলেট/সিরাপ)")}
            {field("pack", "প্যাক (যেমন ১০ ট্যাবলেট)")}
            {field("price", "বিক্রয় মূল্য ৳ *", { numeric: true })}
            {field("mrp", "MRP ৳", { numeric: true })}
            {field("stock", "স্টক", { numeric: true })}
            {field("low", "কম স্টক সীমা", { numeric: true })}
            <label className="text-[10px] font-semibold text-muted-foreground">
              ক্যাটাগরি
              <select
                value={f.category}
                onChange={(e) => set("category", e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none"
              >
                {(cats ?? []).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.bn}
                  </option>
                ))}
              </select>
            </label>
            {field("emoji", "ইমোজি")}
            {field("image_url", "ছবির লিংক")}
            <label className="flex items-end gap-2 pb-1 text-[11px] font-semibold">
              <input type="checkbox" checked={f.rx} onChange={(e) => set("rx", e.target.checked)} />
              প্রেসক্রিপশন লাগবে
            </label>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              disabled={create.isPending}
              onClick={() => create.mutate()}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {create.isPending ? "সেভ হচ্ছে..." : "পণ্য সেভ করুন"}
            </button>
            <span className="text-[10px] text-muted-foreground">সেভ করার পর ইনভেন্টরি ও স্টোরে সাথে সাথে দেখা যাবে।</span>
          </div>
        </div>
      )}
    </section>
  );
}


function StockRow({ p, onSave }: { p: InvProduct; onSave: (stock: number, low: number) => void }) {
  const [stock, setStock] = useState(String(p.stock));
  const [low, setLow] = useState(String(p.low_stock_threshold));
  const critical = p.stock <= p.low_stock_threshold;
  const meta = [p.generic, p.strength, p.form].map((v) => (v ?? "").trim()).filter(Boolean).join(" · ");

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 ${critical ? "border-sale" : "border-border"}`}>
      <span className="text-lg">{p.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{p.name}</p>
        {meta && <p className="truncate text-[10px] text-muted-foreground">{meta}</p>}
      </div>
      {p.stock <= 0 && <span className="rounded-full bg-sale px-2 py-0.5 text-[10px] font-bold text-sale-foreground">স্টক শেষ</span>}
      {p.stock > 0 && critical && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-sale">কম স্টক</span>}
      <label className="text-[10px] text-muted-foreground">
        স্টক
        <input
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          inputMode="numeric"
          className="ml-1 w-16 rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground outline-none"
        />
      </label>
      <label className="text-[10px] text-muted-foreground">
        সীমা
        <input
          value={low}
          onChange={(e) => setLow(e.target.value)}
          inputMode="numeric"
          className="ml-1 w-14 rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground outline-none"
        />
      </label>
      <button
        onClick={() => onSave(Number(stock) || 0, Number(low) || 0)}
        className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground"
      >
        সেভ
      </button>
    </div>
  );
}


/* ---------------- products ---------------- */

const emptyProduct = {
  id: "",
  name: "",
  en: "",
  brand: "",
  generic: "",
  form: "ট্যাবলেট",
  pack: "",
  price: 0,
  mrp: 0,
  category: "medicine",
  rx: false,
  emoji: "💊",
  description: "",
  description_en: "",
  image_url: "",
  medicine_image_url: "",
  manufacturer: "",
  indications: "",
  indications_en: "",
  dosage: "",
  dosage_en: "",
  side_effects: "",
  side_effects_en: "",
  strength: "",
  base_name: "",
  contraindications: "",
  contraindications_en: "",
  pregnancy: "",
  pregnancy_en: "",
  precautions: "",
  precautions_en: "",
  therapeutic_class: "",
  therapeutic_class_en: "",
  storage: "",
  storage_en: "",
  stock: 0,
  low_stock_threshold: 10,
  active: true,
};

function Products() {
  const qc = useQueryClient();
  const { data, isLoading } = useProducts();
  const [edit, setEdit] = useState<typeof emptyProduct | null>(null);
  const [q, setQ] = useState("");
  const [picker, setPicker] = useState<"image_url" | "medicine_image_url" | null>(null);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-products"] });
    void qc.invalidateQueries({ queryKey: catalogQueryKey });
  };

  const upsert = useMutation({
    mutationFn: async (p: typeof emptyProduct) => {
      const { error } = await supabase.from("products").upsert(p);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("প্রোডাক্ট সংরক্ষিত হয়েছে");
      setEdit(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").update({ active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("প্রোডাক্ট নিষ্ক্রিয় করা হয়েছে");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>;
  const list = (data ?? []).filter((p) => (p.name + p.en + p.brand).toLowerCase().includes(q.toLowerCase()));

  if (edit) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-bold">{edit.id ? "প্রোডাক্ট সম্পাদনা" : "নতুন প্রোডাক্ট"}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(
            [
              ["id", "আইডি (ইউনিক)"],
              ["name", "বাংলা নাম"],
              ["en", "ইংরেজি নাম"],
              ["brand", "ব্র্যান্ড"],
              ["generic", "জেনেরিক"],
              ["form", "ফর্ম"],
              ["pack", "প্যাক"],
              ["emoji", "ইমোজি"],
              ["category", "ক্যাটাগরি স্লাগ"],
              ["image_url", "বক্সের ছবির লিংক (URL)"],
              ["medicine_image_url", "ঔষধের ছবির লিংক (URL)"],
              ["manufacturer", "প্রস্তুতকারক"],
              ["strength", "মাত্রা (যেমন ৫০০ mg)"],
              ["base_name", "মূল নাম (একই ঔষধের বিভিন্ন মাত্রা গ্রুপ)"],
              ["therapeutic_class", "থেরাপিউটিক ক্লাস (বাংলা)"],
              ["therapeutic_class_en", "Therapeutic class (English)"],
            ] as const
          ).map(([k, label]) => (
            <input
              key={k}
              value={String(edit[k])}
              disabled={k === "id" && !!data?.some((p) => p.id === edit.id) && edit.id !== ""}
              onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}
              placeholder={label}
              className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
            />
          ))}
          {(
            [
              ["price", "দাম"],
              ["mrp", "MRP"],
              ["stock", "স্টক"],
              ["low_stock_threshold", "কম স্টক সীমা"],
            ] as const
          ).map(([k, label]) => (
            <input
              key={k}
              value={String(edit[k])}
              inputMode="numeric"
              onChange={(e) => setEdit({ ...edit, [k]: Number(e.target.value) || 0 })}
              placeholder={label}
              className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="text-center">
            {edit.image_url ? (
              <img src={edit.image_url} alt="বক্সের ছবি" className="h-20 w-20 rounded-lg border border-border object-contain" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">বক্স</div>
            )}
            <button type="button" onClick={() => setPicker("image_url")} className="mt-1 rounded border border-border px-2 py-0.5 text-[10px] font-semibold">
              গ্যালারি থেকে
            </button>
          </div>
          <div className="text-center">
            {edit.medicine_image_url ? (
              <img src={edit.medicine_image_url} alt="ঔষধের ছবি" className="h-20 w-20 rounded-lg border border-border object-contain" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">ঔষধ</div>
            )}
            <button type="button" onClick={() => setPicker("medicine_image_url")} className="mt-1 rounded border border-border px-2 py-0.5 text-[10px] font-semibold">
              গ্যালারি থেকে
            </button>
          </div>
        </div>
        {picker && (
          <MediaPickerModal
            kind={picker === "image_url" ? "box" : "medicine"}
            onClose={() => setPicker(null)}
            onPick={(a) => setEdit({ ...edit, [picker]: a.url })}
          />
        )}
        {(
          [
            ["description", "বিবরণ (বাংলা)"],
            ["description_en", "Description (English)"],
            ["indications", "নির্দেশনা (বাংলা)"],
            ["indications_en", "Indications (English)"],
            ["dosage", "মাত্রা ও সেবনবিধি (বাংলা)"],
            ["dosage_en", "Dosage (English)"],
            ["side_effects", "পার্শ্বপ্রতিক্রিয়া (বাংলা)"],
              ["side_effects_en", "Side effects (English)"],
              ["contraindications", "প্রতিনির্দেশনা (বাংলা)"],
              ["contraindications_en", "Contraindications (English)"],
              ["pregnancy", "গর্ভাবস্থায় ও স্তন্যদানকালে (বাংলা)"],
              ["pregnancy_en", "Pregnancy & Lactation (English)"],
              ["precautions", "সতর্কতা (বাংলা)"],
              ["precautions_en", "Precautions & Warnings (English)"],
              ["storage", "সংরক্ষণ (বাংলা)"],
              ["storage_en", "Storage conditions (English)"],
          ] as const
        ).map(([k, label]) => (
          <textarea
            key={k}
            value={String(edit[k])}
            onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}
            rows={2}
            placeholder={label}
            className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-xs outline-none"
          />
        ))}
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={edit.rx} onChange={(e) => setEdit({ ...edit, rx: e.target.checked })} /> প্রেসক্রিপশন লাগবে
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> সক্রিয়
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            disabled={!edit.id || !edit.name || upsert.isPending}
            onClick={() => upsert.mutate(edit)}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            সংরক্ষণ
          </button>
          <button onClick={() => setEdit(null)} className="rounded-lg border border-border px-4 py-2 text-xs font-semibold">
            বাতিল
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="প্রোডাক্ট খুঁজুন"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
        />
        <button
          onClick={() => setEdit({ ...emptyProduct })}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
        >
          + নতুন
        </button>
      </div>
      <div className="space-y-2">
        {list.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
            {p.image_url ? (
              <img src={p.image_url} alt="" className="h-9 w-9 rounded object-contain" />
            ) : (
              <span className="text-lg">{p.emoji}</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{p.name} {!p.active && <span className="text-muted-foreground">(নিষ্ক্রিয়)</span>}</p>
              <p className="text-[10px] text-muted-foreground">
                ৳{bn(Number(p.price))} · স্টক {bn(p.stock)} · {p.category}
              </p>
            </div>
            <button
              onClick={() =>
                setEdit({
                  id: p.id,
                  name: p.name,
                  en: p.en,
                  brand: p.brand,
                  generic: p.generic,
                  form: p.form,
                  pack: p.pack,
                  price: Number(p.price),
                  mrp: Number(p.mrp),
                  category: p.category,
                  rx: p.rx,
                  emoji: p.emoji,
                  description: p.description,
                  description_en: p.description_en,
                  image_url: p.image_url,
                  medicine_image_url: (p as { medicine_image_url?: string }).medicine_image_url ?? "",
                  manufacturer: p.manufacturer,
                  indications: p.indications,
                  indications_en: p.indications_en,
                  dosage: p.dosage,
                  dosage_en: p.dosage_en,
                  side_effects: p.side_effects,
                  side_effects_en: p.side_effects_en,
                  strength: (p as { strength?: string }).strength ?? "",
                  base_name: (p as { base_name?: string }).base_name ?? "",
                  contraindications: (p as { contraindications?: string }).contraindications ?? "",
                  contraindications_en: (p as { contraindications_en?: string }).contraindications_en ?? "",
                  pregnancy: (p as { pregnancy?: string }).pregnancy ?? "",
                  pregnancy_en: (p as { pregnancy_en?: string }).pregnancy_en ?? "",
                  precautions: (p as { precautions?: string }).precautions ?? "",
                  precautions_en: (p as { precautions_en?: string }).precautions_en ?? "",
                  therapeutic_class: (p as { therapeutic_class?: string }).therapeutic_class ?? "",
                  therapeutic_class_en: (p as { therapeutic_class_en?: string }).therapeutic_class_en ?? "",
                  storage: (p as { storage?: string }).storage ?? "",
                  storage_en: (p as { storage_en?: string }).storage_en ?? "",
                  stock: p.stock,
                  low_stock_threshold: p.low_stock_threshold,
                  active: p.active,
                })
              }
              className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
            >
              সম্পাদনা
            </button>
            {p.active && (
              <button onClick={() => del.mutate(p.id)} className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold text-sale">
                নিষ্ক্রিয়
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- categories ---------------- */

type CatForm = {
  slug: string;
  bn: string;
  en: string;
  emoji: string;
  description: string;
  description_en: string;
  kind: string;
  home_delivery: boolean;
  home_service: boolean;
  service_route: string;
  eta: string;
  eta_en: string;
  base_fee: number;
};

function CategoryPreview({ form }: { form: CatForm }) {
  const isService = form.kind === "service";
  const card = (lng: "bn" | "en") => {
    const name = lng === "bn" ? form.bn || "ক্যাটাগরির নাম" : form.en || form.bn || "Category name";
    const desc = lng === "bn" ? form.description : form.description_en;
    const eta = lng === "bn" ? form.eta : form.eta_en;
    return (
      <div className="flex gap-3 rounded-xl border border-border bg-card p-3">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg text-xl ${
            isService ? "bg-primary/10" : "bg-secondary"
          }`}
        >
          {form.emoji || "🧴"}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-bold">{name}</span>
          <span className="mt-0.5 block line-clamp-2 text-[10px] text-muted-foreground">
            {desc || (lng === "bn" ? "বর্ণনা যোগ করুন" : "Add a description")}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1">
            {form.home_delivery && (
              <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-primary-dark">
                {lng === "bn" ? "হোম ডেলিভারি" : "Home delivery"}
              </span>
            )}
            {form.home_service && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                {lng === "bn" ? "হোম সার্ভিস" : "Home service"}
              </span>
            )}
            {eta && <span className="text-[9px] text-muted-foreground">{eta}</span>}
            {form.base_fee > 0 && (
              <span className="text-[9px] font-semibold text-primary-dark">
                {lng === "bn" ? `শুরু ৳${form.base_fee}` : `from ৳${form.base_fee}`}
              </span>
            )}
          </span>
        </span>
      </div>
    );
  };

  return (
    <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/40 p-3">
      <p className="text-[11px] font-bold text-muted-foreground">
        লাইভ প্রিভিউ — {isService ? "হোম সার্ভিস কার্ড" : "পণ্য ক্যাটাগরি কার্ড"}
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] font-bold text-muted-foreground">বাংলা</p>
          {card("bn")}
        </div>
        <div>
          <p className="mb-1 text-[10px] font-bold text-muted-foreground">English</p>
          {card("en")}
        </div>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        লিংক: {isService ? form.service_route || "/home-services" : `/category/${form.slug || "slug"}`}
      </p>
    </div>
  );
}



function Categories() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState({
    slug: "",
    bn: "",
    en: "",
    emoji: "🧴",
    description: "",
    description_en: "",
    kind: "product",
    home_delivery: true,
    home_service: false,
    service_route: "",
    eta: "",
    eta_en: "",
    base_fee: 0,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-categories"] });
    void qc.invalidateQueries({ queryKey: catalogQueryKey });
  };

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("categories").upsert({ ...form, active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ক্যাটাগরি সংরক্ষিত");
      setForm({ ...form, slug: "", bn: "", en: "", description: "", description_en: "" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ slug, active }: { slug: string; active: boolean }) => {
      const { error } = await supabase.from("categories").update({ active }).eq("slug", slug);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>;

  return (
    <div>
      <div className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-4">
        {(["slug", "bn", "en", "emoji", "description", "description_en", "service_route", "eta", "eta_en"] as const).map((k) => (
          <input
            key={k}
            value={form[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            placeholder={
              {
                slug: "slug",
                bn: "বাংলা নাম",
                en: "English",
                emoji: "ইমোজি",
                description: "বাংলা বর্ণনা",
                description_en: "English description",
                service_route: "সার্ভিস লিংক (/home-services)",
                eta: "সময় (বাংলা)",
                eta_en: "ETA (English)",
              }[k]
            }
            className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
          />
        ))}
        <select
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}
          className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
        >
          <option value="product">পণ্য ক্যাটাগরি</option>
          <option value="service">হোম সার্ভিস</option>
        </select>
        <input
          type="number"
          value={form.base_fee}
          onChange={(e) => setForm({ ...form, base_fee: Number(e.target.value) })}
          placeholder="শুরুর ফি"
          className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
        />
        <label className="flex items-center gap-1.5 text-[11px]">
          <input type="checkbox" checked={form.home_delivery} onChange={(e) => setForm({ ...form, home_delivery: e.target.checked })} />
          হোম ডেলিভারি
        </label>
        <label className="flex items-center gap-1.5 text-[11px]">
          <input type="checkbox" checked={form.home_service} onChange={(e) => setForm({ ...form, home_service: e.target.checked })} />
          হোম সার্ভিস
        </label>
        <button
          disabled={!form.slug || !form.bn}
          onClick={() => add.mutate()}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-4"
        >
          ক্যাটাগরি যোগ / আপডেট
        </button>
      </div>

      <CategoryPreview form={form} />

      <div className="mt-3 space-y-2">
        {(data ?? []).map((c) => (
          <div key={c.slug} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
            <span className="text-lg">{c.emoji}</span>
            <p className="flex-1 text-xs font-semibold">
              {c.bn} <span className="text-muted-foreground">· {c.slug}</span>
            </p>
            <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary-dark">
              {(c as { kind?: string }).kind === "service" ? "হোম সার্ভিস" : "পণ্য"}
            </span>
            {(c as { home_delivery?: boolean }).home_delivery && (
              <span className="rounded bg-muted px-2 py-0.5 text-[10px]">হোম ডেলিভারি</span>
            )}
            <button
              onClick={() =>
                setForm({
                  slug: c.slug,
                  bn: c.bn,
                  en: c.en,
                  emoji: c.emoji,
                  description: (c as { description?: string }).description ?? "",
                  description_en: (c as { description_en?: string }).description_en ?? "",
                  kind: (c as { kind?: string }).kind ?? "product",
                  home_delivery: (c as { home_delivery?: boolean }).home_delivery ?? true,
                  home_service: (c as { home_service?: boolean }).home_service ?? false,
                  service_route: (c as { service_route?: string }).service_route ?? "",
                  eta: (c as { eta?: string }).eta ?? "",
                  eta_en: (c as { eta_en?: string }).eta_en ?? "",
                  base_fee: Number((c as { base_fee?: number }).base_fee ?? 0),
                })
              }
              className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
            >
              এডিট
            </button>
            <button
              onClick={() => toggle.mutate({ slug: c.slug, active: !c.active })}
              className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
            >
              {c.active ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- offers ---------------- */

function Offers() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-offers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("offers").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState({
    code: "",
    title: "",
    subtitle: "",
    emoji: "🎟️",
    discount_pct: 10,
    min_order: 0,
    max_discount: 200,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-offers"] });
    void qc.invalidateQueries({ queryKey: catalogQueryKey });
  };

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("offers").upsert({ ...form, active: true }, { onConflict: "code" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("অফার সংরক্ষিত");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("offers").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>;

  return (
    <div>
      <div className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-3">
        {(["code", "title", "subtitle", "emoji"] as const).map((k) => (
          <input
            key={k}
            value={form[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            placeholder={{ code: "কুপন কোড", title: "শিরোনাম", subtitle: "বিবরণ", emoji: "ইমোজি" }[k]}
            className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
          />
        ))}
        {(["discount_pct", "min_order", "max_discount"] as const).map((k) => (
          <input
            key={k}
            value={String(form[k])}
            inputMode="numeric"
            onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) || 0 })}
            placeholder={{ discount_pct: "ছাড় %", min_order: "সর্বনিম্ন অর্ডার", max_discount: "সর্বোচ্চ ছাড়" }[k]}
            className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
          />
        ))}
        <button
          disabled={!form.code || !form.title}
          onClick={() => add.mutate()}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-3"
        >
          অফার যোগ / আপডেট
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {(data ?? []).map((o) => (
          <div key={o.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
            <span className="text-lg">{o.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{o.code} — {o.title}</p>
              <p className="text-[10px] text-muted-foreground">
                {bn(Number(o.discount_pct))}% · সর্বনিম্ন ৳{bn(Number(o.min_order))} · সর্বোচ্চ ৳{bn(Number(o.max_discount))}
              </p>
            </div>
            <button
              onClick={() => toggle.mutate({ id: o.id, active: !o.active })}
              className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
            >
              {o.active ? "বন্ধ" : "চালু"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- lab tests ---------------- */

const emptyLab = { id: "", bn: "", en: "", price: 0, mrp: 0, grp: "vital", prep: "", active: true, sort_order: 0 };

function LabTests() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-lab"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_tests").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState({ ...emptyLab });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-lab"] });
    void qc.invalidateQueries({ queryKey: catalogQueryKey });
  };

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lab_tests").upsert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ল্যাব টেস্ট সংরক্ষিত");
      setForm({ ...emptyLab });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("lab_tests").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>;

  return (
    <div>
      <div className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-3">
        {(["id", "bn", "en", "prep"] as const).map((k) => (
          <input
            key={k}
            value={form[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            placeholder={{ id: "আইডি (ইউনিক)", bn: "বাংলা নাম", en: "English name", prep: "প্রস্তুতি" }[k]}
            className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
          />
        ))}
        <select
          value={form.grp}
          onChange={(e) => setForm({ ...form, grp: e.target.value })}
          className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
        >
          <option value="vital">ভাইটাল অর্গান</option>
          <option value="life_style">লাইফস্টাইল</option>
          <option value="checkup_women">নারীদের চেকআপ</option>
          <option value="checkup_men">পুরুষদের চেকআপ</option>
        </select>
        {(["price", "mrp", "sort_order"] as const).map((k) => (
          <input
            key={k}
            value={String(form[k])}
            inputMode="numeric"
            onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) || 0 })}
            placeholder={{ price: "দাম", mrp: "MRP", sort_order: "ক্রম" }[k]}
            className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
          />
        ))}
        <button
          disabled={!form.id || !form.bn || save.isPending}
          onClick={() => save.mutate()}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-3"
        >
          টেস্ট যোগ / আপডেট
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {(data ?? []).map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{t.bn} <span className="text-muted-foreground">· {t.en}</span></p>
              <p className="text-[10px] text-muted-foreground">৳{bn(Number(t.price))} · {t.grp} {!t.active && "· নিষ্ক্রিয়"}</p>
            </div>
            <button
              onClick={() =>
                setForm({
                  id: t.id, bn: t.bn, en: t.en, price: Number(t.price), mrp: Number(t.mrp),
                  grp: t.grp, prep: t.prep, active: t.active, sort_order: t.sort_order,
                })
              }
              className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
            >
              সম্পাদনা
            </button>
            <button
              onClick={() => toggle.mutate({ id: t.id, active: !t.active })}
              className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
            >
              {t.active ? "বন্ধ" : "চালু"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- doctors ---------------- */

const emptyDoctor = {
  name: "", spec: "", degree: "", exp: "", fee: 0, emoji: "👨‍⚕️", photo_url: "",
  phone: "", whatsapp: "", video_url: "", sort_order: 0,
  work_start: "10:00", work_end: "22:00", slot_minutes: 30, work_days: [0, 1, 2, 3, 4, 5, 6] as number[],
};

function Doctors() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-doctors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("doctors").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState<typeof emptyDoctor & { id?: string }>({ ...emptyDoctor });
  const [blackoutFor, setBlackoutFor] = useState("");

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-doctors"] });
    void qc.invalidateQueries({ queryKey: catalogQueryKey });
  };

  const save = useMutation({
    mutationFn: async () => {
      const { error } = form.id
        ? await supabase.from("doctors").update(form).eq("id", form.id)
        : await supabase.from("doctors").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ডাক্তার সংরক্ষিত");
      setForm({ ...emptyDoctor });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("doctors").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>;

  return (
    <div>
      <div className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-3">
        {(["name", "spec", "degree", "exp", "emoji", "photo_url", "phone", "whatsapp", "video_url"] as const).map((k) => (
          <input
            key={k}
            value={form[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            placeholder={{ name: "নাম", spec: "বিশেষত্ব", degree: "ডিগ্রি", exp: "অভিজ্ঞতা", emoji: "ইমোজি", photo_url: "ছবির লিংক", phone: "ফোন নম্বর (01…)", whatsapp: "হোয়াটসঅ্যাপ নম্বর", video_url: "ভিডিও কল লিংক" }[k]}
            className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
          />
        ))}
        {(["fee", "sort_order"] as const).map((k) => (
          <input
            key={k}
            value={String(form[k])}
            inputMode="numeric"
            onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) || 0 })}
            placeholder={{ fee: "ফি", sort_order: "ক্রম" }[k]}
            className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
          />
        ))}
        <label className="text-[10px] font-semibold text-muted-foreground">
          কর্ম শুরু
          <input type="time" value={form.work_start} onChange={(e) => setForm({ ...form, work_start: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none" />
        </label>
        <label className="text-[10px] font-semibold text-muted-foreground">
          কর্ম শেষ
          <input type="time" value={form.work_end} onChange={(e) => setForm({ ...form, work_end: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none" />
        </label>
        <label className="text-[10px] font-semibold text-muted-foreground">
          স্লট (মিনিট)
          <input value={String(form.slot_minutes)} inputMode="numeric"
            onChange={(e) => setForm({ ...form, slot_minutes: Number(e.target.value) || 30 })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none" />
        </label>
        <div className="sm:col-span-3">
          <p className="text-[10px] font-semibold text-muted-foreground">কর্মদিবস</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {WEEKDAYS.map((w, i) => {
              const on = form.work_days.includes(i);
              return (
                <button key={w} type="button"
                  onClick={() => setForm({ ...form, work_days: on ? form.work_days.filter((x) => x !== i) : [...form.work_days, i].sort() })}
                  className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                  {w}
                </button>
              );
            })}
          </div>
        </div>
        <button
          disabled={!form.name || save.isPending}
          onClick={() => save.mutate()}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-3"
        >
          {form.id ? "ডাক্তার আপডেট" : "ডাক্তার যোগ"}
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {(data ?? []).map((d) => (
          <div key={d.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2">
            <span className="text-lg">{d.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{d.name}</p>
              <p className="text-[10px] text-muted-foreground">{d.spec} · ৳{bn(Number(d.fee))} {!d.active && "· নিষ্ক্রিয়"}</p>
            </div>
            <button
              onClick={() =>
                setForm({
                  id: d.id, name: d.name, spec: d.spec, degree: d.degree, exp: d.exp,
                  fee: Number(d.fee), emoji: d.emoji, photo_url: d.photo_url,
                  phone: d.phone ?? "", whatsapp: d.whatsapp ?? "", video_url: d.video_url ?? "",
                  sort_order: d.sort_order,
                  work_start: (d.work_start ?? "10:00").slice(0, 5),
                  work_end: (d.work_end ?? "22:00").slice(0, 5),
                  slot_minutes: d.slot_minutes ?? 30,
                  work_days: (d.work_days as number[] | null) ?? [0, 1, 2, 3, 4, 5, 6],
                })
              }
              className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
            >
              সম্পাদনা
            </button>
            <button
              onClick={() => setBlackoutFor(blackoutFor === d.id ? "" : d.id)}
              className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
            >
              ছুটি
            </button>
            <button
              onClick={() => toggle.mutate({ id: d.id, active: !d.active })}
              className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
            >
              {d.active ? "বন্ধ" : "চালু"}
            </button>
            </div>
            {blackoutFor === d.id && <Blackouts doctorId={d.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function Blackouts({ doctorId }: { doctorId: string }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-blackouts", doctorId],
    queryFn: async () => {
      const { data, error } = await supabase.from("doctor_blackouts").select("*").eq("doctor_id", doctorId).order("day");
      if (error) throw error;
      return data;
    },
  });
  const [day, setDay] = useState("");
  const [reason, setReason] = useState("");
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin-blackouts", doctorId] });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("doctor_blackouts").insert({ doctor_id: doctorId, day, reason: reason.trim() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("ছুটি যোগ হয়েছে"); setDay(""); setReason(""); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("doctor_blackouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-3 rounded-lg border border-dashed border-border p-3">
      <p className="text-[10px] font-bold text-muted-foreground">ছুটির দিন (ব্ল্যাকআউট)</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] outline-none" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} placeholder="কারণ"
          className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] outline-none" />
        <button disabled={!day || add.isPending} onClick={() => add.mutate()}
          className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50">যোগ</button>
      </div>
      <ul className="mt-2 space-y-1">
        {data.map((b) => (
          <li key={b.id} className="flex items-center gap-2 text-[11px]">
            <span className="font-semibold">{b.day}</span>
            <span className="text-muted-foreground">{b.reason}</span>
            <button onClick={() => del.mutate(b.id)} className="ml-auto text-destructive">মুছুন</button>
          </li>
        ))}
        {data.length === 0 && <li className="text-[10px] text-muted-foreground">কোনো ছুটি নেই।</li>}
      </ul>
    </div>
  );
}

/* ---------------- prescriptions ---------------- */


/* ---------------- settings ---------------- */

function Settings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").order("key");
      if (error) throw error;
      return data;
    },
  });
  const [draft, setDraft] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase.from("app_settings").update({ value }).eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("সেটিংস সংরক্ষিত");
      void qc.invalidateQueries({ queryKey: ["admin-settings"] });
      void qc.invalidateQueries({ queryKey: catalogQueryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>;

  return (
    <div className="space-y-2">
      {(data ?? []).map((s) => (
        <div key={s.key} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
          <p className="min-w-0 flex-1 text-xs font-semibold">
            {s.label || s.key}
            <span className="block text-[10px] font-normal text-muted-foreground">{s.key}</span>
          </p>
          {s.value === "true" || s.value === "false" ? (
            <button
              onClick={() => save.mutate({ key: s.key, value: s.value === "true" ? "false" : "true" })}
              className={`rounded-lg border px-3 py-1.5 text-[10px] font-semibold ${
                s.value === "true" ? "border-primary text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {s.value === "true" ? "চালু" : "বন্ধ"}
            </button>
          ) : (
            <>
              <input
                value={draft[s.key] ?? s.value}
                onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}
                className="w-44 rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none"
              />
              <button
                onClick={() => save.mutate({ key: s.key, value: draft[s.key] ?? s.value })}
                className="rounded-lg bg-primary px-3 py-1.5 text-[10px] font-semibold text-primary-foreground"
              >
                সেভ
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
