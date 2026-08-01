import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, RefreshCw, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";
import {
  clearClientErrors,
  getClientErrors,
  installClientErrorCapture,
  subscribeClientErrors,
  type ClientLogEntry,
} from "@/lib/client-log";

type Check = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  fixLabel?: string;
  fixTab?: string;
};

export function AdminHealth({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [errors, setErrors] = useState<ClientLogEntry[]>([]);

  useEffect(() => {
    installClientErrorCapture();
    setErrors(getClientErrors());
    const off = subscribeClientErrors(() => setErrors(getClientErrors()));
    return () => {
      off();
    };
  }, []);

  const health = useQuery({
    queryKey: ["admin-health"],
    queryFn: async () => {
      const cnt = async (
        table: "riders" | "products" | "doctors" | "categories" | "lab_tests" | "orders" | "deliveries" | "offers",
        build?: (q: any) => any,
      ) => {
        let q: any = supabase.from(table).select("id", { count: "exact", head: true });
        if (build) q = build(q);
        const { count } = await q;
        return count ?? 0;
      };

      const [activeRiders, totalRiders, missingImg, activeProducts, doctors, cats, labs, pendingOrders, unassigned, offers] =
        await Promise.all([
          cnt("riders", (q) => q.eq("active", true)),
          cnt("riders"),
          cnt("products", (q) => q.eq("active", true).eq("image_url", "")),
          cnt("products", (q) => q.eq("active", true)),
          cnt("doctors", (q) => q.eq("active", true)),
          cnt("categories", (q) => q.eq("active", true)),
          cnt("lab_tests", (q) => q.eq("active", true)),
          cnt("orders", (q) => q.in("status", ["confirmed", "processing"])),
          cnt("deliveries", (q) => q.is("rider_id", null)),
          cnt("offers", (q) => q.eq("active", true)),
        ]);

      return { activeRiders, totalRiders, missingImg, activeProducts, doctors, cats, labs, pendingOrders, unassigned, offers };
    },
  });

  const d = health.data;
  const checks: Check[] = d
    ? [
        {
          id: "riders",
          label: "সক্রিয় ডেলিভারিম্যান",
          ok: d.activeRiders > 0,
          detail: d.activeRiders > 0 ? `${bn(d.activeRiders)} জন সক্রিয় (মোট ${bn(d.totalRiders)})` : "কোনো ডেলিভারিম্যান নেই — অর্ডার অ্যাসাইন করা যাবে না",
          fixLabel: "ডেলিভারিম্যান যোগ করুন",
          fixTab: "riders",
        },
        {
          id: "images",
          label: "পণ্যের ছবি",
          ok: d.missingImg === 0,
          detail: `${bn(d.missingImg)} টি পণ্যের ছবি নেই (মোট ${bn(d.activeProducts)})`,
          fixLabel: "ছবি আপলোড করুন",
          fixTab: "imgupload",
        },
        {
          id: "unassigned",
          label: "অ্যাসাইন হয়নি এমন ডেলিভারি",
          ok: d.unassigned === 0,
          detail: `${bn(d.unassigned)} টি ডেলিভারিতে ডেলিভারিম্যান নেই`,
          fixLabel: "ডেলিভারি ম্যানেজ",
          fixTab: "delivery",
        },
        {
          id: "orders",
          label: "প্রক্রিয়াধীন অর্ডার",
          ok: true,
          detail: `${bn(d.pendingOrders)} টি অর্ডার প্রস্তুত/নিশ্চিত অবস্থায়`,
          fixLabel: "অর্ডার দেখুন",
          fixTab: "orders",
        },
        {
          id: "doctors",
          label: "সক্রিয় ডাক্তার",
          ok: d.doctors > 0,
          detail: `${bn(d.doctors)} জন ডাক্তার সক্রিয়`,
          fixLabel: "ডাক্তার",
          fixTab: "doctors",
        },
        {
          id: "catalog",
          label: "ক্যাটালগ সেটআপ",
          ok: d.cats > 0 && d.labs > 0,
          detail: `ক্যাটাগরি ${bn(d.cats)} টি · ল্যাব টেস্ট ${bn(d.labs)} টি · অফার ${bn(d.offers)} টি`,
          fixLabel: "ক্যাটাগরি",
          fixTab: "categories",
        },
      ]
    : [];

  const bad = checks.filter((c) => !c.ok);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold">সিস্টেম হেলথ ও QA</h2>
          <p className="text-[11px] text-muted-foreground">
            {health.isLoading ? "যাচাই হচ্ছে..." : bad.length === 0 ? "সবকিছু ঠিক আছে" : `${bn(bad.length)} টি বিষয়ে মনোযোগ প্রয়োজন`}
          </p>
        </div>
        <button
          onClick={() => void health.refetch()}
          className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
        </button>
      </div>

      {bad.length > 0 && (
        <div className="rounded-xl border border-sale/30 bg-sale/5 p-3">
          <p className="text-xs font-bold text-sale">দ্রুত ঠিক করার তালিকা</p>
          <ul className="mt-2 space-y-1">
            {bad.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 text-[11px]">
                <AlertTriangle className="h-3.5 w-3.5 text-sale" />
                <span className="font-semibold">{c.label}:</span>
                <span className="text-muted-foreground">{c.detail}</span>
                {c.fixTab && onNavigate && (
                  <button
                    onClick={() => onNavigate(c.fixTab!)}
                    className="ml-auto rounded-lg bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground"
                  >
                    {c.fixLabel}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {checks.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              {c.ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-sale" />}
              <p className="text-xs font-bold">{c.label}</p>
              {c.fixTab && onNavigate && (
                <button onClick={() => onNavigate(c.fixTab!)} className="ml-auto text-[10px] font-semibold text-primary underline">
                  {c.fixLabel}
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{c.detail}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold">কনসোল এরর ({bn(errors.length)})</h3>
          <button
            onClick={() => clearClientErrors()}
            className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
          >
            <Trash2 className="h-3 w-3" /> মুছুন
          </button>
        </div>
        <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
          {errors.map((e) => (
            <div key={e.id} className="rounded-lg border border-border p-2 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-bold text-destructive">{e.kind}</span>
                <span className="text-muted-foreground">{new Date(e.at).toLocaleTimeString("bn-BD")}</span>
                {e.source && <span className="truncate text-muted-foreground">{e.source}</span>}
              </div>
              <p className="mt-1 break-words">{e.message}</p>
            </div>
          ))}
          {errors.length === 0 && <p className="text-xs text-muted-foreground">এই সেশনে কোনো কনসোল এরর ধরা পড়েনি।</p>}
        </div>
      </div>
    </div>
  );
}
