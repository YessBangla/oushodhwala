import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Loader2, Search } from "lucide-react";

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
  const popupRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const [term, setTerm] = useState("");
  const [failed, setFailed] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 288 });
  const cache = useRef<Record<string, MedSuggestion[]>>({}); // একই সার্চ টেক্সটের জন্য ফলাফল ক্যাশ


  const positionPopup = () => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const width = Math.min(360, Math.max(288, window.innerWidth - 16));
    setPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      top: rect.bottom + 4,
      width,
    });
  };

  // ডিবাউন্স — টাইপ থামার পরই কোয়েরি
  useEffect(() => {
    const q = term.trim();
    if (!open || q.length < 1) {
      setRows([]);
      return;
    }
    const my = ++seq.current;
    
    // ক্যাশ চেক করা হচ্ছে
    if (cache.current[q]) {
      setRows(cache.current[q]);
      setLoading(false);
      setFailed(false);
      setActive(0);
      return;
    }

    setLoading(true);
    setFailed(false);
    const id = window.setTimeout(async () => {
      try {
        const r = await suggest({ data: { q, limit: 8 } });
        if (my === seq.current) {
          const suggestions = r.rows as MedSuggestion[];
          cache.current[q] = suggestions; // ক্যাশে সেভ করা হচ্ছে
          setRows(suggestions);
          setActive(0);
        }
      } catch {
        if (my === seq.current) {
          setRows([]);
          setFailed(true);
        }
      } finally {
        if (my === seq.current) setLoading(false);
      }
    }, 300); // ব্র্যান্ড ইনপুটের জন্য debounce 300ms সেট করা হলো যাতে অপ্রয়োজনীয় সার্ভার কল কমে
    return () => window.clearTimeout(id);
  }, [term, open, suggest]);


  // টেবিলের overflow পপ-আপ কেটে ফেলতে পারে, তাই portal-এর অবস্থান ইনপুটের সাথে রাখি।
  useEffect(() => {
    if (!open) return;
    positionPopup();
    const update = () => positionPopup();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  // বাইরে ক্লিক করলে পপ-আপ বন্ধ
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!boxRef.current?.contains(target) && !popupRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const list = useMemo(() => rows.slice(0, 8), [rows]);

  const highlight = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-primary/20 text-primary rounded-sm px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

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
        aria-label={t("ঔষধ খুঁজুন", "Search medicine")}
        aria-autocomplete="list"
        aria-expanded={open && list.length > 0}
        aria-controls="med-picker-listbox"
        aria-activedescendant={open ? `med-option-${active}` : undefined}
        aria-invalid={!!err}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setTerm(e.target.value);
          setOpen(true);
          positionPopup();
        }}
        onFocus={() => {
          setTerm(value);
          setOpen(true);
          positionPopup();
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

      {open && term.trim().length > 0 && typeof document !== "undefined" && createPortal(
        <div
          ref={popupRef}
          id="med-picker-listbox"
          role="listbox"
          aria-label={t("সাজেশন তালিকা", "Suggestion list")}
          style={{ left: position.left, top: position.top, width: position.width }}
          className="fixed z-[100] max-h-72 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-xl"
        >

          {loading && list.length === 0 && (
            <p className="flex items-center gap-2 px-2 py-2 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> {t("খুঁজছি…", "Searching…")}
            </p>
          )}
          {list.map((p, i) => (
            <button
              key={p.id}
              id={`med-option-${i}`}
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
                  {highlight(t.en ? p.en || p.name : p.name, term)} {p.strength}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {[highlight(p.generic || "", term), highlight(p.manufacturer || p.brand || "", term), p.pack || p.form].filter(Boolean).reduce((prev, curr, i) => [prev, i > 0 ? " · " : "", curr], [] as any)}
                </span>

              </span>
              <span className="shrink-0 text-[10px] font-bold text-primary">৳{Math.round(p.price)}</span>
            </button>
          ))}
          {failed && !loading && (
            <p className="flex items-center gap-2 px-2 py-2 text-[11px] font-semibold text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> {t("ঔষধ খোঁজা যায়নি—আবার লিখুন", "Search failed—please type again")}
            </p>
          )}
          {!failed && !loading && list.length === 0 && (
            <p className="px-2 py-2 text-[11px] text-muted-foreground">{t("কিছু পাওয়া যায়নি", "No match found")}</p>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
