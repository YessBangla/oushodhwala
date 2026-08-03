import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plug, Plus, Trash2, Save, Wifi, Eye, EyeOff } from "lucide-react";
import {
  listIntegrations,
  saveIntegration,
  deleteIntegration,
  testIntegration,
  type IntegrationRow,
} from "@/lib/integrations.functions";

const CATS = [
  { id: "all", t: "সব" },
  { id: "messaging", t: "মেসেজিং" },
  { id: "payment", t: "পেমেন্ট গেটওয়ে" },
  { id: "other", t: "অন্যান্য" },
];

const CAT_LABEL: Record<string, string> = {
  messaging: "মেসেজিং",
  payment: "পেমেন্ট গেটওয়ে",
  other: "অন্যান্য",
};

type Draft = {
  base_url: string;
  sender_id: string;
  api_key: string;
  api_secret: string;
  config_text: string;
  note: string;
  active: boolean;
};

function toDraft(r: IntegrationRow): Draft {
  return {
    base_url: r.base_url,
    sender_id: r.sender_id,
    api_key: "",
    api_secret: "",
    config_text: r.config_text,
    note: r.note,
    active: r.active,
  };
}

function Card({
  row,
  onSaved,
}: {
  row: IntegrationRow;
  onSaved: () => void;
}) {
  const save = useServerFn(saveIntegration);
  const del = useServerFn(deleteIntegration);
  const test = useServerFn(testIntegration);
  const [d, setD] = useState<Draft>(() => toDraft(row));
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState("");

  useEffect(() => setD(toDraft(row)), [row]);
  const set = (k: keyof Draft, v: string | boolean) => setD((p) => ({ ...p, [k]: v }));

  async function run(kind: "save" | "test" | "delete") {
    setBusy(kind);
    try {
      if (kind === "delete") {
        if (!confirm(`"${row.name}" মুছে ফেলবেন?`)) return;
        await del({ data: { id: row.id } });
        toast.success("মুছে ফেলা হয়েছে");
      } else {
        await save({
          data: {
            id: row.id,
            provider: row.provider,
            name: row.name,
            category: row.category,
            base_url: d.base_url,
            sender_id: d.sender_id,
            note: d.note,
            active: d.active,
            config_text: d.config_text,
            api_key: d.api_key,
            api_secret: d.api_secret,
          },
        });
        if (kind === "test") {
          const r = await test({ data: { id: row.id } });
          if (r.ok) toast.success(`${row.name}: সংযোগ ঠিক আছে (${r.status} · ${r.ms}ms)`);
          else toast.error(`${row.name}: ${r.error || `স্ট্যাটাস ${r.status}`}`);
        } else {
          toast.success("সংরক্ষিত");
        }
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ব্যর্থ");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
          <Plug className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{row.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {row.provider} · {CAT_LABEL[row.category] ?? row.category}
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold">
          {d.active ? "চালু" : "বন্ধ"}
          <input
            type="checkbox"
            checked={d.active}
            onChange={(e) => set("active", e.target.checked)}
            className="h-4 w-8 accent-[hsl(var(--primary))]"
            aria-label={`${row.name} সক্রিয়`}
          />
        </label>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-[11px] font-semibold text-muted-foreground">
          বেস URL
          <input
            value={d.base_url}
            onChange={(e) => set("base_url", e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm"
            placeholder="https://…"
          />
        </label>
        <label className="text-[11px] font-semibold text-muted-foreground">
          সেন্ডার আইডি
          <input
            value={d.sender_id}
            onChange={(e) => set("sender_id", e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
        </label>
        <label className="text-[11px] font-semibold text-muted-foreground">
          API কী {row.has_key && <span className="text-primary">(সংরক্ষিত আছে)</span>}
          <span className="relative mt-1 block">
            <input
              type={show ? "text" : "password"}
              value={d.api_key}
              onChange={(e) => set("api_key", e.target.value)}
              placeholder={row.has_key ? "•••••••• (বদলাতে নতুন কী দিন)" : "নতুন কী"}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label="কী দেখান"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>
        <label className="text-[11px] font-semibold text-muted-foreground">
          API সিক্রেট {row.has_secret && <span className="text-primary">(সংরক্ষিত আছে)</span>}
          <input
            type="password"
            value={d.api_secret}
            onChange={(e) => set("api_secret", e.target.value)}
            placeholder={row.has_secret ? "•••••••• (বদলাতে নতুন সিক্রেট দিন)" : "নতুন সিক্রেট"}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm"
          />
        </label>
      </div>

      <label className="mt-2 block text-[11px] font-semibold text-muted-foreground">
        অতিরিক্ত কনফিগ (JSON)
        <textarea
          value={d.config_text}
          onChange={(e) => set("config_text", e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-border bg-background p-2 font-mono text-xs"
        />
      </label>
      <label className="mt-2 block text-[11px] font-semibold text-muted-foreground">
        নোট
        <input
          value={d.note}
          onChange={(e) => set("note", e.target.value)}
          className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {row.last_tested_at && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              row.last_ok ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
            }`}
          >
            {row.last_ok ? "সফল" : "ব্যর্থ"} · {row.last_status || "ERR"}
          </span>
        )}
        <button
          onClick={() => void run("delete")}
          disabled={!!busy}
          className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-bold text-destructive disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> মুছুন
        </button>
        <button
          onClick={() => void run("test")}
          disabled={!!busy}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[11px] font-bold disabled:opacity-50"
        >
          <Wifi className="h-3.5 w-3.5" /> কানেকশন টেস্ট
        </button>
        <button
          onClick={() => void run("save")}
          disabled={!!busy}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" /> সেভ
        </button>
      </div>
    </div>
  );
}

/** SMS, ইমেইল, পেমেন্ট গেটওয়ে ও অন্যান্য সার্ভিসের ক্রেডেনশিয়াল কনফিগারেশন */
export function ApiIntegrations() {
  const qc = useQueryClient();
  const list = useServerFn(listIntegrations);
  const save = useServerFn(saveIntegration);
  const [cat, setCat] = useState("all");
  const [adding, setAdding] = useState(false);
  const [nw, setNw] = useState({ provider: "", name: "", category: "other" });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["api-integrations"],
    queryFn: () => list({}),
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["api-integrations"] });

  const create = useMutation({
    mutationFn: async () =>
      save({
        data: {
          provider: nw.provider,
          name: nw.name,
          category: nw.category,
          base_url: "",
          sender_id: "",
          note: "",
          active: false,
          config_text: "{}",
        },
      }),
    onSuccess: () => {
      toast.success("নতুন ইন্টিগ্রেশন যুক্ত হয়েছে");
      setNw({ provider: "", name: "", category: "other" });
      setAdding(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shown = cat === "all" ? rows : rows.filter((r) => r.category === cat);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h3 className="text-sm font-extrabold">ইন্টিগ্রেশন ও ক্রেডেনশিয়াল</h3>
          <p className="text-[11px] text-muted-foreground">
            SMS, ইমেইল, পেমেন্ট গেটওয়ে ও অন্যান্য সব API কনফিগার করুন — কী/সিক্রেট শুধু সার্ভারে থাকে
          </p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> নতুন API
        </button>
      </div>

      {adding && (
        <div className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-4">
          <input
            value={nw.provider}
            onChange={(e) => setNw({ ...nw, provider: e.target.value })}
            placeholder="প্রোভাইডার আইডি (যেমন stripe)"
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={nw.name}
            onChange={(e) => setNw({ ...nw, name: e.target.value })}
            placeholder="প্রদর্শন নাম"
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <select
            value={nw.category}
            onChange={(e) => setNw({ ...nw, category: e.target.value })}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          >
            {CATS.filter((c) => c.id !== "all").map((c) => (
              <option key={c.id} value={c.id}>
                {c.t}
              </option>
            ))}
          </select>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending || !nw.provider.trim() || !nw.name.trim()}
            className="h-11 rounded-lg bg-navy px-3 text-sm font-bold text-navy-foreground disabled:opacity-50"
          >
            যোগ করুন
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
              cat === c.id ? "bg-primary text-primary-foreground" : "border border-border text-navy"
            }`}
          >
            {c.t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="p-6 text-center text-xs text-muted-foreground">লোড হচ্ছে…</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {shown.map((r) => (
            <Card key={r.id} row={r} onSaved={refresh} />
          ))}
          {shown.length === 0 && (
            <p className="col-span-full p-6 text-center text-xs text-muted-foreground">কোনো ইন্টিগ্রেশন নেই</p>
          )}
        </div>
      )}
    </section>
  );
}
