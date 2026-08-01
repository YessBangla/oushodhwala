import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Clock, TrendingUp, Loader2, CornerDownLeft } from "lucide-react";
import { searchProducts } from "@/lib/catalog.functions";
import { ProductImage } from "@/components/ProductImage";
import { useLang, pick } from "@/lib/lang";
import { bn } from "@/data/catalog";

const RECENT_KEY = "ow-recent-search";
const TRENDING = ["নাপা", "প্যারাসিটামল", "ওমিপ্রাজল", "ভিটামিন সি", "প্রেসার মেশিন", "মাস্ক"];

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr.filter((x) => typeof x === "string") as string[]).slice(0, 6) : [];
  } catch {
    return [];
  }
}

export function SearchBox({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const { lang } = useLang();
  const en = lang === "en";
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);


  useEffect(() => setRecent(readRecent()), []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Ctrl/Cmd + K ফোকাস
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const enabled = debounced.length >= 2;
  const { data, isFetching } = useQuery({
    queryKey: ["search-suggest", debounced],
    queryFn: () => searchProducts({ data: { q: debounced, limit: 7 } }),
    enabled,
    staleTime: 60_000,
  });

  const rows = useMemo(() => (enabled ? (data?.rows ?? []) : []), [data, enabled]);

  const saveTerm = (term: string) => {
    const next = [term, ...readRecent().filter((r) => r !== term)].slice(0, 6);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const goSearch = (term: string) => {
    const t = term.trim();
    if (!t) return;
    saveTerm(t);
    setOpen(false);
    setActive(-1);
    navigate({ to: "/products", search: { q: t, category: "all", sort: "popular" } });
  };

  const goProduct = (id: string, term: string) => {
    saveTerm(term);
    setOpen(false);
    setActive(-1);
    navigate({ to: "/product/$id", params: { id } });
  };

  // ফলাফল বদলালে সক্রিয় নির্বাচন রিসেট
  useEffect(() => setActive(-1), [debounced]);

  // সক্রিয় আইটেম সবসময় দৃশ্যমান রাখা
  useEffect(() => {
    if (active < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter") {
      if (active >= 0 && rows[active]) {
        e.preventDefault();
        const r = rows[active]!;
        goProduct(r.id, r.name);
      }
      return; // অন্যথায় ফর্ম সাবমিট → পূর্ণ সার্চ
    }
    if (!rows.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % rows.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a <= 0 ? rows.length - 1 : a - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(rows.length - 1);
    }
  };


  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goSearch(q);
        }}
        role="search"
        className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5 focus-within:border-primary focus-within:bg-card"
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls="search-suggestions"
          aria-autocomplete="list"
          className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          placeholder={en ? "Search medicine, brand or generic..." : "ঔষধ, ব্র্যান্ড বা জেনেরিক খুঁজুন..."}
          aria-label={en ? "Search" : "সার্চ"}
        />
        {isFetching && enabled && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />}
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setDebounced("");
              inputRef.current?.focus();
            }}
            aria-label={en ? "Clear" : "মুছুন"}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          className="hidden shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground sm:block"
        >
          {en ? "Search" : "খুঁজুন"}
        </button>
      </form>

      {open && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-elevated)]"
        >
          {enabled ? (
            rows.length ? (
              <>
                {rows.map((r, i) => (
                  <button
                    key={r.id}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => goProduct(r.id, r.name)}
                    className={`flex w-full items-center gap-3 rounded-xl p-2 text-left ${
                      i === active ? "bg-secondary" : ""
                    }`}
                  >
                    <span className="block h-11 w-11 shrink-0 overflow-hidden rounded-lg">
                      <ProductImage
                        src={r.medicine_image_url || r.image_url}
                        alt={r.name}
                        emoji={r.emoji}
                        ratio="square"
                      />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-navy">{pick(lang, r.name, r.en)}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {[r.strength, r.form, r.brand].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-extrabold text-primary">৳{bn(Number(r.price))}</span>
                  </button>
                ))}
                <button
                  onClick={() => goSearch(q)}
                  className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary py-2.5 text-xs font-bold text-primary"
                >
                  {en ? `See all results for "${debounced}"` : `"${debounced}" এর সব ফলাফল দেখুন`}
                  <CornerDownLeft className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                {isFetching
                  ? en
                    ? "Searching..."
                    : "খোঁজা হচ্ছে..."
                  : en
                    ? "No product found"
                    : "কোনো পণ্য পাওয়া যায়নি"}
              </p>
            )
          ) : (
            <div className="p-1">
              {recent.length > 0 && (
                <>
                  <p className="flex items-center gap-1.5 px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    <Clock className="h-3 w-3" /> {en ? "Recent" : "সাম্প্রতিক"}
                  </p>
                  <div className="mb-2 flex flex-wrap gap-1.5 px-1">
                    {recent.map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setQ(r);
                          goSearch(r);
                        }}
                        className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-navy"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className="flex items-center gap-1.5 px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="h-3 w-3" /> {en ? "Trending" : "জনপ্রিয় সার্চ"}
              </p>
              <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                {TRENDING.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setQ(t);
                      goSearch(t);
                    }}
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-navy hover:border-primary hover:text-primary"
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Link
                to="/categories"
                onClick={() => setOpen(false)}
                className="mt-2 block rounded-xl bg-secondary py-2 text-center text-[11px] font-bold text-primary"
              >
                {en ? "Browse all categories" : "সব ক্যাটাগরি ব্রাউজ করুন"}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
