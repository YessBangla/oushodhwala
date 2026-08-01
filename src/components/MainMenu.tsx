import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  LayoutGrid,
  FlaskConical,
  Stethoscope,
  Upload,
  Tag,
  LifeBuoy,
  HeartHandshake,
  Store,
  Menu,
  X,
  Phone,
  ShieldCheck,
  Heart,
  FileText,
  User,
  Home as HomeIcon,
  Microscope,
} from "lucide-react";
import { useCatalog } from "@/lib/catalog-db";
import { useLang, pick } from "@/lib/lang";
import { useAuth } from "@/hooks/useAuth";

type Item = { t: string; to: string; icon: typeof Store; search?: Record<string, string> };

function useItems() {
  const { lang } = useLang();
  const en = lang === "en";
  const items: Item[] = [
    { t: en ? "Home" : "হোম", to: "/", icon: HomeIcon },
    { t: en ? "Store" : "স্টোর", to: "/products", icon: Store, search: { q: "", category: "all", sort: "popular" } },
    { t: en ? "Lab Test" : "ল্যাব টেস্ট", to: "/lab-test", icon: FlaskConical },
    { t: en ? "Home Diagnostics" : "বাসায় ডায়াগনস্টিক", to: "/home-diagnostics", icon: Microscope },
    { t: en ? "Home Services" : "হোম সার্ভিস", to: "/home-services", icon: HeartHandshake },
    { t: en ? "Doctors" : "ডাক্তার", to: "/doctor-consultation", icon: Stethoscope },
    { t: en ? "Prescription" : "প্রেসক্রিপশন", to: "/prescription", icon: Upload },
    { t: en ? "Offers" : "অফার", to: "/offers", icon: Tag },
    { t: en ? "Help" : "সহায়তা", to: "/help", icon: LifeBuoy },
  ];
  return items;
}

/** ডেস্কটপ মেনুবার — ক্যাটাগরি মেগা-ড্রপডাউনসহ */
export function DesktopMenu() {
  const { categories } = useCatalog();
  const productCats = categories.filter((c) => c.kind !== "service");
  const serviceCats = categories.filter((c) => c.kind === "service");
  const { lang } = useLang();
  const { isAdmin } = useAuth();
  const en = lang === "en";
  const items = useItems();
  const [openCat, setOpenCat] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setOpenCat(false), [pathname]);

  return (
    <nav className="hidden border-t border-border bg-card lg:block" aria-label={en ? "Main menu" : "প্রধান মেনু"}>
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 text-sm font-semibold">
        <div className="relative" onMouseEnter={() => setOpenCat(true)} onMouseLeave={() => setOpenCat(false)}>
          <button
            aria-expanded={openCat}
            onClick={() => setOpenCat((v) => !v)}
            className="flex items-center gap-1.5 rounded-t-lg bg-primary px-4 py-3 text-primary-foreground"
          >
            <LayoutGrid className="h-4 w-4" />
            {en ? "All Categories" : "সব ক্যাটাগরি"}
            <ChevronDown className={`h-3.5 w-3.5 transition ${openCat ? "rotate-180" : ""}`} />
          </button>
          {openCat && (
            <div className="absolute left-0 top-full z-40 w-[720px] rounded-b-2xl border border-border bg-card p-3 shadow-[var(--shadow-elevated)]">
              <div className="grid grid-cols-3 gap-1">
                {productCats.map((c) => (
                  <Link
                    key={c.slug}
                    to="/category/$slug"
                    params={{ slug: c.slug }}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-navy hover:bg-secondary"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-base">
                      {c.emoji}
                    </span>
                    <span className="truncate">{pick(lang, c.bn, c.en)}</span>
                  </Link>
                ))}
              </div>
              <p className="mt-3 px-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {en ? "Home services" : "হোম সার্ভিস"}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {serviceCats.map((c) => (
                  <Link
                    key={c.slug}
                    to={c.serviceRoute === "/home-diagnostics" ? "/home-diagnostics" : "/home-services"}
                    search={c.serviceRoute === "/home-diagnostics" ? {} : { s: c.slug }}
                    className="rounded-lg bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-primary-dark hover:bg-primary/10"
                  >
                    {c.emoji} {pick(lang, c.bn, c.en)}
                  </Link>
                ))}
              </div>
              <Link
                to="/categories"
                className="mt-2 block rounded-xl bg-secondary py-2 text-center text-[11px] font-bold text-primary"
              >
                {en ? "View all categories" : "সব ক্যাটাগরি দেখুন"}
              </Link>
            </div>
          )}
        </div>

        {items.map((m) => {
          const active = m.to === "/" ? pathname === "/" : pathname.startsWith(m.to);
          const cls = `flex items-center gap-1.5 border-b-2 px-3 py-3 ${
            active ? "border-primary text-primary" : "border-transparent text-navy/80 hover:text-primary"
          }`;
          return m.search ? (
            <Link key={m.t} to={m.to} search={m.search} className={cls}>
              <m.icon className="h-4 w-4" /> {m.t}
            </Link>
          ) : (
            <Link key={m.t} to={m.to} className={cls}>
              <m.icon className="h-4 w-4" /> {m.t}
            </Link>
          );
        })}

        {isAdmin && (
          <Link to="/admin" className="ml-1 rounded-full bg-navy px-3 py-1 text-xs text-navy-foreground">
            {en ? "Admin" : "অ্যাডমিন"}
          </Link>
        )}

        <a href="tel:16700" className="ml-auto flex items-center gap-1.5 text-xs font-bold text-primary">
          <Phone className="h-3.5 w-3.5" /> {en ? "Hotline 16700" : "হটলাইন ১৬৭০০"}
        </a>
      </div>
    </nav>
  );
}

/** মোবাইল হ্যামবার্গার ড্রয়ার মেনু */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { categories } = useCatalog();
  const productCats = categories.filter((c) => c.kind !== "service");
  const serviceCats = categories.filter((c) => c.kind === "service");
  const { lang } = useLang();
  const { isAdmin } = useAuth();
  const en = lang === "en";
  const items = useItems();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const extra: Item[] = [
    { t: en ? "Wishlist" : "উইশলিস্ট", to: "/wishlist", icon: Heart },
    { t: en ? "Orders" : "অর্ডার", to: "/orders", icon: FileText },
    { t: en ? "Account" : "একাউন্ট", to: "/account", icon: User },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={en ? "Open menu" : "মেনু খুলুন"}
        className="text-navy lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[84%] max-w-sm flex-col bg-card shadow-[var(--shadow-elevated)]">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl brand-gradient text-base text-primary-foreground">
                💊
              </span>
              <span className="leading-tight">
                <span className="block font-display text-sm font-extrabold text-navy">ঔষধওয়ালা</span>
                <span className="block text-[9px] font-semibold tracking-[0.18em] text-primary">OUSHODHWALA</span>
              </span>
              <button onClick={() => setOpen(false)} aria-label={en ? "Close" : "বন্ধ"} className="ml-auto text-navy">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              <div className="space-y-1">
                {items.concat(extra).map((m) =>
                  m.search ? (
                    <Link
                      key={m.t}
                      to={m.to}
                      search={m.search}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-navy hover:bg-secondary"
                    >
                      <m.icon className="h-4 w-4 text-primary" /> {m.t}
                    </Link>
                  ) : (
                    <Link
                      key={m.t}
                      to={m.to}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-navy hover:bg-secondary"
                    >
                      <m.icon className="h-4 w-4 text-primary" /> {m.t}
                    </Link>
                  ),
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-3 rounded-xl bg-navy px-3 py-2.5 text-sm font-semibold text-navy-foreground"
                  >
                    <LayoutGrid className="h-4 w-4" /> {en ? "Admin" : "অ্যাডমিন"}
                  </Link>
                )}
              </div>

              <p className="mt-4 px-3 pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {en ? "Categories" : "ক্যাটাগরি"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {productCats.map((c) => (
                  <Link
                    key={c.slug}
                    to="/category/$slug"
                    params={{ slug: c.slug }}
                    className="flex items-center gap-2 rounded-xl border border-border px-2.5 py-2 text-[11px] font-semibold text-navy"
                  >
                    <span className="text-base">{c.emoji}</span>
                    <span className="truncate">{pick(lang, c.bn, c.en)}</span>
                  </Link>
                ))}
              </div>

              <p className="mt-4 px-3 pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {en ? "Home services" : "হোম সার্ভিস"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {serviceCats.map((c) => (
                  <Link
                    key={c.slug}
                    to={c.serviceRoute === "/home-diagnostics" ? "/home-diagnostics" : "/home-services"}
                    search={c.serviceRoute === "/home-diagnostics" ? {} : { s: c.slug }}
                    className="flex items-center gap-2 rounded-xl border border-border px-2.5 py-2 text-[11px] font-semibold text-navy"
                  >
                    <span className="text-base">{c.emoji}</span>
                    <span className="truncate">{pick(lang, c.bn, c.en)}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-border px-4 py-3">
              <a
                href="tel:16700"
                className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground"
              >
                <Phone className="h-4 w-4" /> {en ? "Hotline 16700" : "হটলাইন ১৬৭০০"}
              </a>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-primary" />{" "}
                {en ? "100% authentic medicine" : "১০০% অরিজিনাল ঔষধ"}
              </p>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
