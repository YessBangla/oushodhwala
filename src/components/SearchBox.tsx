import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Clock, TrendingUp, Loader2, CornerDownLeft, HomeIcon, RefreshCw } from "lucide-react";
import { searchProducts } from "@/lib/catalog.functions";
import { ProductImage } from "@/components/ProductImage";
import { useLang, pick } from "@/lib/lang";
import { useCatalog } from "@/lib/catalog-db";
import { matchesQuery } from "@/lib/bn-search";
import { bn } from "@/data/catalog";

type Scope = "all" | "product" | "service";

/** সার্চ টার্মের সাথে মিলের মাত্রা — কম স্কোর = বেশি প্রাসঙ্গিক */
function relevance(term: string, ...fields: (string | null | undefined)[]) {
  const q = term.trim().toLowerCase();
  let best = 99;
  fields.forEach((f, i) => {
    const v = (f ?? "").toLowerCase();
    if (!v || !q) return;
    if (v === q) best = Math.min(best, 0 + i * 0.1);
    else if (v.startsWith(q)) best = Math.min(best, 1 + i * 0.1);
    else if (v.includes(q)) best = Math.min(best, 2 + i * 0.1);
  });
  return best;
}

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

  const [scope, setScope] = useState<Scope>("all");
  const { categories } = useCatalog();

  const enabled = debounced.length >= 2;
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["search-suggest", debounced],
    queryFn: () => searchProducts({ data: { q: debounced, limit: 10 } }),
    enabled: enabled && scope !== "service",
    staleTime: 60_000,
    retry: 1,
  });
  const showSkeleton = isFetching && !data;

  const rows = useMemo(() => {
    if (!enabled || scope === "service") return [];
    const list = [...(data?.rows ?? [])];
    list.sort(
      (a, b) =>
        relevance(debounced, a.name, a.en, a.brand, a.generic) - relevance(debounced, b.name, b.en, b.brand, b.generic),
    );
    return list.slice(0, 7);
  }, [data, enabled, debounced, scope]);

  const services = useMemo(() => {
    if (!enabled || scope === "product") return [];
    return categories
      .filter((c) => c.kind === "service")
      .filter((c) => matchesQuery(debounced, c.bn, c.en, c.desc, c.descEn, c.slug))
      .sort((a, b) => relevance(debounced, a.bn, a.en) - relevance(debounced, b.bn, b.en))
      .slice(0, 4);
  }, [categories, debounced, enabled, scope]);


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

  const goService = (slug: string, route: string, term: string) => {
    saveTerm(term);
    setOpen(false);
    setActive(-1);
    if (route === "/home-diagnostics") void navigate({ to: "/home-diagnostics" });
    else void navigate({ to: "/home-services", search: { s: slug } });
  };

  const total = rows.length + services.length;
  const openOption = (i: number) => {
    if (i < rows.length) {
      const r = rows[i]!;
      goProduct(r.id, r.name);
    } else {
      const s = services[i - rows.length]!;
      goService(s.slug, s.serviceRoute, s.bn);
    }
  };

  // ফলাফল বদলালে সক্রিয় নির্বাচন রিসেট
  useEffect(() => setActive(-1), [debounced, scope]);


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
      if (active >= 0 && active < total) {
        e.preventDefault();
        openOption(active);
      }
      return; // অন্যথায় ফর্ম সাবমিট → পূর্ণ সার্চ
    }
    if (!total) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % total);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a <= 0 ? total - 1 : a - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(total - 1);
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
        className="flex items-center gap-2 rounded-full border border-border bg-muted py-1.5 pl-3.5 pr-1.5 shadow-sm transition focus-within:border-primary focus-within:bg-card focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_18%,transparent)] sm:gap-2.5"
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
          aria-activedescendant={active >= 0 ? `search-opt-${active}` : undefined}
          aria-autocomplete="list"
          enterKeyHint="search"
          className="h-9 w-full min-w-0 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
          placeholder={en ? "Search medicine, brand or generic..." : "ঔষধ, ব্র্যান্ড বা জেনেরিক খুঁজুন..."}
          aria-label={en ? "Search" : "সার্চ"}
        />
        {isFetching && enabled && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />}
        <span className="sr-only" role="status" aria-live="polite">
          {enabled && isFetching ? (en ? "Searching" : "খোঁজা হচ্ছে") : ""}
        </span>
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setDebounced("");
              inputRef.current?.focus();
            }}
            aria-label={en ? "Clear" : "মুছুন"}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          className="hidden h-9 shrink-0 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground transition hover:opacity-90 sm:block"
        >
          {en ? "Search" : "খুঁজুন"}
        </button>
      </form>

      {open && (
        <div
          ref={listRef}
          id="search-suggestions"
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[65vh] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-elevated)]"
        >
          <div className="mb-1.5 flex gap-1.5 px-1">
            {(
              [
                ["all", en ? "All" : "সব"],
                ["product", en ? "Medicine & products" : "ঔষধ ও পণ্য"],
                ["service", en ? "Home services" : "হোম সার্ভিস"],
              ] as [Scope, string][]
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setScope(v)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  scope === v ? "bg-primary text-primary-foreground" : "bg-muted text-navy"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {enabled ? (
            total ? (
              <>
                {rows.length > 0 && (
                  <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {en ? "Medicine & products" : "ঔষধ ও পণ্য"}
                  </p>
                )}
                {rows.map((r, i) => (
                  <button
                    key={r.id}
                    id={`search-opt-${i}`}
                    data-idx={i}
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

                {services.length > 0 && (
                  <p className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {en ? "Home services" : "হোম সার্ভিস"}
                  </p>
                )}
                {services.map((s, j) => {
                  const i = rows.length + j;
                  return (
                    <button
                      key={s.slug}
                      id={`search-opt-${i}`}
                      data-idx={i}
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => goService(s.slug, s.serviceRoute, s.bn)}
                      className={`flex w-full items-center gap-3 rounded-xl p-2 text-left ${
                        i === active ? "bg-secondary" : ""
                      }`}
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-lg">
                        {s.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-navy">{pick(lang, s.bn, s.en)}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {pick(lang, s.eta, s.etaEn) || pick(lang, s.desc, s.descEn)}
                        </span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-primary">
                        <HomeIcon className="h-3 w-3" /> {en ? "Book" : "বুক"}
                      </span>
                    </button>
                  );
                })}

                {scope !== "service" && (
                  <button
                    onClick={() => goSearch(q)}
                    className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary py-2.5 text-xs font-bold text-primary"
                  >
                    {en ? `See all results for "${debounced}"` : `"${debounced}" এর সব ফলাফল দেখুন`}
                    <CornerDownLeft className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            ) : isError && scope !== "service" ? (
              <div className="px-3 py-6 text-center">
                <p className="text-xs font-semibold text-sale">
                  {en ? "Search failed. Please check your connection." : "সার্চ ব্যর্থ হয়েছে। ইন্টারনেট সংযোগ দেখুন।"}
                </p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-[11px] font-bold text-primary"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> {en ? "Try again" : "আবার চেষ্টা করুন"}
                </button>
              </div>
            ) : showSkeleton ? (
              <div className="space-y-1.5 p-1" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl p-2">
                    <span className="h-11 w-11 shrink-0 animate-pulse rounded-lg bg-muted" />
                    <span className="min-w-0 flex-1 space-y-1.5">
                      <span className="block h-2.5 w-3/5 animate-pulse rounded bg-muted" />
                      <span className="block h-2 w-2/5 animate-pulse rounded bg-muted" />
                    </span>
                    <span className="h-2.5 w-10 shrink-0 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
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
