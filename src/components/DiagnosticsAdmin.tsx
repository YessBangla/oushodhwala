import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";
import { resolveFileUrl, safeName, uploadFile } from "@/lib/storage";


const STATUS: Record<string, string> = {
  requested: "অনুরোধ গৃহীত",
  confirmed: "নিশ্চিত",
  on_the_way: "কালেক্টর পথে",
  collected: "স্যাম্পল সংগৃহীত",
  processing: "ল্যাবে পরীক্ষা",
  report_ready: "রিপোর্ট প্রস্তুত",
  cancelled: "বাতিল",
};

type Booking = {
  id: string;
  booking_no: string;
  patient_name: string;
  phone: string;
  address: string;
  area: string;
  scheduled_date: string;
  slot: string;
  tests: { bn?: string; en?: string; price?: number }[];
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  collector_name: string;
  report_url: string;
};

export function DiagnosticsAdmin() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState<Record<string, { collector: string; report: string }>>({});

  const { data: rows = [] } = useQuery({
    queryKey: ["admin-diagnostics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagnostic_bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as Booking[];
    },
  });

  const list = rows.filter((r) => filter === "all" || r.status === filter);

  const setStatus = async (b: Booking, status: string) => {
    const e = edit[b.id];
    const { error } = await supabase.rpc("admin_set_diagnostic_status", {
      _booking_id: b.id,
      _status: status,
      _collector_name: e?.collector ?? "",
      _collector_phone: "",
      _report_url: e?.report ?? "",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("হালনাগাদ হয়েছে");
    void qc.invalidateQueries({ queryKey: ["admin-diagnostics"] });
  };

  const exportCsv = () => {
    const head = ["booking_no", "patient", "phone", "date", "slot", "area", "total", "status"];
    const body = list.map((r) => [r.booking_no, r.patient_name, r.phone, r.scheduled_date, r.slot, r.area, r.total, r.status]);
    const csv = [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "home-diagnostics.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs">
          <option value="all">সব বুকিং ({bn(rows.length)})</option>
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button onClick={exportCsv} className="rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold">
          CSV এক্সপোর্ট
        </button>
      </div>

      <div className="space-y-3">
        {list.map((b) => (
          <div key={b.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold">#{b.booking_no}</p>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary-dark">{STATUS[b.status] ?? b.status}</span>
              <span className="ml-auto text-xs font-extrabold text-primary">৳{bn(Number(b.total))}</span>
            </div>
            <p className="mt-1 text-xs font-semibold">
              {b.patient_name} · {b.phone}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {b.scheduled_date} · {b.slot} · {b.area} · {b.address}
            </p>
            <p className="mt-1 text-[11px]">
              টেস্ট: {(b.tests ?? []).map((t) => t.bn ?? t.en).join(", ")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              পেমেন্ট: {b.payment_method} ({b.payment_status})
            </p>

            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <input
                defaultValue={b.collector_name}
                onChange={(e) => setEdit({ ...edit, [b.id]: { collector: e.target.value, report: edit[b.id]?.report ?? b.report_url } })}
                placeholder="কালেক্টরের নাম"
                className="rounded-lg border border-border bg-muted px-2 py-1.5 text-xs"
              />
              <input
                defaultValue={b.report_url}
                onChange={(e) => setEdit({ ...edit, [b.id]: { collector: edit[b.id]?.collector ?? b.collector_name, report: e.target.value } })}
                placeholder="রিপোর্ট লিংক"
                className="rounded-lg border border-border bg-muted px-2 py-1.5 text-xs sm:col-span-2"
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(STATUS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => void setStatus(b, k)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${b.status === k ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">কোনো বুকিং নেই।</p>}
      </div>
    </div>
  );
}
