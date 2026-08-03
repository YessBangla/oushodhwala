import { useMemo, useState } from "react";
import { Search, LayoutGrid } from "lucide-react";
import type { AdminNavGroup } from "@/components/AdminShell";

/** মডিউল লঞ্চার — সব অ্যাডমিন মডিউল এক গ্রিডে, সার্চসহ */
export function Workspace({
  groups,
  onOpen,
}: {
  groups: AdminNavGroup[];
  onOpen: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [simple, setSimple] = useState(false);

  const all = useMemo(
    () => groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label }))),
    [groups],
  );
  const shown = useMemo(() => {
    const base = simple ? all.filter((m) => SIMPLE.includes(m.id)) : all;
    return q ? base.filter((m) => m.t.toLowerCase().includes(q.toLowerCase())) : base;
  }, [all, q, simple]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-2 text-sm font-bold">
          <LayoutGrid className="h-4 w-4 text-primary" /> আমার ওয়ার্কস্পেস
        </p>
        <span className="text-[11px] text-muted-foreground">{shown.length} টি মডিউল</span>
        <button
          onClick={() => setSimple((v) => !v)}
          className={`ml-auto rounded-full px-3 py-1.5 text-[11px] font-bold ${
            simple ? "bg-primary text-primary-foreground" : "border border-border text-navy"
          }`}
        >
          সহজ মোড
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="মডিউল খুঁজুন…"
          className="min-h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((m) => (
          <button
            key={m.id}
            onClick={() => onOpen(m.id)}
            className="rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary"
          >
            <p className="truncate text-sm font-bold text-navy">{m.t}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.group}</p>
          </button>
        ))}
        {shown.length === 0 && (
          <p className="col-span-full p-6 text-center text-xs text-muted-foreground">কোনো মডিউল মেলেনি</p>
        )}
      </div>
    </section>
  );
}

/** সহজ মোডে দৈনন্দিন কাজের মডিউলগুলো */
const SIMPLE = ["pos", "orders", "inventory", "products", "delivery", "expenses", "daybook", "customers", "reports"];
