import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
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
import { useT } from "@/lib/i18n";
import { SearchBox } from "@/components/SearchBox";
import { DesktopMenu, MobileMenu } from "@/components/MainMenu";
import { DeliverToBar } from "@/components/DeliverToBar";
import { BackToTop } from "@/components/BackToTop";
import { AskChat } from "@/components/AskChat";
import { BrandLogo } from "@/components/BrandLogo";
import { AccountMenu } from "@/components/AccountMenu";
import { installErrorLogger } from "@/lib/error-log";


export function Layout({ children }: { children: ReactNode }) {
  const { count, addresses, activeAddress, wishlist } = useStore();
  const { lang, setLang } = useLang();
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const addr = addresses.find((a) => a.id === activeAddress) ?? addresses[0];

  useEffect(() => { installErrorLogger(); }, []);

  const en = lang === "en";

  const nav = [
    { icon: Home, t: t("হোম", "Home"), to: "/" as const },
    { icon: LayoutGrid, t: t("ক্যাটাগরি", "Categories"), to: "/categories" as const },
    { icon: FlaskConical, t: t("ল্যাব টেস্ট", "Lab Test"), to: "/lab-test" as const },
    { icon: FileText, t: t("অর্ডার", "Orders"), to: "/orders" as const },
    { icon: User, t: t("একাউন্ট", "Account"), to: "/account" as const },
  ];

  // ফর্ম-ভিত্তিক পেজে ভাসমান বোতাম লুকানো — ইনপুট ঢেকে না ফেলে
  const hideFab = [
    "/prescription",
    "/checkout",
    "/cart",
    "/auth",
    "/home-services",
    "/home-diagnostics",
    "/delivery",
    "/admin",
    "/book-doctor",
    "/consultation",
    "/account",
  ].some((p) => pathname.startsWith(p));


  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Utility strip — corporate trust row */}
      <div className="hidden bg-navy text-navy-foreground lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-2 text-[11px]">
          <span className="flex items-center gap-1.5 opacity-90">
            <ShieldCheck className="h-3.5 w-3.5" /> {t("১০০% অরিজিনাল ঔষধ", "100% authentic medicine")}
          </span>
          <span className="flex items-center gap-1.5 opacity-90">
            <Truck className="h-3.5 w-3.5" /> {t("সারাদেশে ডেলিভারি", "Nationwide delivery")}
          </span>
          <span className="flex items-center gap-1.5 opacity-90">
            <Clock className="h-3.5 w-3.5" /> {t("জরুরি ডেলিভারি ৩০–৬০ মিনিট", "Express in 30–60 min")}
          </span>
          <a href="tel:16700" className="ml-auto flex items-center gap-1.5 font-semibold">
            <Phone className="h-3.5 w-3.5" /> {t("হটলাইন ১৬৭০০", "Hotline 16700")}
          </a>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 lg:flex lg:gap-6">
            <MobileMenu />
            <Link to="/" className="flex min-w-0 items-center" aria-label={t("ঔষধওয়ালা", "Oushodhwala")}>
              <BrandLogo size={40} bn={t("ঔষধওয়ালা", "Oushodhwala")} eager />
            </Link>

            <SearchBox className="order-3 col-span-3 lg:order-none lg:min-w-0 lg:flex-1" />

            <div className="flex shrink-0 items-center gap-3">
              <DeliverToBar />
              <div
                className="flex items-center rounded-full bg-muted p-0.5 text-[11px] font-bold"
                role="group"
                aria-label={t("ভাষা", "Language")}
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


              <Link to="/wishlist" className="relative hidden text-navy sm:block" aria-label={t("উইশলিস্ট", "Wishlist")}>
                <Heart className="h-5 w-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-sale text-[10px] font-bold text-sale-foreground">
                    {t.n(wishlist.length)}
                  </span>
                )}
              </Link>
              <Link to="/notifications" className="hidden text-navy sm:block" aria-label={t("নোটিফিকেশন", "Notifications")}>
                <Bell className="h-5 w-5" />
              </Link>
              <Link to="/cart" className="relative text-navy" aria-label={t("কার্ট", "Cart")}>
                <ShoppingCart className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-sale text-[10px] font-bold text-sale-foreground">
                    {t.n(count)}
                  </span>
                )}
              </Link>
              <AccountMenu />
            </div>
          </div>
        </div>

        <DesktopMenu />
      </header>

      <main className="mx-auto max-w-7xl px-4">{children}</main>

      <BackToTop />
      <AskChat />


      <footer className="mt-12 bg-navy text-navy-foreground">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <BrandLogo size={44} tone="light" bn={t("ঔষধওয়ালা", "Oushodhwala")} />
              <p className="mt-2 text-xs leading-relaxed opacity-75">
                {t(
                  "বাংলাদেশের বিশ্বস্ত অনলাইন ফার্মেসি — ১০০% অরিজিনাল ঔষধ, লাইসেন্সপ্রাপ্ত ফার্মাসিস্টের তত্ত্বাবধানে, ঘরে বসে।",
                  "Bangladesh's trusted online pharmacy — 100% authentic medicine, overseen by licensed pharmacists, delivered to your door."
                )}
              </p>
              <a href="tel:16700" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
                <Phone className="h-3.5 w-3.5" /> {t("হটলাইন ১৬৭০০ (২৪/৭)", "Hotline 16700 (24/7)")}
              </a>
            </div>
            <div className="text-xs">
              <p className="mb-3 font-display text-sm font-bold">{t("সেবা", "Services")}</p>
              <ul className="space-y-2 opacity-75">
                <li><Link to="/prescription" className="hover:opacity-100">{t("প্রেসক্রিপশন আপলোড", "Upload prescription")}</Link></li>
                <li><Link to="/lab-test" className="hover:opacity-100">{t("ল্যাব টেস্ট", "Lab test")}</Link></li>
                <li><Link to="/doctor-consultation" className="hover:opacity-100">{t("ডাক্তার পরামর্শ", "Doctor consultation")}</Link></li>
                <li><Link to="/offers" className="hover:opacity-100">{t("অফার ও ক্যাম্পেইন", "Offers & campaigns")}</Link></li>
              </ul>
            </div>
            <div className="text-xs">
              <p className="mb-3 font-display text-sm font-bold">{t("কোম্পানি", "Company")}</p>
              <ul className="space-y-2 opacity-75">
                <li><Link to="/about" className="hover:opacity-100">{t("আমাদের সম্পর্কে", "About us")}</Link></li>
                <li><Link to="/contact" className="hover:opacity-100">{t("যোগাযোগ", "Contact us")}</Link></li>
                <li><Link to="/help" className="hover:opacity-100">{t("সহায়তা ও FAQ", "Help & FAQ")}</Link></li>
                <li><Link to="/orders" className="hover:opacity-100">{t("অর্ডার ট্র্যাকিং", "Order tracking")}</Link></li>
                <li><Link to="/privacy" className="hover:opacity-100">{t("গোপনীয়তা নীতি", "Privacy policy")}</Link></li>
                <li><Link to="/terms" className="hover:opacity-100">{t("শর্তাবলী", "Terms of service")}</Link></li>
                <li><Link to="/refund-policy" className="hover:opacity-100">{t("রিটার্ন ও রিফান্ড", "Return & refund")}</Link></li>
              </ul>
            </div>

            <div className="text-xs">
              <p className="mb-3 font-display text-sm font-bold">{t("পেমেন্ট ও নিরাপত্তা", "Payment & security")}</p>
              <div className="flex flex-wrap gap-2">
                {["bKash", "Nagad", "Card", "COD"].map((p) => (
                  <span key={p} className="rounded-md bg-navy-foreground/10 px-2.5 py-1.5 font-semibold">
                    {p}
                  </span>
                ))}
              </div>
              <p className="mt-3 flex items-center gap-1.5 opacity-75">
                <ShieldCheck className="h-3.5 w-3.5" /> {t("SSL সুরক্ষিত পেমেন্ট", "SSL secured payment")}
              </p>
            </div>
          </div>
          <p className="mt-8 border-t border-navy-foreground/15 pt-4 text-center text-[10px] opacity-60">
            {t(
              "ঔষধওয়ালা — Shondhaan-এর একটি অংশ · Shondhaan, Yess Bangla Private Limited-এর একটি সিস্টার কনসার্ন",
              "Oushodhwala — a part of Shondhaan · Shondhaan, a sister concern of Yess Bangla Private Limited",
            )}
            <br />
            {t("© ২০২৬ সর্বস্বত্ব সংরক্ষিত। DGDA লাইসেন্সপ্রাপ্ত ফার্মেসি পার্টনার।", "© 2026 All rights reserved. DGDA licensed pharmacy partner.")}
          </p>
        </div>
      </footer>

      {!hideFab && (
        <Link
          to="/prescription"
          aria-label={t("প্রেসক্রিপশন আপলোড", "Upload prescription")}
          className="fixed bottom-24 right-4 z-20 flex items-center gap-2 rounded-full bg-primary p-3.5 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-elevated)] sm:px-4 sm:py-3 lg:bottom-6"
        >
          <Upload className="h-4 w-4" /> <span className="hidden sm:inline">{t("প্রেসক্রিপশন", "Prescription")}</span>
        </Link>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-around px-2 py-2">
          {nav.map(({ icon: Icon, t: label, to }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={label}
                to={to}
                className={`flex flex-col items-center gap-0.5 px-3 ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold">{label}</span>
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
          {label ?? "See all"} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export { Stethoscope };
