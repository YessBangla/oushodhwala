import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { RefreshCw, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { readPrescription } from "@/lib/rx-read.functions";
import { deleteRx } from "@/lib/rx-manage.functions";

const RX_STATUS: Record<string, string> = {
  pending: "যাচাই চলছে",
  approved: "অনুমোদিত",
  rejected: "বাতিল",
  fulfilled: "অর্ডার তৈরি",
};

type ParsedItem = { name?: string; strength?: string; dose?: string };

/** ড্যাশবোর্ডের প্রেসক্রিপশন কনসোল — যাচাই, OCR পুনরায় চালানো ও মুছে ফেলা */
export function RxAdmin() {
  const qc = useQueryClient();
  const rerun = useServerFn(readPrescription);
  const remove = useServerFn(deleteRx);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-prescriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows = data ?? [];
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, unread: 0 };
    for (const r of rows) {
      c[r.status] = (c[r.status] ?? 0) + 1;
      if (!r.parsed_at) c["unread"] = (c["unread"] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  const shown = rows.filter((r) => {
    if (filter === "unread" && r.parsed_at) return false;
    if (filter !== "all" && filter !== "unread" && r.status !== filter) return false;
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return `${r.phone} ${r.note} ${r.admin_note}`.toLowerCase().includes(needle);
  });

  const update = useMutation({
    mutationFn: async ({ id, status, admin_note }: { id: string; status: string; admin_note: string }) => {
      const { error } = await supabase.from("prescriptions").update({ status, admin_note }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("প্রেসক্রিপশন আপডেট হয়েছে");
      void qc.invalidateQueries({ queryKey: ["admin-prescriptions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage.from("prescriptions").createSignedUrl(path, 300);
    if (error || !data) {
      toast.error("ফাইল খোলা যায়নি");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const runOcr = async (id: string) => {
    setBusy(id);
    try {
      await rerun({ data: { id, force: true } });
      toast.success("OCR আবার চালানো হয়েছে");
      void qc.invalidateQueries({ queryKey: ["admin-prescriptions"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const del = async (id: string) => {
    if (!window.confirm("এই প্রেসক্রিপশন ও এর সব ফলাফল স্থায়ীভাবে মুছে যাবে। নিশ্চিত?")) return;
    setBusy(id);
    try {
      await remove({ data: { id } });
      toast.success("মুছে ফেলা হয়েছে");
      void qc.invalidateQueries({ queryKey: ["admin-prescriptions"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) return <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          { k: "all", l: "সব" },
          { k: "unread", l: "OCR বাকি" },
          ...Object.entries(RX_STATUS).map(([k, l]) => ({ k, l })),
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
              filter === f.k ? "border-primary bg-primary/10 text-primary" : "border-border"
            }`}
          >
            {f.l} ({counts[f.k] ?? 0})
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ফোন বা নোট খুঁজুন"
            className="w-40 bg-transparent text-[11px] outline-none"
          />
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="text-xs text-muted-foreground">কোনো প্রেসক্রিপশন পাওয়া যায়নি।</p>
      ) : (
        shown.map((r) => {
          const parsed = (Array.isArray((r.parsed as { items?: ParsedItem[] })?.items)
            ? (r.parsed as { items?: ParsedItem[] }).items
            : []) as ParsedItem[];
          return (
            <article key={r.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
                  {RX_STATUS[r.status] ?? r.status}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    r.parsed_at ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {r.parsed_at ? `AI রিডিং সম্পন্ন · ${parsed.length} ঔষধ` : "AI রিডিং বাকি"}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("bn-BD")}
                </p>
                {r.phone && <p className="text-[11px] font-semibold">{r.phone}</p>}
              </div>

              {r.note && <p className="mt-1 text-[11px] text-muted-foreground">নোট: {r.note}</p>}

              {parsed.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {parsed.slice(0, 8).map((m, i) => (
                    <li key={i} className="rounded-lg bg-secondary px-2 py-1 text-[10px] font-semibold">
                      {m.name} {m.strength} {m.dose ? `· ${m.dose}` : ""}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-2 flex flex-wrap gap-1.5">
                {(r.file_urls as string[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => void openFile(f)}
                    className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
                  >
                    📄 ফাইল দেখুন
                  </button>
                ))}
                <Link
                  to="/prescription/$id"
                  params={{ id: r.id }}
                  className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
                >
                  বিস্তারিত রিডিং
                </Link>
              </div>

              <input
                value={notes[r.id] ?? r.admin_note}
                onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                placeholder="ফার্মাসিস্টের মন্তব্য"
                className="mt-2 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
              />

              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(RX_STATUS).map(([k, label]) => (
                  <button
                    key={k}
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: r.id, status: k, admin_note: notes[r.id] ?? r.admin_note })}
                    className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold disabled:opacity-40"
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => void runOcr(r.id)}
                  disabled={busy === r.id}
                  className="flex items-center gap-1 rounded-lg border border-primary px-2 py-1 text-[10px] font-bold text-primary disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${busy === r.id ? "animate-spin" : ""}`} /> OCR পুনরায় চালান
                </button>
                <button
                  onClick={() => void del(r.id)}
                  disabled={busy === r.id}
                  className="flex items-center gap-1 rounded-lg border border-destructive/50 px-2 py-1 text-[10px] font-bold text-destructive disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" /> মুছুন
                </button>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
