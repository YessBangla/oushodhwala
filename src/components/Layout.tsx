import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Search,
  ShoppingCart,
  Bell,
  MapPin,
  Home,
  LayoutGrid,
  FileText,
  User,
  Heart,
  ChevronRight,
  FlaskConical,
  Stethoscope,
  Upload,
  Phone,
  ShieldCheck,
  Truck,
  Clock,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/lang";

import { useAuth } from "@/hooks/useAuth";
import { bn } from "@/data/catalog";

export function Layout({ children }: { children: ReactNode }) {
  const { count, addresses, activeAddress, wishlist } = useStore();
  const { lang, setLang } = useLang();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const addr = addresses.find((a) => a.id === activeAddress) ?? addresses[0];

  const en = lang === "en";
  const nav = [
    { icon: Home, t: en ? "Home" : "হোম", to: "/" as const },
    { icon: LayoutGrid, t: en ? "Categories" : "ক্যাটাগরি", to: "/categories" as const },
    { icon: FlaskConical, t: en ? "Lab Test" : "ল্যাব টেস্ট", to: "/lab-test" as const },
    { icon: FileText, t: en ? "Orders" : "অর্ডার", to: "/orders" as const },
    { icon: User, t: en ? "Account" : "একাউন্ট", to: "/account" as const },
  ];

  const menu = [
    { t: en ? "Store" : "স্টোর", to: "/products" as const, search: { q: "", category: "all", sort: "popular" } },
    { t: en ? "Categories" : "ক্যাটাগরি", to: "/categories" as const },
    { t: en ? "Lab Test" : "ল্যাব টেস্ট", to: "/lab-test" as const },
    { t: en ? "Doctors" : "ডাক্তার", to: "/doctor-consultation" as const },
    { t: en ? "Prescription" : "প্রেসক্রিপশন", to: "/prescription" as const },
    { t: en ? "Offers" : "অফার", to: "/offers" as const },
    { t: en ? "Help" : "সহায়তা", to: "/help" as const },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 font-sans">
      {/* Utility strip — corporate trust row */}
      <div className="hidden bg-navy text-navy-foreground lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-2 text-[11px]">
          <span className="flex items-center gap-1.5 opacity-90">
            <ShieldCheck className="h-3.5 w-3.5" /> {en ? "100% authentic medicine" : "১০০% অরিজিনাল ঔষধ"}
          </span>
          <span className="flex items-center gap-1.5 opacity-90">
            <Truck className="h-3.5 w-3.5" /> {en ? "Nationwide delivery" : "সারাদেশে ডেলিভারি"}
          </span>
          <span className="flex items-center gap-1.5 opacity-90">
            <Clock className="h-3.5 w-3.5" /> {en ? "Express in 30–60 min" : "জরুরি ডেলিভারি ৩০–৬০ মিনিট"}
          </span>
          <a href="tel:16700" className="ml-auto flex items-center gap-1.5 font-semibold">
            <Phone className="h-3.5 w-3.5" /> {en ? "Hotline 16700" : "হটলাইন ১৬৭০০"}
          </a>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 lg:flex lg:gap-6">
            <Link to="/" className="flex min-w-0 items-center gap-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl brand-gradient text-lg text-primary-foreground">
                💊
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate font-display text-base font-extrabold text-navy">ঔষধওয়ালা</span>
                <span className="block text-[10px] font-semibold tracking-[0.18em] text-primary">OUSHODHWALA</span>
              </span>
            </Link>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/products", search: { q, category: "all", sort: "popular" } });
              }}
              className="order-3 col-span-2 flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5 focus-within:border-primary focus-within:bg-card lg:order-none lg:col-auto lg:min-w-0 lg:flex-1"
            >
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                placeholder={en ? "Search medicine, brand or generic..." : "ঔষধ, ব্র্যান্ড বা জেনেরিক খুঁজুন..."}
                aria-label={en ? "Search" : "সার্চ"}
              />
              <button
                type="submit"
                className="hidden shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground sm:block"
              >
                {en ? "Search" : "খুঁজুন"}
              </button>
            </form>

            <div className="flex shrink-0 items-center gap-4">
              <div
                className="flex items-center rounded-full bg-muted p-0.5 text-[11px] font-bold"
                role="group"
                aria-label="ভাষা / Language"
              >
                {(["bn", "en"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    aria-pressed={lang === l}
                    className={`rounded-full px-2 py-1 ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {l === "bn" ? "বাংলা" : "EN"}
                  </button>
                ))}
              </div>

              <Link to="/wishlist" className="relative text-navy" aria-label="উইশলিস্ট">
                <Heart className="h-5 w-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-sale text-[10px] font-bold text-sale-foreground">
                    {bn(wishlist.length)}
                  </span>
                )}
              </Link>
              <Link to="/notifications" className="text-navy" aria-label="নোটিফিকেশন">
                <Bell className="h-5 w-5" />
              </Link>
              <Link to="/cart" className="relative text-navy" aria-label="কার্ট">
                <ShoppingCart className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-sale text-[10px] font-bold text-sale-foreground">
                    {bn(count)}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        <nav className="hidden border-t border-border bg-card lg:block">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-2.5 text-sm font-semibold">
            {menu.map((m) =>
              m.search ? (
                <Link key={m.t} to={m.to} search={m.search} className="text-navy/80 hover:text-primary">
                  {m.t}
                </Link>
              ) : (
                <Link key={m.t} to={m.to} className="text-navy/80 hover:text-primary">
                  {m.t}
                </Link>
              ),
            )}
            {isAdmin && (
              <Link to="/admin" className="rounded-full bg-navy px-3 py-1 text-xs text-navy-foreground">
                {en ? "Admin" : "অ্যাডমিন"}
              </Link>
            )}
            <Link to="/account" className="ml-auto flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {en ? "Deliver to" : "ডেলিভারি"}: {addr ? addr.area : en ? "Add address" : "ঠিকানা যোগ করুন"}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>

        <Link
          to="/account"
          className="flex items-center gap-1 border-t border-border bg-muted px-4 py-1.5 text-[11px] text-muted-foreground lg:hidden"
        >
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span className="truncate">
            {en ? "Deliver to" : "ডেলিভারি"}: {addr ? addr.area : en ? "Add address" : "ঠিকানা যোগ করুন"}
          </span>
          <ChevronRight className="ml-auto h-3.5 w-3.5" />
        </Link>
      </header>

      <main className="mx-auto max-w-7xl px-4">{children}</main>

      <footer className="mt-12 bg-navy text-navy-foreground">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-display text-base font-extrabold">ঔষধওয়ালা · Oushodhwala</p>
              <p className="mt-2 text-xs leading-relaxed opacity-75">
                বাংলাদেশের বিশ্বস্ত অনলাইন ফার্মেসি — ১০০% অরিজিনাল ঔষধ, লাইসেন্সপ্রাপ্ত ফার্মাসিস্টের তত্ত্বাবধানে, ঘরে বসে।
              </p>
              <a href="tel:16700" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
                <Phone className="h-3.5 w-3.5" /> হটলাইন ১৬৭০০ (২৪/৭)
              </a>
            </div>
            <div className="text-xs">
              <p className="mb-3 font-display text-sm font-bold">সেবা</p>
              <ul className="space-y-2 opacity-75">
                <li><Link to="/prescription" className="hover:opacity-100">প্রেসক্রিপশন আপলোড</Link></li>
                <li><Link to="/lab-test" className="hover:opacity-100">ল্যাব টেস্ট</Link></li>
                <li><Link to="/doctor-consultation" className="hover:opacity-100">ডাক্তার পরামর্শ</Link></li>
                <li><Link to="/offers" className="hover:opacity-100">অফার ও ক্যাম্পেইন</Link></li>
              </ul>
            </div>
            <div className="text-xs">
              <p className="mb-3 font-display text-sm font-bold">কোম্পানি</p>
              <ul className="space-y-2 opacity-75">
                <li><Link to="/about" className="hover:opacity-100">আমাদের সম্পর্কে</Link></li>
                <li><Link to="/help" className="hover:opacity-100">সহায়তা ও FAQ</Link></li>
                <li><Link to="/orders" className="hover:opacity-100">অর্ডার ট্র্যাকিং</Link></li>
                <li><Link to="/account" className="hover:opacity-100">একাউন্ট</Link></li>
              </ul>
            </div>
            <div className="text-xs">
              <p className="mb-3 font-display text-sm font-bold">পেমেন্ট ও নিরাপত্তা</p>
              <div className="flex flex-wrap gap-2">
                {["bKash", "Nagad", "Card", "COD"].map((p) => (
                  <span key={p} className="rounded-md bg-navy-foreground/10 px-2.5 py-1.5 font-semibold">
                    {p}
                  </span>
                ))}
              </div>
              <p className="mt-3 flex items-center gap-1.5 opacity-75">
                <ShieldCheck className="h-3.5 w-3.5" /> SSL সুরক্ষিত পেমেন্ট
              </p>
            </div>
          </div>
          <p className="mt-8 border-t border-navy-foreground/15 pt-4 text-center text-[10px] opacity-60">
            © ২০২৬ Oushodhwala Ltd. সর্বস্বত্ব সংরক্ষিত। DGDA লাইসেন্সপ্রাপ্ত ফার্মেসি পার্টনার।
          </p>
        </div>
      </footer>

      <Link
        to="/prescription"
        className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-elevated)]"
      >
        <Upload className="h-4 w-4" /> প্রেসক্রিপশন
      </Link>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-around px-2 py-2">
          {nav.map(({ icon: Icon, t, to }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={t}
                to={to}
                className={`flex flex-col items-center gap-0.5 px-3 ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold">{t}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function SectionTitle({ title, to, label }: { title: string; to?: string; label?: string }) {
  return (
    <div className="mb-4 flex items-end">
      <div className="min-w-0">
        <h2 className="truncate font-display text-lg font-extrabold text-navy">{title}</h2>
        <span className="mt-1 block h-1 w-10 rounded-full bg-primary" />
      </div>
      {to && (
        <Link to={to} className="ml-auto flex shrink-0 items-center text-xs font-semibold text-primary">
          {label ?? "সব দেখুন"} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export { Stethoscope };
