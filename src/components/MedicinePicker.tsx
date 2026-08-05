import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search } from "lucide-react";

import { useT } from "@/lib/i18n";
import { suggestMedicines } from "@/lib/rx-suggest.functions";
import type { MedSuggestion } from "@/lib/rx-suggest.server";

/**
 * ঔষধের নাম লেখার ইনপুট — একটি অক্ষর লিখলেই ডাটাবেজ থেকে মিল করা
 * ঔষধগুলো পপ-আপে দেখায়, বেছে নিলে সব ঘর নিজে থেকেই পূরণ হয়।
 */
export function MedicinePicker({
  value,
  onChange,
  onPick,
  w = "w-36",
  err,
  ph,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick?: (p: MedSuggestion) => void;
  w?: string;
  err?: string;
  ph?: string;
}) {
  const t = useT();
  const suggest = useServerFn(suggestMedicines);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MedSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const [term, setTerm] = useState("");

  // ডিবাউন্স — টাইপ থামার পরই কোয়েরি
  useEffect(() => {
    const q = term.trim();
    if (!open || q.length < 1) {
      setRows([]);
      return;
    }
    const my = ++seq.current;
    setLoading(true);
    const id = window.setTimeout(async () => {
      try {
        const r = await suggest({ data: { q, limit: 8 } });
        if (my === seq.current) {
          setRows(r.rows as MedSuggestion[]);
          setActive(0);
        }
      } catch {
        if (my === seq.current) setRows([]);
      } finally {
        if (my === seq.current) setLoading(false);
      }
    }, 220);
    return () => window.clearTimeout(id);
  }, [term, open, suggest]);

  // বাইরে ক্লিক করলে পপ-আপ বন্ধ
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const list = useMemo(() => rows.slice(0, 8), [rows]);

  const choose = (p: MedSuggestion) => {
    onChange(t.en ? p.en || p.name : p.name);
    onPick?.(p);
    setOpen(false);
    setRows([]);
  };

  return (
    <div className={`relative ${w}`} ref={boxRef}>
      <input
        value={value}
        placeholder={ph ?? "—"}
        role="combobox"
        aria-expanded={open && list.length > 0}
        aria-invalid={!!err}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setTerm(value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open || !list.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % list.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + list.length) % list.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            const p = list[active];
            if (p) choose(p);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={`w-full rounded-md bg-transparent px-1.5 py-1 text-[11px] font-semibold outline-none focus:bg-secondary placeholder:font-normal placeholder:text-muted-foreground/50 ${
          err ? "text-destructive ring-1 ring-destructive/60" : ""
        }`}
      />
      {err && <p className="px-1 pt-0.5 text-[9px] font-semibold leading-tight text-destructive">{err}</p>}

      {open && (loading || list.length > 0) && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 max-h-72 w-72 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl"
        >
          {loading && list.length === 0 && (
            <p className="flex items-center gap-2 px-2 py-2 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> {t("খুঁজছি…", "Searching…")}
            </p>
          )}
          {list.map((p, i) => (
            <button
              key={p.id}
              role="option"
              aria-selected={i === active}
              type="button"
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(p)}
              className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left ${i === active ? "bg-secondary" : ""}`}
            >
              <Search className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-bold">
                  {t.en ? p.en || p.name : p.name} {p.strength}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {[p.generic, p.manufacturer || p.brand, p.pack || p.form].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="shrink-0 text-[10px] font-bold text-primary">৳{Math.round(p.price)}</span>
            </button>
          ))}
          {!loading && list.length === 0 && (
            <p className="px-2 py-2 text-[11px] text-muted-foreground">{t("কিছু পাওয়া যায়নি", "No match found")}</p>
          )}
        </div>
      )}
    </div>
  );
}
