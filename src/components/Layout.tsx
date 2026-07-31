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
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { bn } from "@/data/catalog";

export function Layout({ children }: { children: ReactNode }) {
  const { count, addresses, activeAddress, wishlist } = useStore();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const addr = addresses.find((a) => a.id === activeAddress) ?? addresses[0];

  const nav = [
    { icon: Home, t: "হোম", to: "/" as const },
    { icon: LayoutGrid, t: "ক্যাটাগরি", to: "/categories" as const },
    { icon: FlaskConical, t: "ল্যাব টেস্ট", to: "/lab-test" as const },
    { icon: FileText, t: "অর্ডার", to: "/orders" as const },
    { icon: User, t: "একাউন্ট", to: "/account" as const },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 font-sans">
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 pt-3 pb-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-foreground/15 text-lg">💊</span>
              <span className="leading-tight">
                <span className="block text-base font-bold">ঔষধওয়ালা</span>
                <span className="block text-[10px] tracking-wide opacity-80">OUSHODHWALA</span>
              </span>
            </Link>

            <nav className="ml-6 hidden items-center gap-5 text-sm font-medium lg:flex">
              <Link to="/products" className="hover:underline">স্টোর</Link>
              <Link to="/categories" className="hover:underline">ক্যাটাগরি</Link>
              <Link to="/lab-test" className="hover:underline">ল্যাব টেস্ট</Link>
              <Link to="/doctor-consultation" className="hover:underline">ডাক্তার</Link>
              <Link to="/offers" className="hover:underline">অফার</Link>
              <Link to="/help" className="hover:underline">সহায়তা</Link>
              {isAdmin && <Link to="/admin" className="rounded-full bg-primary-foreground/15 px-2.5 py-1 hover:underline">অ্যাডমিন</Link>}
            </nav>

            <div className="ml-auto flex items-center gap-4">
              <Link to="/wishlist" className="relative" aria-label="উইশলিস্ট">
                <Heart className="h-5 w-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-sale text-[10px] font-bold text-sale-foreground">
                    {bn(wishlist.length)}
                  </span>
                )}
              </Link>
              <Link to="/notifications" aria-label="নোটিফিকেশন">
                <Bell className="h-5 w-5" />
              </Link>
              <Link to="/cart" className="relative" aria-label="কার্ট">
                <ShoppingCart className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-sale text-[10px] font-bold text-sale-foreground">
                    {bn(count)}
                  </span>
                )}
              </Link>
            </div>
          </div>

          <Link to="/account" className="mt-3 flex items-center gap-1 text-xs opacity-90">
            <MapPin className="h-3.5 w-3.5" />
            <span>ডেলিভারি: {addr ? addr.area : "ঠিকানা যোগ করুন"}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/products", search: { q, category: "all", sort: "popular" } });
            }}
            className="mt-3 flex items-center gap-2 rounded-lg bg-card px-3 py-2.5 shadow-[var(--shadow-card)]"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="ঔষধ, ব্র্যান্ড বা জেনেরিক খুঁজুন..."
              aria-label="সার্চ"
            />
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">{children}</main>

      <footer className="mx-auto mt-10 max-w-6xl px-4">
        <div className="rounded-t-xl border border-border bg-card p-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <p className="text-sm font-bold">ঔষধওয়ালা · Oushodhwala</p>
              <p className="mt-1 text-xs text-muted-foreground">
                বাংলাদেশের বিশ্বস্ত অনলাইন ফার্মেসি — ১০০% অরিজিনাল ঔষধ, ঘরে বসে।
              </p>
              <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
                <Phone className="h-3.5 w-3.5" /> ১৬৭xx (২৪/৭)
              </p>
            </div>
            <div className="text-xs">
              <p className="mb-2 font-semibold">সেবা</p>
              <ul className="space-y-1 text-muted-foreground">
                <li><Link to="/prescription" className="hover:text-primary">প্রেসক্রিপশন আপলোড</Link></li>
                <li><Link to="/lab-test" className="hover:text-primary">ল্যাব টেস্ট</Link></li>
                <li><Link to="/doctor-consultation" className="hover:text-primary">ডাক্তার পরামর্শ</Link></li>
                <li><Link to="/offers" className="hover:text-primary">অফার ও ক্যাম্পেইন</Link></li>
              </ul>
            </div>
            <div className="text-xs">
              <p className="mb-2 font-semibold">কোম্পানি</p>
              <ul className="space-y-1 text-muted-foreground">
                <li><Link to="/about" className="hover:text-primary">আমাদের সম্পর্কে</Link></li>
                <li><Link to="/help" className="hover:text-primary">সহায়তা ও FAQ</Link></li>
                <li><Link to="/orders" className="hover:text-primary">অর্ডার ট্র্যাকিং</Link></li>
                <li><Link to="/account" className="hover:text-primary">একাউন্ট</Link></li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-center text-[10px] text-muted-foreground">© ২০২৬ Oushodhwala Ltd. সর্বস্বত্ব সংরক্ষিত।</p>
        </div>
      </footer>

      <Link
        to="/prescription"
        className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground shadow-lg"
      >
        <Upload className="h-4 w-4" /> প্রেসক্রিপশন
      </Link>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card">
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
    <div className="mb-3 flex items-center">
      <h2 className="text-sm font-bold">{title}</h2>
      {to && (
        <Link to={to} className="ml-auto flex items-center text-xs font-semibold text-primary">
          {label ?? "সব দেখুন"} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export { Stethoscope };
