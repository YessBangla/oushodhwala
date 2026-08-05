import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Loader2, Search, Star, Trash2, Info, X, Filter, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { suggestMedicines } from "@/lib/rx-suggest.functions";
import type { MedSuggestion } from "@/lib/rx-suggest.server";
import { 
  syncUserMedicines, 
  toggleUserFavorite, 
  addUserRecent 
} from "@/lib/user-meds.functions";
import { ProductPreview } from "./ProductPreview";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "./ui/select";
import { Button } from "./ui/button";

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
  const { user } = useAuth();
  const suggest = useServerFn(suggestMedicines);
  const sync = useServerFn(syncUserMedicines);
  const toggleFav = useServerFn(toggleUserFavorite);
  const addRecent = useServerFn(addUserRecent);

  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MedSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  const [term, setTerm] = useState("");
  const [failed, setFailed] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 288 });
  const cache = useRef<Record<string, MedSuggestion[]>>({});
  const [recent, setRecent] = useState<MedSuggestion[]>([]);
  const [favorites, setFavorites] = useState<MedSuggestion[]>([]);
  
  const [previewProduct, setPreviewProduct] = useState<MedSuggestion | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Advanced Filters
  const [filterForm, setFilterForm] = useState<string>("all");
  const [sortPrice, setSortPrice] = useState<"none" | "low" | "high">("none");

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

  // রিসেন্ট এবং ফেভারিট মেডিসিন লোড ও সিঙ্ক
  useEffect(() => {
    const loadLocal = () => {
      const savedRecent = localStorage.getItem("rx_recent_meds");
      if (savedRecent) {
        try {
          setRecent(JSON.parse(savedRecent).slice(0, 5));
        } catch (e) {}
      }
      const savedFavs = localStorage.getItem("rx_favorite_meds");
      if (savedFavs) {
        try {
          setFavorites(JSON.parse(savedFavs));
        } catch (e) {}
      }
    };

    loadLocal();

    if (user) {
      const favIds = JSON.parse(localStorage.getItem("rx_favorite_meds") || "[]").map((m: any) => m.id);
      const recentIds = JSON.parse(localStorage.getItem("rx_recent_meds") || "[]").map((m: any) => m.id);
      
      sync({ data: { favIds, recentIds } }).then(res => {
        setFavorites(res.favorites);
        setRecent(res.recent.slice(0, 5));
        localStorage.setItem("rx_favorite_meds", JSON.stringify(res.favorites));
        localStorage.setItem("rx_recent_meds", JSON.stringify(res.recent));
      }).catch(console.error);
    }
  }, [user]);

  // ডিবাউন্স — টাইপ থামার পরই কোয়েরি
  useEffect(() => {
    const q = term.trim();
    if (!open || q.length < 1) {
      setRows([]);
      return;
    }
    const my = ++seq.current;
    
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
          cache.current[q] = suggestions;
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
    }, 300);
    return () => window.clearTimeout(id);
  }, [term, open, suggest]);

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

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!boxRef.current?.contains(target) && !popupRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const forms = useMemo(() => {
    return Array.from(new Set(rows.map(r => r.form).filter(Boolean)));
  }, [rows]);

  const list = useMemo(() => {
    let filtered = [...rows];
    if (filterForm !== "all") {
      filtered = filtered.filter(r => r.form === filterForm);
    }
    if (sortPrice === "low") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortPrice === "high") {
      filtered.sort((a, b) => b.price - a.price);
    }
    return filtered.slice(0, 8);
  }, [rows, filterForm, sortPrice]);

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

  const toggleFavorite = async (e: React.MouseEvent, p: MedSuggestion) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (user) {
      try {
        const res = await toggleFav({ data: { productId: p.id } });
        const isFav = res.favorite;
        let next: MedSuggestion[];
        if (isFav) {
          next = [p, ...favorites.filter(f => f.id !== p.id)];
        } else {
          next = favorites.filter(f => f.id !== p.id);
        }
        setFavorites(next);
        localStorage.setItem("rx_favorite_meds", JSON.stringify(next));
      } catch (err) {
        toast.error(t("প্রিয় তালিকায় যুক্ত করতে সমস্যা হয়েছে", "Error updating favorites"));
      }
    } else {
      const isFav = favorites.some((f) => f.id === p.id);
      let next: MedSuggestion[];
      if (isFav) {
        next = favorites.filter((f) => f.id !== p.id);
      } else {
        next = [p, ...favorites];
      }
      setFavorites(next);
      localStorage.setItem("rx_favorite_meds", JSON.stringify(next));
    }
  };

  const clearRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setRecent([]);
    localStorage.removeItem("rx_recent_meds");
  };

  const choose = (p: MedSuggestion) => {
    const text = t.en ? p.en || p.name : p.name;
    onChange(text);
    setTerm(text);
    onPick?.(p);
    
    if (user) {
      addRecent({ data: { productId: p.id } }).catch(console.error);
    }

    const next = [p, ...recent.filter(r => r.id !== p.id)].slice(0, 10);
    setRecent(next.slice(0, 5));
    localStorage.setItem("rx_recent_meds", JSON.stringify(next));

    setOpen(false);
    setRows([]);
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  const showPreview = (e: React.MouseEvent, p: MedSuggestion) => {
    e.stopPropagation();
    e.preventDefault();
    setPreviewProduct(p);
    setPreviewOpen(true);
  };

  return (
    <>
      <div className={`relative ${w}`} ref={boxRef}>
        <input
          ref={inputRef}
          value={value}
          placeholder={ph ?? "—"}
          role="combobox"
          aria-label={t("ঔষধ খুঁজুন", "Search medicine")}
          aria-autocomplete="list"
          aria-expanded={open && list.length > 0}
          aria-controls="med-picker-listbox"
          aria-activedescendant={open && list.length > 0 ? `med-option-${active}` : undefined}
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
            if (e.key === "Tab" && open) {
              setOpen(false);
              return;
            }
            if (!open) {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                setOpen(true);
                setTerm(value);
                positionPopup();
                return;
              }
            }
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
              e.preventDefault();
              setOpen(false);
            }
          }}
          className={`w-full rounded-md bg-transparent px-1.5 py-1 text-[11px] font-semibold outline-none focus:bg-secondary placeholder:font-normal placeholder:text-muted-foreground/50 ${
            err ? "text-destructive ring-1 ring-destructive/60" : ""
          }`}
        />
        {err && <p className="px-1 pt-0.5 text-[9px] font-semibold leading-tight text-destructive">{err}</p>}

        <div className="sr-only" aria-live="polite" role="status">
          {loading && t("খুঁজছি…", "Searching…")}
          {!loading && list.length > 0 && `${list.length} ${t("টি ঔষধ পাওয়া গেছে", "medicines found")}`}
          {failed && t("ঔষধ খোঁজা যায়নি", "Search failed")}
          {!failed && !loading && term.length > 0 && list.length === 0 && t("কিছু পাওয়া যায়নি", "No results found")}
        </div>

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

            {!loading && term.length < 1 && (recent.length > 0 || favorites.length > 0) && (
              <div className="max-h-64 overflow-y-auto">
                {favorites.length > 0 && (
                  <div className="mb-2">
                    <p className="flex items-center justify-between px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/5">
                      <span className="flex items-center gap-1"><Star className="h-2.5 w-2.5 fill-primary" /> {t("প্রিয় ঔষধ", "Favorite Medicines")}</span>
                    </p>
                    {favorites.map((p, i) => (
                      <div key={`fav-${p.id}`} className="group relative">
                        <button
                          type="button"
                          onClick={() => choose(p)}
                          className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-secondary"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-bold">
                              {t.en ? p.en || p.name : p.name} {p.strength}
                            </span>
                          </span>
                        </button>
                        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 group-hover:opacity-100">
                          <button onClick={(e) => showPreview(e, p)} className="p-1 text-muted-foreground hover:text-primary">
                            <Info className="h-3 w-3" />
                          </button>
                          <button onClick={(e) => toggleFavorite(e, p)} className="p-1 text-primary">
                            <Star className="h-3 w-3 fill-primary" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {recent.length > 0 && (
                  <div className="mb-1">
                    <p className="flex items-center justify-between px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span>{t("সম্প্রতি দেখা", "Recently Viewed")}</span>
                      <button 
                        onClick={clearRecent}
                        className="flex items-center gap-0.5 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-2.5 w-2.5" /> {t("মুছুন", "Clear")}
                      </button>
                    </p>
                    {recent.map((p, i) => (
                      <div key={`recent-${p.id}`} className="group relative">
                        <button
                          type="button"
                          onClick={() => choose(p)}
                          onMouseEnter={() => setActive(i)}
                          className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left ${i === active && term.length < 1 ? "bg-secondary" : ""}`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-bold">
                              {t.en ? p.en || p.name : p.name} {p.strength}
                            </span>
                          </span>
                        </button>
                        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 group-hover:opacity-100">
                          <button onClick={(e) => showPreview(e, p)} className="p-1 text-muted-foreground hover:text-primary">
                            <Info className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left group ${i === active ? "bg-secondary" : ""}`}
              >
                <Search className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold">
                    {highlight(t.en ? p.en || p.name : p.name, term)} {p.strength}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {p.generic && (
                      <span className="block truncate">
                        {highlight(p.generic, term)}
                      </span>
                    )}
                    {p.manufacturer && (
                      <span className="block truncate opacity-80">
                        {highlight(p.manufacturer, term)} {p.brand && `(${p.brand})`}
                      </span>
                    )}
                  </span>
                </span>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] font-bold text-primary">৳{Math.round(p.price)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => showPreview(e, p)}
                      className="p-1 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => toggleFavorite(e, p)}
                      className="p-1 hover:text-primary transition-colors"
                    >
                      <Star className={`h-3 w-3 ${favorites.some(f => f.id === p.id) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    </button>
                  </div>
                </div>
              </button>
            ))}
            {failed && !loading && (
              <p className="flex items-center gap-2 px-2 py-2 text-[11px] font-semibold text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> {t("ঔষধ খোঁজা যায়নি—আবার লিখুন", "Search failed—please type again")}
              </p>
            )}
            {!failed && !loading && term.trim().length > 0 && list.length === 0 && (
              <p className="px-2 py-2 text-[11px] text-muted-foreground">{t("কিছু পাওয়া যায়নি", "No match found")}</p>
            )}
          </div>,
          document.body,
        )}
      </div>

      <ProductPreview 
        product={previewProduct}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </>
  );
}
