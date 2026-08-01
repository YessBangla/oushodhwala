import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { runApiTest, type ApiTestResult } from "@/lib/api-hub.functions";
import { downloadCsv } from "@/lib/erp-report";

type Endpoint = {
  id: string;
  name: string;
  grp: string;
  method: string;
  url: string;
  headers: Record<string, string> | null;
  sample_body: string;
  auth_kind: string;
  active: boolean;
  note: string;
  last_status: number | null;
  last_ok: boolean | null;
  last_ms: number | null;
  last_tested_at: string | null;
};

type TestLog = {
  id: string;
  name: string;
  method: string;
  url: string;
  status_code: number | null;
  ok: boolean;
  duration_ms: number;
  response_excerpt: string;
  error: string;
  created_at: string;
};

const GROUPS = [
  { id: "internal", t: "ইন্টারনাল" },
  { id: "seo", t: "SEO" },
  { id: "external", t: "এক্সটার্নাল" },
  { id: "payment", t: "পেমেন্ট" },
  { id: "sms", t: "SMS / WhatsApp" },
  { id: "ai", t: "AI" },
  { id: "general", t: "অন্যান্য" },
];

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/** এনভায়রনমেন্ট — একই API ভিন্ন সার্ভারে টেস্ট করার জন্য */
const ENVS = [
  { id: "dev", t: "ডেভেলপমেন্ট", key: "api_base_dev", fallback: "http://localhost:8080" },
  { id: "staging", t: "স্টেজিং", key: "api_base_staging", fallback: "https://id-preview--4c282ff2-061d-4bef-824e-7eb6c51ba36f.lovable.app" },
  { id: "prod", t: "প্রোডাকশন", key: "api_base_prod", fallback: "https://oushodhwala.lovable.app" },
] as const;

type EnvId = (typeof ENVS)[number]["id"];

/** রিলেটিভ পাথ হলে নির্বাচিত এনভায়রনমেন্টের বেস URL যুক্ত করে */
function resolveUrl(url: string, base: string) {
  const u = (url || "").trim();
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  const b = (base || "").trim().replace(/\/$/, "");
  return b + (u.startsWith("/") ? u : `/${u}`);
}


const EMPTY = {
  name: "",
  grp: "general",
  method: "GET",
  url: "",
  headersText: "{}",
  sample_body: "",
  auth_kind: "none",
  active: true,
  note: "",
};

const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("bn-BD") : "—");

function StatusPill({ ok, status }: { ok: boolean | null; status: number | null }) {
  if (ok === null || status === null) return <span className="text-xs text-muted-foreground">টেস্ট হয়নি</span>;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
        ok ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
      }`}
    >
      {status || "ERR"}
    </span>
  );
}

export function ApiHub() {
  const qc = useQueryClient();
  const test = useServerFn(runApiTest);
  const [form, setForm] = useState({ ...EMPTY });
  const [editId, setEditId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [result, setResult] = useState<(ApiTestResult & { name: string }) | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [env, setEnv] = useState<EnvId>("prod");
  const [baseDraft, setBaseDraft] = useState<string | null>(null);

  const { data: bases = {} } = useQuery({
    queryKey: ["api-env-bases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ENVS.map((e) => e.key));
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const r of data ?? []) map[(r as { key: string }).key] = (r as { value: string }).value;
      return map;
    },
  });

  const envDef = ENVS.find((e) => e.id === env)!;
  const baseUrl = (bases[envDef.key] ?? "").trim() || envDef.fallback;

  const saveBase = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: envDef.key, value: value.trim(), label: `API base — ${envDef.t}` }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("বেস URL সংরক্ষিত");
      setBaseDraft(null);
      void qc.invalidateQueries({ queryKey: ["api-env-bases"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["api-endpoints"],
    queryFn: async () => {
      const { data, error } = await supabase.from("api_endpoints").select("*").order("grp").order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Endpoint[];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["api-test-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_test_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as TestLog[];
    },
  });

  const shown = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.grp === filter)),
    [rows, filter],
  );

  const save = useMutation({
    mutationFn: async () => {
      let headers: Record<string, string> = {};
      try {
        headers = JSON.parse(form.headersText || "{}");
      } catch {
        throw new Error("হেডার সঠিক JSON নয়");
      }
      if (!form.name.trim() || !form.url.trim()) throw new Error("নাম ও URL দিন");
      const payload = {
        name: form.name.trim(),
        grp: form.grp,
        method: form.method,
        url: form.url.trim(),
        headers,
        sample_body: form.sample_body,
        auth_kind: form.auth_kind,
        active: form.active,
        note: form.note,
      };
      const q = editId
        ? supabase.from("api_endpoints").update(payload).eq("id", editId)
        : supabase.from("api_endpoints").insert(payload);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editId ? "API হালনাগাদ হয়েছে" : "API যুক্ত হয়েছে");
      setForm({ ...EMPTY });
      setEditId(null);
      void qc.invalidateQueries({ queryKey: ["api-endpoints"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_endpoints").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("মুছে ফেলা হয়েছে");
      void qc.invalidateQueries({ queryKey: ["api-endpoints"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function runOne(ep: Endpoint) {
    setBusyId(ep.id);
    try {
      const r = await test({
        data: {
          url: ep.url,
          method: ep.method,
          headers: ep.headers ?? {},
          body: ep.sample_body || "",
        },
      });
      setResult({ ...r, name: ep.name });
      await supabase
        .from("api_endpoints")
        .update({
          last_status: r.status,
          last_ok: r.ok,
          last_ms: r.ms,
          last_tested_at: new Date().toISOString(),
        })
        .eq("id", ep.id);
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("api_test_logs").insert({
        endpoint_id: ep.id,
        name: ep.name,
        method: ep.method,
        url: ep.url,
        status_code: r.status,
        ok: r.ok,
        duration_ms: r.ms,
        response_excerpt: r.excerpt.slice(0, 1000),
        error: r.error,
        actor: u.user?.id ?? null,
      });
      void qc.invalidateQueries({ queryKey: ["api-endpoints"] });
      void qc.invalidateQueries({ queryKey: ["api-test-logs"] });
      if (r.ok) toast.success(`${ep.name}: ${r.status} (${r.ms}ms)`);
      else toast.error(`${ep.name}: ${r.error || r.status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "টেস্ট ব্যর্থ");
    } finally {
      setBusyId(null);
    }
  }

  async function runAll() {
    for (const ep of shown.filter((r) => r.active)) {
      await runOne(ep);
    }
    toast.success("সব API টেস্ট সম্পন্ন");
  }

  const okCount = rows.filter((r) => r.last_ok === true).length;
  const failCount = rows.filter((r) => r.last_ok === false).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["মোট API", String(rows.length), ""],
          ["সক্রিয়", String(rows.filter((r) => r.active).length), "text-primary"],
          ["সর্বশেষ সফল", String(okCount), "text-primary"],
          ["সর্বশেষ ব্যর্থ", String(failCount), failCount ? "text-destructive" : ""],
        ].map(([l, v, tone]) => (
          <div key={l} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">{l}</p>
            <p className={`mt-1 text-lg font-extrabold ${tone}`}>{v}</p>
          </div>
        ))}
      </div>

      {/* ফর্ম */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-extrabold">{editId ? "API সম্পাদনা" : "নতুন API যুক্ত করুন"}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="h-11 rounded-lg border border-border bg-background px-3 text-base"
            placeholder="নাম (যেমন: bKash পেমেন্ট)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="flex gap-2">
            <select
              className="h-11 flex-1 rounded-lg border border-border bg-background px-2 text-base"
              value={form.grp}
              onChange={(e) => setForm({ ...form, grp: e.target.value })}
            >
              {GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.t}
                </option>
              ))}
            </select>
            <select
              className="h-11 w-28 rounded-lg border border-border bg-background px-2 text-base"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            >
              {METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <input
            className="h-11 rounded-lg border border-border bg-background px-3 text-base md:col-span-2"
            placeholder="URL (https://... অথবা /api/public/health)"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
          <textarea
            className="min-h-[80px] rounded-lg border border-border bg-background p-3 font-mono text-sm"
            placeholder='হেডার JSON — {"Authorization":"Bearer ..."}'
            value={form.headersText}
            onChange={(e) => setForm({ ...form, headersText: e.target.value })}
          />
          <textarea
            className="min-h-[80px] rounded-lg border border-border bg-background p-3 font-mono text-sm"
            placeholder="নমুনা বডি (JSON)"
            value={form.sample_body}
            onChange={(e) => setForm({ ...form, sample_body: e.target.value })}
          />
          <input
            className="h-11 rounded-lg border border-border bg-background px-3 text-base md:col-span-2"
            placeholder="নোট / ব্যবহারের উদ্দেশ্য"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            সক্রিয়
          </label>
          <button
            className="h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {editId ? "সংরক্ষণ" : "যুক্ত করুন"}
          </button>
          {editId && (
            <button
              className="h-11 rounded-lg border border-border px-4 text-sm font-bold"
              onClick={() => {
                setEditId(null);
                setForm({ ...EMPTY });
              }}
            >
              বাতিল
            </button>
          )}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          নিরাপত্তার জন্য গোপন কী (API Secret) এখানে না রেখে ব্যাকএন্ড সিক্রেট হিসেবে রাখুন; হেডারে শুধু রেফারেন্স দিন।
        </p>
      </div>

      {/* তালিকা */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <select
            className="h-10 rounded-lg border border-border bg-background px-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">সব গ্রুপ</option>
            {GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.t}
              </option>
            ))}
          </select>
          <button
            className="h-10 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
            onClick={() => void runAll()}
          >
            সব টেস্ট করুন
          </button>
          <button
            className="h-10 rounded-lg border border-border px-4 text-sm font-bold"
            onClick={() =>
              downloadCsv(
                "api-endpoints",
                [
                  { key: "name", label: "নাম" },
                  { key: "grp", label: "গ্রুপ" },
                  { key: "method", label: "মেথড" },
                  { key: "url", label: "URL" },
                  { key: "status", label: "সর্বশেষ স্ট্যাটাস" },
                  { key: "ms", label: "সময়(ms)" },
                  { key: "at", label: "টেস্ট" },
                ],
                rows.map((r) => ({
                  name: r.name,
                  grp: r.grp,
                  method: r.method,
                  url: r.url,
                  status: r.last_status ?? "",
                  ms: r.last_ms ?? "",
                  at: fmt(r.last_tested_at),
                })),
              )
            }
          >
            CSV
          </button>
        </div>

        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">লোড হচ্ছে…</p>
        ) : shown.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">কোনো API নেই।</p>
        ) : (
          <div className="divide-y divide-border">
            {shown.map((ep) => (
              <div key={ep.id} className="flex flex-wrap items-center gap-2 p-3">
                <div className="min-w-[200px] flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold">{ep.method}</span>
                    <span className="text-sm font-bold">{ep.name}</span>
                    {!ep.active && <span className="text-[10px] text-muted-foreground">(নিষ্ক্রিয়)</span>}
                    <StatusPill ok={ep.last_ok} status={ep.last_status} />
                  </div>
                  <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">{ep.url}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {ep.note} · সর্বশেষ: {fmt(ep.last_tested_at)}
                    {ep.last_ms ? ` · ${ep.last_ms}ms` : ""}
                  </p>
                </div>
                <button
                  className="h-9 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50"
                  disabled={busyId === ep.id}
                  onClick={() => void runOne(ep)}
                >
                  {busyId === ep.id ? "চলছে…" : "টেস্ট"}
                </button>
                <button
                  className="h-9 rounded-lg border border-border px-3 text-xs font-bold"
                  onClick={() => {
                    setEditId(ep.id);
                    setForm({
                      name: ep.name,
                      grp: ep.grp,
                      method: ep.method,
                      url: ep.url,
                      headersText: JSON.stringify(ep.headers ?? {}, null, 2),
                      sample_body: ep.sample_body,
                      auth_kind: ep.auth_kind,
                      active: ep.active,
                      note: ep.note,
                    });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  সম্পাদনা
                </button>
                <button
                  className="h-9 rounded-lg border border-destructive/40 px-3 text-xs font-bold text-destructive"
                  onClick={() => {
                    if (confirm(`"${ep.name}" মুছে ফেলবেন?`)) remove.mutate(ep.id);
                  }}
                >
                  মুছুন
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ফলাফল */}
      {result && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-extrabold">
              ফলাফল — {result.name}{" "}
              <span className={result.ok ? "text-primary" : "text-destructive"}>
                {result.status || "ERR"} · {result.ms}ms
              </span>
            </h3>
            <button className="text-xs text-muted-foreground" onClick={() => setResult(null)}>
              বন্ধ
            </button>
          </div>
          {result.error && <p className="mb-2 text-xs text-destructive">{result.error}</p>}
          <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 font-mono text-[11px]">
            {result.excerpt || "(খালি রেসপন্স)"}
          </pre>
        </div>
      )}

      {/* লগ */}
      <div className="rounded-xl border border-border bg-card">
        <h3 className="border-b border-border p-3 text-sm font-extrabold">সাম্প্রতিক টেস্ট লগ</h3>
        {logs.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">এখনো কোনো টেস্ট হয়নি।</p>
        ) : (
          <div className="max-h-80 divide-y divide-border overflow-auto">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 p-2.5 text-xs">
                <span className="flex-1 truncate">
                  <b>{l.name}</b> · {l.method} {l.url}
                </span>
                <span className={l.ok ? "text-primary" : "text-destructive"}>
                  {l.status_code || "ERR"} · {l.duration_ms}ms
                </span>
                <span className="whitespace-nowrap text-muted-foreground">{fmt(l.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
