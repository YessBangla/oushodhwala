import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";

const RETURN_STATUS: Record<string, string> = {
  requested: "অনুরোধ",
  approved: "অনুমোদিত",
  rejected: "বাতিল",
  refunded: "রিফান্ড হয়েছে",
};

const REVIEW_STATUS: Record<string, string> = {
  pending: "অপেক্ষমাণ",
  approved: "অনুমোদিত",
  rejected: "বাতিল",
};

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}

/** রিটার্ন ও রিফান্ড অনুরোধ ম্যানেজমেন্ট */
export function ReturnsAdmin() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("requested");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-returns", filter],
    queryFn: async () => {
      let q = supabase
        .from("order_returns")
        .select("id, order_no, reason, details, photo_urls, refund_amount, status, admin_note, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      const { error } = await supabase
        .from("order_returns")
        .update({ status, ...(note !== undefined ? { admin_note: note } : {}) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
      void qc.invalidateQueries({ queryKey: ["admin-returns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {["requested", "approved", "refunded", "rejected", "all"].map((s) => (
          <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>
            {s === "all" ? "সব" : RETURN_STATUS[s]}
          </Chip>
        ))}
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>}
      {!isLoading && rows.length === 0 && <p className="text-xs text-muted-foreground">কোনো অনুরোধ নেই।</p>}

      <div className="space-y-2">
        {rows.map((r) => (
          <article key={r.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />
              <b className="text-sm">{r.order_no}</b>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-primary">
                {RETURN_STATUS[r.status] ?? r.status}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {new Date(r.created_at).toLocaleString("bn-BD")}
              </span>
            </div>
            <p className="mt-1.5 text-xs">
              <b>কারণ:</b> {r.reason}
              {r.details ? ` — ${r.details}` : ""}
            </p>
            <p className="mt-1 text-xs">
              <b>রিফান্ড:</b> ৳{bn(Number(r.refund_amount ?? 0))}
            </p>
            {r.photo_urls?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {r.photo_urls.map((u: string) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer">
                    <img src={u} alt="return" className="h-16 w-16 rounded-lg border border-border object-cover" />
                  </a>
                ))}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {["approved", "refunded", "rejected"].map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={setStatus.isPending || r.status === s}
                  onClick={() => setStatus.mutate({ id: r.id, status: s })}
                  className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                >
                  {RETURN_STATUS[s]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const note = window.prompt("অ্যাডমিন নোট", r.admin_note ?? "");
                  if (note !== null) setStatus.mutate({ id: r.id, status: r.status, note });
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold"
              >
                নোট
              </button>
            </div>
            {r.admin_note && <p className="mt-1.5 text-[11px] text-muted-foreground">নোট: {r.admin_note}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}

/** রিভিউ মডারেশন */
export function ReviewsAdmin() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("pending");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-reviews", filter],
    queryFn: async () => {
      let q = supabase
        .from("product_reviews")
        .select("id, product_id, author_name, rating, comment, verified, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("product_reviews").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("রিভিউ আপডেট হয়েছে");
      void qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("রিভিউ মুছে ফেলা হয়েছে");
      void qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {["pending", "approved", "rejected", "all"].map((s) => (
          <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>
            {s === "all" ? "সব" : REVIEW_STATUS[s]}
          </Chip>
        ))}
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>}
      {!isLoading && rows.length === 0 && <p className="text-xs text-muted-foreground">কোনো রিভিউ নেই।</p>}

      <div className="space-y-2">
        {rows.map((r) => (
          <article key={r.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={`h-3 w-3 ${i <= r.rating ? "fill-current text-sale" : "text-muted-foreground"}`} />
                ))}
              </span>
              <b className="text-xs">{r.author_name || "গ্রাহক"}</b>
              {r.verified && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-primary">যাচাইকৃত</span>
              )}
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold">
                {REVIEW_STATUS[r.status] ?? r.status}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {new Date(r.created_at).toLocaleString("bn-BD")}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">প্রোডাক্ট: {r.product_id}</p>
            {r.comment && <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed">{r.comment}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {["approved", "rejected", "pending"].map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={setStatus.isPending || r.status === s}
                  onClick={() => setStatus.mutate({ id: r.id, status: s })}
                  className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                >
                  {REVIEW_STATUS[s]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => remove.mutate(r.id)}
                className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-sale"
              >
                মুছুন
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
