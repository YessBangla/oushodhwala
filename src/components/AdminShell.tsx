import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Pill,
  FolderTree,
  BadgePercent,
  FlaskConical,
  Stethoscope,
  FileText,
  Images,
  ScanSearch,
  History,
  Settings as SettingsIcon,
  Menu,
  X,
  ExternalLink,
  LogOut,
  ChevronRight,
  Search,
  Bell,
  Users,
  Truck,
  HeartPulse,
  UploadCloud,
  Activity,
  Bike,
} from "lucide-react";

export type AdminNavItem = { id: string; t: string; icon: string };
export type AdminNavGroup = { label: string; items: AdminNavItem[] };

const ICONS: Record<string, typeof LayoutDashboard> = {
  dash: LayoutDashboard,
  orders: ShoppingCart,
  inventory: Boxes,
  products: Pill,
  categories: FolderTree,
  offers: BadgePercent,
  lab: FlaskConical,
  doctors: Stethoscope,
  rx: FileText,
  gallery: Images,
  imgaudit: ScanSearch,
  imgrev: History,
  settings: SettingsIcon,
  delivery: Truck,
  diagnostics: HeartPulse,
  riders: Bike,
  imgupload: UploadCloud,
  health: Activity,
  customers: Users,
};

export function AdminShell({
  groups,
  active,
  onSelect,
  title,
  email,
  onSignOut,
  children,
}: {
  groups: AdminNavGroup[];
  active: string;
  onSelect: (id: string) => void;
  title: string;
  email?: string | null | undefined;
  onSignOut?: (() => void) | undefined;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/45">
            {g.label}
          </p>
          <ul className="space-y-1">
            {g.items.map((it) => {
              const Icon = ICONS[it.id] ?? LayoutDashboard;
              const on = active === it.id;
              return (
                <li key={it.id}>
                  <button
                    onClick={() => {
                      onSelect(it.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                      on
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{it.t}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      {/* sidebar — desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-5">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-sidebar-primary text-[13px] font-black text-sidebar-primary-foreground">
            ঔ
          </span>
          <span className="text-sm font-bold text-sidebar-foreground">ঔষধওয়ালা</span>
        </div>
        {nav}
        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <ExternalLink className="h-4 w-4" /> সাইটে ফিরে যান
          </Link>
        </div>
      </aside>

      {/* sidebar — mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
              <span className="text-sm font-bold text-sidebar-foreground">ঔষধওয়ালা</span>
              <button onClick={() => setOpen(false)} className="text-sidebar-foreground/70">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      {/* main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 lg:px-6">
          <button onClick={() => setOpen(true)} className="lg:hidden" aria-label="মেনু">
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden min-w-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
            <span>অ্যাডমিন</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="truncate font-semibold text-foreground">{title}</span>
          </div>
          <div className="relative mx-auto hidden w-full max-w-md md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="অর্ডার, প্রোডাক্ট, কাস্টমার খুঁজুন…"
              className="h-9 w-full rounded-full border border-border bg-secondary/60 pl-9 pr-3 text-xs outline-none focus:border-primary focus:bg-card"
            />
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              className="relative rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary"
              aria-label="নোটিফিকেশন"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sale" />
            </button>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-bold uppercase text-primary-foreground">
                {(email ?? "A").slice(0, 1)}
              </span>
              {email && (
                <span className="max-w-[150px] truncate text-xs text-muted-foreground">
                  {email}
                </span>
              )}
            </div>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary"
                aria-label="লগআউট"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
          <div className="mx-auto max-w-7xl">
            <h1 className="mb-4 text-xl font-black tracking-tight">{title}</h1>
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}
