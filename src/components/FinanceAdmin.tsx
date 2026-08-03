import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, BookOpen, Wallet, CalendarDays, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bn } from "@/data/catalog";

const today = () => new Date().toISOString().slice(0, 10);

const EXP_CATS = [
  { v: "salary", t: "বেতন" },
  { v: "rent", t: "ভাড়া" },
  { v: "utility", t: "বিদ্যুৎ ও ইউটিলিটি" },
  { v: "transport", t: "পরিবহন" },
  { v: "marketing", t: "বিপণন" },
  { v: "packaging", t: "প্যাকেজিং" },
  { v: "other", t: "অন্যান্য" },
];
const catLabel = (v: string) => EXP_CATS.find((c) => c.v === v)?.t ?? v;

/* ---------------- খরচ ---------------- */
export function ExpensesAdmin() {
  const qc = useQueryClient();
  const [f, setF] = useState({ spent_on: today(), category: "other", title: "", amount: "", method: "cash", note: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("spent_on", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expenses").insert({
        spent_on: f.spent_on,
        category: f.category,
        title: f.title,
        amount: Number(f.amount) || 0,
        method: f.method,
        note: f.note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("খরচ যুক্ত হয়েছে");
      setF({ ...f, title: "", amount: "", note: "" });
      void qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["expenses"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const total = (data ?? []).reduce((a, r) => a + Number(r.amount), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold">
          <Wallet className="h-4 w-4 text-primary" /> নতুন খরচ
        </p>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <input
            type="date"
            value={f.spent_on}
            onChange={(e) => setF({ ...f, spent_on: e.target.value })}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <select
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
          >
            {EXP_CATS.map((c) => (
              <option key={c.v} value={c.v}>
                {c.t}
              </option>
            ))}
          </select>
          <input
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
            placeholder="বিবরণ"
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            type="number"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
            placeholder="পরিমাণ ৳"
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <select
            value={f.method}
            onChange={(e) => setF({ ...f, method: e.target.value })}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="cash">নগদ</option>
            <option value="bank">ব্যাংক</option>
            <option value="bkash">বিকাশ</option>
            <option value="nagad">নগদ (Nagad)</option>
          </select>
          <button
            disabled={!f.title || !f.amount || add.isPending}
            onClick={() => add.mutate()}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> যোগ
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <p className="flex items-center justify-between border-b border-border px-3 py-2 text-xs font-bold">
          <span>খরচের তালিকা</span>
          <span className="text-sale">মোট ৳{bn(total)}</span>
        </p>
        {isLoading ? (
          <p className="p-4 text-center text-xs text-muted-foreground">লোড হচ্ছে…</p>
        ) : (
          <ul className="divide-y divide-border text-xs">
            {(data ?? []).map((r) => (
              <li key={r.id} className="flex items-center gap-2 px-3 py-2">
                <span className="w-24 shrink-0 text-muted-foreground">{r.spent_on}</span>
                <span className="w-28 shrink-0 rounded-full bg-secondary px-2 py-0.5 text-center text-[10px] font-semibold">
                  {catLabel(r.category)}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{r.title}</span>
                <span className="font-bold text-sale">৳{bn(Number(r.amount))}</span>
                <button onClick={() => del.mutate(r.id)} aria-label="মুছুন" className="text-muted-foreground">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            {(data ?? []).length === 0 && <li className="p-4 text-center text-muted-foreground">কোনো খরচ নেই</li>}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------------- চার্ট অব অ্যাকাউন্টস ---------------- */
const KINDS = [
  { v: "asset", t: "সম্পদ" },
  { v: "liability", t: "দায়" },
  { v: "equity", t: "মূলধন" },
  { v: "income", t: "আয়" },
  { v: "expense", t: "ব্যয়" },
];

export function ChartOfAccounts() {
  const qc = useQueryClient();
  const [f, setF] = useState({ code: "", name: "", name_en: "", kind: "asset" });

  const { data } = useQuery({
    queryKey: ["coa"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chart_accounts").select("*").order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("chart_accounts").insert(f);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("অ্যাকাউন্ট যুক্ত হয়েছে");
      setF({ code: "", name: "", name_en: "", kind: "asset" });
      void qc.invalidateQueries({ queryKey: ["coa"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-5">
        <input
          value={f.code}
          onChange={(e) => setF({ ...f, code: e.target.value })}
          placeholder="কোড"
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <input
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="নাম (বাংলা)"
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <input
          value={f.name_en}
          onChange={(e) => setF({ ...f, name_en: e.target.value })}
          placeholder="Name (English)"
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <select
          value={f.kind}
          onChange={(e) => setF({ ...f, kind: e.target.value })}
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
        >
          {KINDS.map((k) => (
            <option key={k.v} value={k.v}>
              {k.t}
            </option>
          ))}
        </select>
        <button
          disabled={!f.code || !f.name}
          onClick={() => add.mutate()}
          className="min-h-11 rounded-lg bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          যোগ করুন
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {KINDS.map((k) => (
          <div key={k.v} className="rounded-xl border border-border bg-card">
            <p className="border-b border-border px-3 py-2 text-xs font-bold">{k.t}</p>
            <ul className="divide-y divide-border text-xs">
              {(data ?? [])
                .filter((a) => a.kind === k.v)
                .map((a) => (
                  <li key={a.code} className="flex items-center gap-2 px-3 py-2">
                    <span className="w-14 font-mono text-muted-foreground">{a.code}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{a.name}</span>
                    <span className="truncate text-[10px] text-muted-foreground">{a.name_en}</span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- জার্নাল ---------------- */
type JLine = { account_code: string; debit: string; credit: string; note: string };

export function JournalAdmin() {
  const qc = useQueryClient();
  const [date, setDate] = useState(today());
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<JLine[]>([
    { account_code: "", debit: "", credit: "", note: "" },
    { account_code: "", debit: "", credit: "", note: "" },
  ]);

  const { data: accounts } = useQuery({
    queryKey: ["coa"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chart_accounts").select("code,name,kind").order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: entries } = useQuery({
    queryKey: ["journal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*, journal_lines(*)")
        .order("entry_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const dr = lines.reduce((a, l) => a + (Number(l.debit) || 0), 0);
  const cr = lines.reduce((a, l) => a + (Number(l.credit) || 0), 0);
  const balanced = dr > 0 && Math.round(dr * 100) === Math.round(cr * 100);

  const post = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("post_journal", {
        _date: date,
        _memo: memo,
        _ref: "",
        _lines: lines
          .filter((l) => l.account_code)
          .map((l) => ({
            account_code: l.account_code,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            note: l.note,
          })),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("জার্নাল এন্ট্রি পোস্ট হয়েছে");
      setMemo("");
      setLines([
        { account_code: "", debit: "", credit: "", note: "" },
        { account_code: "", debit: "", credit: "", note: "" },
      ]);
      void qc.invalidateQueries({ queryKey: ["journal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upd = (i: number, patch: Partial<JLine>) =>
    setLines((ls) => ls.map((l, x) => (x === i ? { ...l, ...patch } : l)));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold">
          <BookOpen className="h-4 w-4 text-primary" /> নতুন জার্নাল ভাউচার
        </p>
        <div className="mb-2 grid gap-2 sm:grid-cols-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="বিবরণ / মেমো"
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm sm:col-span-2"
          />
        </div>

        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1.5fr_1fr_1fr_1.5fr_auto]">
              <select
                value={l.account_code}
                onChange={(e) => upd(i, { account_code: e.target.value })}
                className="min-h-11 rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value="">— হিসাব নির্বাচন —</option>
                {(accounts ?? []).map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} · {a.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={l.debit}
                onChange={(e) => upd(i, { debit: e.target.value })}
                placeholder="ডেবিট"
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                type="number"
                value={l.credit}
                onChange={(e) => upd(i, { credit: e.target.value })}
                placeholder="ক্রেডিট"
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={l.note}
                onChange={(e) => upd(i, { note: e.target.value })}
                placeholder="নোট"
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <button
                onClick={() => setLines((ls) => ls.filter((_, x) => x !== i))}
                aria-label="সরান"
                className="min-h-11 px-2 text-muted-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setLines((ls) => [...ls, { account_code: "", debit: "", credit: "", note: "" }])}
            className="rounded-lg border border-border px-3 py-2 font-semibold"
          >
            + লাইন
          </button>
          <span className="text-muted-foreground">
            ডেবিট ৳{bn(dr)} · ক্রেডিট ৳{bn(cr)}
          </span>
          {!balanced && dr + cr > 0 && <span className="font-bold text-sale">ডেবিট ও ক্রেডিট সমান নয়</span>}
          <button
            disabled={!balanced || post.isPending}
            onClick={() => post.mutate()}
            className="ml-auto rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50"
          >
            পোস্ট করুন
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <p className="border-b border-border px-3 py-2 text-xs font-bold">সাম্প্রতিক এন্ট্রি</p>
        <ul className="divide-y divide-border text-xs">
          {(entries ?? []).map((e) => (
            <li key={e.id} className="px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground">{e.entry_no}</span>
                <span className="font-semibold">{e.memo || "—"}</span>
                <span className="ml-auto font-bold text-primary">৳{bn(Number(e.total))}</span>
                <span className="text-muted-foreground">{e.entry_date}</span>
              </div>
              <div className="mt-1 space-y-0.5 pl-2 text-[11px] text-muted-foreground">
                {(e.journal_lines ?? []).map((l: { id: string; account_code: string; account_name: string; debit: number; credit: number }) => (
                  <div key={l.id} className="flex gap-2">
                    <span className="w-32 truncate">
                      {l.account_code} {l.account_name}
                    </span>
                    <span className="w-20 text-right">{Number(l.debit) ? `ডেঃ ৳${bn(Number(l.debit))}` : ""}</span>
                    <span className="w-20 text-right">{Number(l.credit) ? `ক্রেঃ ৳${bn(Number(l.credit))}` : ""}</span>
                  </div>
                ))}
              </div>
            </li>
          ))}
          {(entries ?? []).length === 0 && <li className="p-4 text-center text-muted-foreground">কোনো এন্ট্রি নেই</li>}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- ডে-বুক ---------------- */
type DayBookData = {
  day: string;
  orders: { no: string; name: string; total: number; method: string; status: string }[];
  pos: { no: string; name: string; total: number; method: string }[];
  expenses: { title: string; category: string; amount: number; method: string }[];
};

export function DayBook() {
  const [day, setDay] = useState(today());
  const { data, isLoading } = useQuery({
    queryKey: ["day-book", day],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("day_book", { _day: day });
      if (error) throw error;
      return data as unknown as DayBookData;
    },
  });

  const inflow =
    (data?.orders ?? []).reduce((a, r) => a + Number(r.total), 0) +
    (data?.pos ?? []).reduce((a, r) => a + Number(r.total), 0);
  const outflow = (data?.expenses ?? []).reduce((a, r) => a + Number(r.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" />
        <input
          type="date"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="min-h-11 rounded-lg border border-border bg-card px-3 text-sm"
        />
        <button onClick={() => window.print()} className="min-h-11 rounded-lg border border-border px-3 text-xs font-semibold">
          প্রিন্ট
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { t: "মোট আয়", v: inflow, c: "text-primary" },
          { t: "মোট ব্যয়", v: outflow, c: "text-sale" },
          { t: "নিট", v: inflow - outflow, c: "text-navy" },
        ].map((c) => (
          <div key={c.t} className="rounded-xl border border-border bg-card p-3">
            <p className={`text-lg font-bold ${c.c}`}>৳{bn(c.v)}</p>
            <p className="text-[11px] text-muted-foreground">{c.t}</p>
          </div>
        ))}
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">লোড হচ্ছে…</p>}

      {[
        { title: "অনলাইন অর্ডার", rows: (data?.orders ?? []).map((r) => ({ a: r.no, b: r.name, c: r.method, d: r.total })) },
        { title: "POS বিক্রয়", rows: (data?.pos ?? []).map((r) => ({ a: r.no, b: r.name || "ওয়াক-ইন", c: r.method, d: r.total })) },
        { title: "খরচ", rows: (data?.expenses ?? []).map((r) => ({ a: r.title, b: catLabel(r.category), c: r.method, d: r.amount })) },
      ].map((sec) => (
        <div key={sec.title} className="rounded-xl border border-border bg-card">
          <p className="border-b border-border px-3 py-2 text-xs font-bold">{sec.title}</p>
          <ul className="divide-y divide-border text-xs">
            {sec.rows.map((r, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1 truncate font-semibold">{r.a}</span>
                <span className="truncate text-muted-foreground">{r.b}</span>
                <span className="w-16 text-right text-[10px] text-muted-foreground">{r.c}</span>
                <span className="w-20 text-right font-bold">৳{bn(Number(r.d))}</span>
              </li>
            ))}
            {sec.rows.length === 0 && <li className="p-3 text-center text-muted-foreground">কিছু নেই</li>}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ---------------- ফিন্যান্সিয়ালস ---------------- */
type Fin = {
  online_sales: number;
  pos_sales: number;
  pos_due: number;
  purchases: number;
  expenses: number;
  expenses_by_cat: Record<string, number>;
  stock_value: number;
  refunds: number;
};

export function Financials() {
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
  const [to, setTo] = useState(today());

  const { data, isLoading } = useQuery({
    queryKey: ["financials", from, to],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("finance_summary", { _from: from, _to: to });
      if (error) throw error;
      return data as unknown as Fin;
    },
  });

  const revenue = Number(data?.online_sales ?? 0) + Number(data?.pos_sales ?? 0);
  const cost = Number(data?.purchases ?? 0) + Number(data?.expenses ?? 0) + Number(data?.refunds ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FileSpreadsheet className="h-4 w-4 text-primary" />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="min-h-11 rounded-lg border border-border bg-card px-3 text-sm" />
        <span className="text-xs text-muted-foreground">থেকে</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="min-h-11 rounded-lg border border-border bg-card px-3 text-sm" />
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">লোড হচ্ছে…</p>}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { t: "অনলাইন বিক্রয়", v: data?.online_sales },
          { t: "POS বিক্রয়", v: data?.pos_sales },
          { t: "মোট ক্রয়", v: data?.purchases },
          { t: "মোট খরচ", v: data?.expenses },
          { t: "রিফান্ড", v: data?.refunds },
          { t: "POS বাকি", v: data?.pos_due },
          { t: "স্টকের মূল্য", v: data?.stock_value },
          { t: "নিট লাভ/ক্ষতি", v: revenue - cost },
        ].map((c) => (
          <div key={c.t} className="rounded-xl border border-border bg-card p-3">
            <p className="text-lg font-bold text-primary">৳{bn(Number(c.v ?? 0))}</p>
            <p className="text-[11px] text-muted-foreground">{c.t}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card">
          <p className="border-b border-border px-3 py-2 text-xs font-bold">আয়-ব্যয় বিবরণী</p>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-3 py-2">মোট আয়</td>
                <td className="px-3 py-2 text-right font-bold text-primary">৳{bn(revenue)}</td>
              </tr>
              <tr>
                <td className="px-3 py-2">ক্রয় ব্যয়</td>
                <td className="px-3 py-2 text-right">৳{bn(Number(data?.purchases ?? 0))}</td>
              </tr>
              <tr>
                <td className="px-3 py-2">পরিচালন খরচ</td>
                <td className="px-3 py-2 text-right">৳{bn(Number(data?.expenses ?? 0))}</td>
              </tr>
              <tr>
                <td className="px-3 py-2">রিফান্ড</td>
                <td className="px-3 py-2 text-right">৳{bn(Number(data?.refunds ?? 0))}</td>
              </tr>
              <tr className="bg-secondary/40">
                <td className="px-3 py-2 font-bold">নিট</td>
                <td className="px-3 py-2 text-right font-bold">৳{bn(revenue - cost)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <p className="border-b border-border px-3 py-2 text-xs font-bold">খাতভিত্তিক খরচ</p>
          <ul className="divide-y divide-border text-xs">
            {Object.entries(data?.expenses_by_cat ?? {}).map(([k, v]) => (
              <li key={k} className="flex justify-between px-3 py-2">
                <span>{catLabel(k)}</span>
                <span className="font-bold text-sale">৳{bn(Number(v))}</span>
              </li>
            ))}
            {Object.keys(data?.expenses_by_cat ?? {}).length === 0 && (
              <li className="p-3 text-center text-muted-foreground">কোনো খরচ নেই</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------------- পার্টি স্টেটমেন্ট ---------------- */
type Stmt = { kind: string; name: string; total: number; rows: { date: string; ref: string; detail: string; debit: number; credit: number }[] };

export function PartyStatement() {
  const [kind, setKind] = useState<"customer" | "supplier">("supplier");
  const [party, setParty] = useState("");

  const { data: suppliers } = useQuery({
    queryKey: ["stmt-suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["stmt-customers"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_customers", { _q: "", _limit: 200 });
      if (error) throw error;
      return (data ?? []) as { user_id: string; name: string }[];
    },
  });

  const { data: stmt, isFetching } = useQuery({
    queryKey: ["party-stmt", kind, party],
    enabled: !!party,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("party_statement", {
        _kind: kind,
        _party_id: party,
        _from: new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10),
        _to: today(),
      });
      if (error) throw error;
      return data as unknown as Stmt;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as "customer" | "supplier");
            setParty("");
          }}
          className="min-h-11 rounded-lg border border-border bg-card px-3 text-sm"
        >
          <option value="supplier">সাপ্লায়ার</option>
          <option value="customer">গ্রাহক</option>
        </select>
        <select
          value={party}
          onChange={(e) => setParty(e.target.value)}
          className="min-h-11 min-w-56 rounded-lg border border-border bg-card px-3 text-sm"
        >
          <option value="">— নির্বাচন করুন —</option>
          {kind === "supplier"
            ? (suppliers ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))
            : (customers ?? []).map((c) => (
                <option key={c.user_id} value={c.user_id}>
                  {c.name || c.user_id.slice(0, 8)}
                </option>
              ))}
        </select>
      </div>

      {isFetching && <p className="text-xs text-muted-foreground">লোড হচ্ছে…</p>}

      {stmt && (
        <div className="rounded-xl border border-border bg-card">
          <p className="flex items-center justify-between border-b border-border px-3 py-2 text-xs font-bold">
            <span>{stmt.name || "—"}</span>
            <span className="text-primary">মোট ৳{bn(Number(stmt.total))}</span>
          </p>
          <table className="w-full text-xs">
            <thead className="bg-secondary/40 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">তারিখ</th>
                <th className="px-3 py-2 text-left">রেফ</th>
                <th className="px-3 py-2 text-left">বিবরণ</th>
                <th className="px-3 py-2 text-right">ডেবিট</th>
                <th className="px-3 py-2 text-right">ক্রেডিট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(stmt.rows ?? []).map((r, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">{new Date(r.date).toLocaleDateString("bn-BD")}</td>
                  <td className="px-3 py-2 font-mono">{r.ref}</td>
                  <td className="px-3 py-2">{r.detail}</td>
                  <td className="px-3 py-2 text-right">৳{bn(Number(r.debit))}</td>
                  <td className="px-3 py-2 text-right">৳{bn(Number(r.credit))}</td>
                </tr>
              ))}
              {(stmt.rows ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-foreground">
                    কোনো লেনদেন নেই
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
