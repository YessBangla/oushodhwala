import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HomeIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";

const STATUSES = ["requested", "confirmed", "assigned", "in_progress", "completed", "cancelled"] as const;

const LABEL: Record<string, string> = {
  requested: "অনুরোধ গৃহীত",
  confirmed: "নিশ্চিত",
  assigned: "নিয়োগ হয়েছে",
  in_progress: "সেবা চলছে",
  completed: "সম্পন্ন",
  cancelled: "বাতিল",
};

type Req = {
  id: string;
  request_no: string;
  service_slug: string;
  service_name: string;
  patient_name: string;
  phone: string;
  address: string;
  area: string;
  scheduled_date: string;
  slot: string;
  duration: string;
  note: string;
  fee: number;
  payment_method: string;
  payment_status: string;
  status: string;
  assignee_name: string;
  assignee_phone: string;
  created_at: string;
};

export function ServiceRequestsAdmin() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");

  const list = useQuery({
    queryKey: ["admin-service-requests", status],
    queryFn: async () => {
      let query = supabase.from("service_requests").select("*").order("created_at", { ascending: false }).limit(200);
      if (status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data as Req[];
    },
  });

  const setStat = useMutation({
    mutationFn: async (v: { id: string; status: string; name?: string; phone?: string }) => {
      const { error } = await supabase.rpc("admin_set_service_status", {
        _request_id: v.id,
        _status: v.status,
        _assignee_name: v.name ?? "",
        _assignee_phone: v.phone ?? "",
        _admin_note: "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("হালনাগাদ হয়েছে");
      void qc.invalidateQueries({ queryKey: ["admin-service-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const term = q.trim().toLowerCase();
  const rows = (list.data ?? []).filter(
    (r) =>
      !term ||
      r.request_no.toLowerCase().includes(term) ||
      r.phone.includes(term) ||
      r.patient_name.toLowerCase().includes(term) ||
      r.service_name.toLowerCase().includes(term),
  );

  const counts = STATUSES.map((s) => ({ s, n: (list.data ?? []).filter((r) => r.status === s).length }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {counts.map((c) => (
          <div key={c.s} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground">{LABEL[c.s]}</p>
            <p className="mt-1 text-base font-bold text-primary-dark">{bn(c.n)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
        >
          <option value="all">সব স্ট্যাটাস</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {LABEL[s]}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="নম্বর, ফোন বা রোগীর নাম"
          className="min-w-[9rem] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
        />
      </div>

      <div className="space-y-2">
        {list.isLoading && <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>}
        {rows.map((r) => (
          <RequestCard key={r.id} r={r} onSet={(v) => setStat.mutate({ id: r.id, ...v })} />
        ))}
        {!list.isLoading && rows.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
            কোনো হোম সার্ভিস অনুরোধ নেই।
          </p>
        )}
      </div>
    </div>
  );
}

function RequestCard({ r, onSet }: { r: Req; onSet: (v: { status: string; name?: string; phone?: string }) => void }) {
  const [name, setName] = useState(r.assignee_name);
  const [phone, setPhone] = useState(r.assignee_phone);

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <HomeIcon className="h-4 w-4 text-primary" />
        <span className="font-bold">#{r.request_no}</span>
        <span className="font-semibold">{r.service_name}</span>
        <span className="text-muted-foreground">
          {r.scheduled_date} · {r.slot}
        </span>
        <span className="ml-auto rounded bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary-dark">
          {LABEL[r.status] ?? r.status}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {r.patient_name} · {r.phone} · {r.address} {r.area && `(${r.area})`}
        {r.duration && ` · ${r.duration}`} · ৳{bn(Number(r.fee))} · {r.payment_method.toUpperCase()} ({r.payment_status})
      </p>
      {r.note && <p className="mt-1 text-[11px]">{r.note}</p>}

      <div className="mt-2 grid gap-2 sm:grid-cols-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="সেবাদানকারীর নাম"
          className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="সেবাদানকারীর ফোন"
          className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
        />
        <select
          value={r.status}
          onChange={(e) => onSet({ status: e.target.value, name, phone })}
          className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {LABEL[s]}
            </option>
          ))}
        </select>
        <button
          onClick={() => onSet({ status: "assigned", name, phone })}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
        >
          নিয়োগ ও জানান
        </button>
      </div>
    </div>
  );
}
