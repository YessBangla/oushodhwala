import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";
import { downloadCsv, printReport } from "@/lib/erp-report";

type Stats = Record<string, string | number>;

const money = (n: number) => `৳${bn(Math.round(Number(n) || 0))}`;

function Kpi({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-extrabold ${tone}`}>{value}</p>
    </div>
  );
}

/* ───────────────── সিস্টেম মনিটরিং ───────────────── */

export function SystemMonitor() {
  const qc = useQueryClient();
  const [uptime, setUptime] = useState({ ok: 0, total: 0, lastMs: 0, lastAt: "" });
  const started = useRef(Date.now());

  const { data: stats, isLoading } = useQuery({
    queryKey: ["system-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_system_stats");
      if (error) throw error;
      return (data ?? {}) as Stats;
    },
    refetchInterval: 60_000,
  });

  const { data: errors = [] } = useQuery({
    queryKey: ["error-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["stock-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  // লাইভ আপটাইম চেক — প্রতি ৩০ সেকেন্ডে হেলথ এন্ডপয়েন্ট
  useEffect(() => {
    let alive = true;
    const ping = async () => {
      const t0 = performance.now();
      try {
        const res = await fetch("/api/public/health", { cache: "no-store" });
        const ms = Math.round(performance.now() - t0);
        if (!alive) return;
        setUptime((u) => ({
          ok: u.ok + (res.ok ? 1 : 0),
          total: u.total + 1,
          lastMs: ms,
          lastAt: new Date().toLocaleTimeString("bn-BD"),
        }));
      } catch {
        if (alive) setUptime((u) => ({ ...u, total: u.total + 1, lastAt: new Date().toLocaleTimeString("bn-BD") }));
      }
    };
    void ping();
    const t = setInterval(ping, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const runAlerts = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("run_stock_alerts", { _expiry_days: 60 });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      toast.success(n > 0 ? `${bn(n)} টি নতুন সতর্কতা পাঠানো হয়েছে` : "নতুন কোনো সতর্কতা নেই");
      void qc.invalidateQueries({ queryKey: ["stock-alerts"] });
      void qc.invalidateQueries({ queryKey: ["system-stats"] });
      void qc.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = stats ?? {};
  const pct = uptime.total ? Math.round((uptime.ok / uptime.total) * 100) : 100;
  const sessionMin = Math.max(1, Math.round((Date.now() - started.current) / 60000));
  const errors24 = Number(s.errors_24h ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            void qc.invalidateQueries({ queryKey: ["system-stats"] });
            void qc.invalidateQueries({ queryKey: ["error-logs"] });
          }}
          className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold"
        >
          রিফ্রেশ
        </button>
        <button
          onClick={() => runAlerts.mutate()}
          disabled={runAlerts.isPending}
          className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          মেয়াদ ও কম স্টক সতর্কতা চালান
        </button>
        <span className="text-xs text-muted-foreground">
          সার্ভার সময়: {s.server_time ? new Date(String(s.server_time)).toLocaleString("bn-BD") : "—"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi
          label="আপটাইম (এই সেশন)"
          value={`${bn(pct)}% · ${bn(uptime.ok)}/${bn(uptime.total)} চেক`}
          tone={pct === 100 ? "text-primary" : "text-sale"}
        />
        <Kpi label="সার্ভার রেসপন্স" value={uptime.lastMs ? `${bn(uptime.lastMs)} ms` : "—"} />
        <Kpi label="পর্যবেক্ষণকাল" value={`${bn(sessionMin)} মিনিট`} />
        <Kpi label="সর্বশেষ চেক" value={uptime.lastAt || "—"} />
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">ডেটা লোড হচ্ছে...</p>}

      <div>
        <p className="mb-2 text-sm font-bold">ডাটাবেজ ও ব্যবসায়িক স্বাস্থ্য</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi label="মোট পণ্য" value={bn(Number(s.products ?? 0))} />
          <Kpi label="সক্রিয় পণ্য" value={bn(Number(s.products_active ?? 0))} />
          <Kpi label="ছবি নেই" value={bn(Number(s.products_no_image ?? 0))} tone={Number(s.products_no_image) ? "text-accent-foreground" : ""} />
          <Kpi label="কম স্টক" value={bn(Number(s.low_stock ?? 0))} tone={Number(s.low_stock) ? "text-sale" : "text-primary"} />
          <Kpi label="স্টক আউট" value={bn(Number(s.out_of_stock ?? 0))} tone={Number(s.out_of_stock) ? "text-sale" : ""} />
          <Kpi label="মোট অর্ডার" value={bn(Number(s.orders ?? 0))} />
          <Kpi label="আজকের অর্ডার" value={bn(Number(s.orders_today ?? 0))} />
          <Kpi label="চলমান অর্ডার" value={bn(Number(s.orders_pending ?? 0))} />
          <Kpi label="৩০ দিনের আয়" value={money(Number(s.revenue_30d ?? 0))} tone="text-primary" />
          <Kpi label="গ্রাহক" value={bn(Number(s.customers ?? 0))} />
          <Kpi label="সক্রিয় রাইডার" value={bn(Number(s.riders_active ?? 0))} />
          <Kpi label="চলমান ডেলিভারি" value={bn(Number(s.deliveries_open ?? 0))} />
          <Kpi label="সাপ্লায়ার" value={bn(Number(s.suppliers ?? 0))} />
          <Kpi label="খোলা ক্রয় আদেশ" value={bn(Number(s.po_open ?? 0))} />
          <Kpi label="৬০ দিনে মেয়াদোত্তীর্ণ হবে" value={bn(Number(s.expiring_60d ?? 0))} tone={Number(s.expiring_60d) ? "text-sale" : ""} />
          <Kpi label="মেয়াদোত্তীর্ণ ব্যাচ" value={bn(Number(s.expired ?? 0))} tone={Number(s.expired) ? "text-sale" : "text-primary"} />
          <Kpi label="ডাটাবেজ সাইজ" value={String(s.db_size ?? "—")} />
          <Kpi label="২৪ ঘণ্টায় এরর" value={bn(errors24)} tone={errors24 ? "text-sale" : "text-primary"} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold">সাম্প্রতিক সতর্কতা</p>
          <span className="text-xs text-muted-foreground">({bn(alerts.length)} টি)</span>
        </div>
        <ul className="space-y-1 text-xs">
          {alerts.length === 0 && <li className="text-muted-foreground">কোনো সতর্কতা নেই</li>}
          {alerts.slice(0, 15).map((a) => (
            <li key={a.id} className="flex flex-wrap gap-2 border-b border-border pb-1">
              <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${a.kind === "expiry" ? "bg-sale/10 text-sale" : "bg-accent/20 text-navy"}`}>
                {a.kind === "expiry" ? "মেয়াদ" : "কম স্টক"}
              </span>
              <span className="flex-1">{a.detail}</span>
              <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString("bn-BD")}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold">এরর লগ</p>
          <button
            onClick={() =>
              downloadCsv(
                `error-logs-${new Date().toISOString().slice(0, 10)}`,
                [
                  { key: "created_at", label: "সময়" },
                  { key: "severity", label: "ধরন" },
                  { key: "source", label: "উৎস" },
                  { key: "path", label: "পেজ" },
                  { key: "message", label: "বার্তা" },
                ],
                errors,
              )
            }
            className="ml-auto min-h-11 rounded-lg border border-border px-3 text-xs font-semibold"
          >
            CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="p-2">সময়</th>
                <th className="p-2">ধরন</th>
                <th className="p-2">পেজ</th>
                <th className="p-2">বার্তা</th>
              </tr>
            </thead>
            <tbody>
              {errors.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">
                    কোনো এরর রেকর্ড হয়নি — সিস্টেম সুস্থ আছে
                  </td>
                </tr>
              )}
              {errors.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="p-2 whitespace-nowrap">{new Date(e.created_at).toLocaleString("bn-BD")}</td>
                  <td className="p-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${e.severity === "error" ? "bg-sale/10 text-sale" : "bg-muted"}`}>
                      {e.severity}
                    </span>
                  </td>
                  <td className="p-2 max-w-[10rem] truncate">{e.path || "—"}</td>
                  <td className="p-2">{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── ERP অডিট ট্রেইল ───────────────── */

const TABLE_LABEL: Record<string, string> = {
  suppliers: "সাপ্লায়ার",
  purchase_orders: "ক্রয় আদেশ",
  purchase_order_items: "ক্রয় আদেশ আইটেম",
  stock_batches: "স্টক ব্যাচ",
};
const ACTION_LABEL: Record<string, string> = { insert: "নতুন", update: "পরিবর্তন", delete: "মুছে ফেলা" };

export function ErpAudit() {
  const [table, setTable] = useState("");
  const [action, setAction] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["erp-audit", table, action],
    queryFn: async () => {
      let q = supabase.from("erp_audit_log").select("*").order("created_at", { ascending: false }).limit(300);
      if (table) q = q.eq("table_name", table);
      if (action) q = q.eq("action", action);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: people = [] } = useQuery({
    queryKey: ["erp-audit-people"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });
  const nameOf = (id: string | null) => (id ? people.find((p) => p.id === id)?.name || "ব্যবহারকারী" : "সিস্টেম");

  const flat = rows.map((r) => ({
    created_at: new Date(r.created_at).toLocaleString("bn-BD"),
    table_name: TABLE_LABEL[r.table_name] ?? r.table_name,
    action: ACTION_LABEL[r.action] ?? r.action,
    label: r.label,
    actor: nameOf(r.actor),
    changes: summarize(r.changes as Record<string, unknown>, r.action),
  }));

  const cols = [
    { key: "created_at", label: "সময়" },
    { key: "table_name", label: "মডিউল" },
    { key: "action", label: "কাজ" },
    { key: "label", label: "রেকর্ড" },
    { key: "actor", label: "কে করেছেন" },
    { key: "changes", label: "পরিবর্তন" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={table}
          onChange={(e) => setTable(e.target.value)}
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-base sm:text-sm"
        >
          <option value="">সব মডিউল</option>
          {Object.entries(TABLE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-base sm:text-sm"
        >
          <option value="">সব কাজ</option>
          {Object.entries(ACTION_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          onClick={() => downloadCsv(`erp-audit-${new Date().toISOString().slice(0, 10)}`, cols, flat)}
          className="min-h-11 rounded-lg border border-border px-3 text-xs font-semibold"
        >
          CSV
        </button>
        <button
          onClick={() => printReport("ERP অডিট ট্রেইল", `মোট ${bn(flat.length)} টি রেকর্ড`, cols, flat)}
          className="min-h-11 rounded-lg border border-border px-3 text-xs font-semibold"
        >
          PDF / প্রিন্ট
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-secondary text-[11px] uppercase text-muted-foreground">
            <tr>
              {cols.map((c) => (
                <th key={c.key} className="p-2">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  লোড হচ্ছে...
                </td>
              </tr>
            )}
            {!isLoading && flat.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  এখনো কোনো ERP পরিবর্তন রেকর্ড হয়নি
                </td>
              </tr>
            )}
            {flat.map((r, i) => (
              <tr key={i} className="border-t border-border align-top">
                <td className="p-2 whitespace-nowrap">{r.created_at}</td>
                <td className="p-2">{r.table_name}</td>
                <td className="p-2 font-semibold">{r.action}</td>
                <td className="p-2">{r.label || "—"}</td>
                <td className="p-2">{r.actor}</td>
                <td className="p-2 text-muted-foreground">{r.changes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function summarize(changes: Record<string, unknown>, action: string) {
  if (!changes) return "";
  const skip = new Set(["id", "created_at", "updated_at"]);
  const parts: string[] = [];
  for (const [k, v] of Object.entries(changes)) {
    if (skip.has(k)) continue;
    if (action === "update" && v && typeof v === "object" && "from" in (v as object)) {
      const o = v as { from: unknown; to: unknown };
      parts.push(`${k}: ${String(o.from ?? "")} → ${String(o.to ?? "")}`);
    } else {
      parts.push(`${k}: ${String(v ?? "")}`);
    }
    if (parts.length >= 6) break;
  }
  return parts.join(" · ");
}

/* ───────────────── ERP রিপোর্ট এক্সপোর্ট ───────────────── */

export function ErpReports() {
  const [busy, setBusy] = useState("");

  const run = async (
    key: string,
    title: string,
    cols: { key: string; label: string }[],
    load: () => Promise<Record<string, string | number | null>[]>,
    mode: "csv" | "pdf",
  ) => {
    setBusy(key + mode);
    try {
      const rows = await load();
      if (mode === "csv") downloadCsv(`${key}-${new Date().toISOString().slice(0, 10)}`, cols, rows);
      else if (!printReport(title, `তৈরি: ${new Date().toLocaleString("bn-BD")}`, cols, rows))
        toast.error("পপ-আপ ব্লক করা আছে — অনুমতি দিন");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const ledgerCols = [
    { key: "created_at", label: "তারিখ" },
    { key: "product_name", label: "পণ্য" },
    { key: "change", label: "পরিবর্তন" },
    { key: "balance", label: "ব্যালেন্স" },
    { key: "kind", label: "ধরন" },
    { key: "ref", label: "রেফারেন্স" },
    { key: "note", label: "নোট" },
  ];
  const loadLedger = async () => {
    const { data, error } = await supabase
      .from("stock_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      created_at: new Date(r.created_at).toLocaleString("bn-BD"),
      product_name: r.product_name,
      change: r.change,
      balance: r.balance,
      kind: r.kind === "purchase" ? "ক্রয়" : "সমন্বয়",
      ref: r.ref,
      note: r.note,
    }));
  };

  const poCols = [
    { key: "po_no", label: "PO নং" },
    { key: "supplier_name", label: "সাপ্লায়ার" },
    { key: "status", label: "অবস্থা" },
    { key: "expected_at", label: "প্রত্যাশিত" },
    { key: "subtotal", label: "সাবটোটাল" },
    { key: "discount", label: "ছাড়" },
    { key: "total", label: "মোট" },
    { key: "created_at", label: "তৈরি" },
  ];
  const loadPo = async () => {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      po_no: r.po_no,
      supplier_name: r.supplier_name,
      status: r.status === "received" ? "গৃহীত" : "অর্ডার করা",
      expected_at: r.expected_at ?? "—",
      subtotal: money(Number(r.subtotal)),
      discount: money(Number(r.discount)),
      total: money(Number(r.total)),
      created_at: new Date(r.created_at).toLocaleDateString("bn-BD"),
    }));
  };

  const batchCols = [
    { key: "product_name", label: "পণ্য" },
    { key: "batch_no", label: "ব্যাচ" },
    { key: "expiry", label: "মেয়াদ" },
    { key: "days_left", label: "বাকি দিন" },
    { key: "qty", label: "পরিমাণ" },
  ];
  const loadBatches = async () => {
    const { data, error } = await supabase.rpc("admin_expiring_batches", { _days: 365 });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      product_name: r.product_name,
      batch_no: r.batch_no || "—",
      expiry: r.expiry,
      days_left: bn(r.days_left),
      qty: bn(r.qty),
    }));
  };

  const reports = [
    { key: "stock-ledger", title: "স্টক লেজার", desc: "প্রতিটি স্টক পরিবর্তনের পূর্ণ হিসাব", cols: ledgerCols, load: loadLedger },
    { key: "purchase-orders", title: "ক্রয় আদেশ রিপোর্ট", desc: "সব PO, সাপ্লায়ার ও মূল্যসহ", cols: poCols, load: loadPo },
    { key: "batch-expiry", title: "ব্যাচ মেয়াদ রিপোর্ট", desc: "আগামী ১ বছরের মেয়াদ তালিকা", cols: batchCols, load: loadBatches },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {reports.map((r) => (
        <div key={r.key} className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-bold">{r.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{r.desc}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => void run(r.key, r.title, r.cols, r.load, "csv")}
              disabled={busy === r.key + "csv"}
              className="min-h-11 flex-1 rounded-lg border border-border px-3 text-xs font-semibold disabled:opacity-50"
            >
              CSV ডাউনলোড
            </button>
            <button
              onClick={() => void run(r.key, r.title, r.cols, r.load, "pdf")}
              disabled={busy === r.key + "pdf"}
              className="min-h-11 flex-1 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              PDF
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────── ERP অ্যাক্সেস নিয়ন্ত্রণ ───────────────── */

export function ErpRoles() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: erpUsers = [] } = useQuery({
    queryKey: ["erp-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_erp_users");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: found = [] } = useQuery({
    queryKey: ["erp-user-search", q],
    enabled: q.trim().length > 1,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_customers", { _q: q, _limit: 8 });
      if (error) throw error;
      return data ?? [];
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ id, grant }: { id: string; grant: boolean }) => {
      const { error } = await supabase.rpc("admin_set_erp_manager", { _user_id: id, _grant: grant });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ERP অ্যাক্সেস হালনাগাদ হয়েছে");
      void qc.invalidateQueries({ queryKey: ["erp-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        শুধুমাত্র <b className="text-foreground">অ্যাডমিন</b> ও <b className="text-foreground">ERP ম্যানেজার</b> সাপ্লায়ার,
        ক্রয় আদেশ, ব্যাচ ও স্টক লেজার দেখতে ও পরিচালনা করতে পারেন। এই নিয়ম ডাটাবেজ পর্যায়ে প্রয়োগ করা — অন্য কেউ সরাসরি
        চেষ্টা করলেও ব্লক হবে।
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-2 text-sm font-bold">ERP ম্যানেজার যোগ করুন</p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="নাম, ফোন বা ইমেইল দিয়ে খুঁজুন"
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base sm:text-sm"
        />
        {found.length > 0 && (
          <ul className="mt-2 space-y-1">
            {found.map((u) => (
              <li key={u.user_id} className="flex items-center gap-2 border-b border-border py-1 text-xs">
                <span className="flex-1">
                  {u.name || "নামহীন"} · {u.phone || u.email}
                </span>
                <button
                  onClick={() => setRole.mutate({ id: u.user_id, grant: true })}
                  className="min-h-11 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
                >
                  ERP অ্যাক্সেস দিন
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-secondary text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="p-3">নাম</th>
              <th className="p-3">ফোন</th>
              <th className="p-3">ভূমিকা</th>
              <th className="p-3">কাজ</th>
            </tr>
          </thead>
          <tbody>
            {erpUsers.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-muted-foreground">
                  কেউ নেই
                </td>
              </tr>
            )}
            {erpUsers.map((u) => (
              <tr key={u.user_id} className="border-t border-border">
                <td className="p-3 font-semibold">{u.name || "নামহীন"}</td>
                <td className="p-3">{u.phone || "—"}</td>
                <td className="p-3">
                  {u.is_admin && <span className="mr-1 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">অ্যাডমিন</span>}
                  {u.is_erp_manager && <span className="rounded bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-navy">ERP ম্যানেজার</span>}
                </td>
                <td className="p-3">
                  {u.is_erp_manager && (
                    <button
                      onClick={() => setRole.mutate({ id: u.user_id, grant: false })}
                      className="min-h-11 rounded-lg border border-border px-3 text-xs font-semibold text-sale"
                    >
                      ERP অ্যাক্সেস সরান
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
