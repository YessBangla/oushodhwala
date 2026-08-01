import { Link } from "@tanstack/react-router";
import { Heart, Plus, Minus } from "lucide-react";
import { type Product } from "@/data/catalog";
import { useStore, toLine } from "@/lib/store";
import { ProductImage } from "@/components/ProductImage";
import { useT } from "@/lib/i18n";
import { useLang, pick } from "@/lib/lang";

export function ProductCard({ p }: { p: Product & { stock?: number; lowStock?: number; image?: string; en?: string } }) {
  const { cart, add, setQty, wishlist, toggleWish } = useStore();
  const t = useT();
  const { lang } = useLang();
  const line = cart.find((l) => l.id === p.id);
  const off = Math.round(((p.mrp - p.price) / p.mrp) * 100);
  const stock = p.stock ?? Infinity;
  const soldOut = stock <= 0;
  const low = !soldOut && stock <= (p.lowStock ?? 0);
  const displayName = pick(lang, p.name, p.en);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:border-primary/50 hover:shadow-[var(--shadow-elevated)]">
      <Link to="/product/$id" params={{ id: p.id }} className="relative block shrink-0 overflow-hidden">
        <ProductImage src={p.image} alt={displayName} emoji={p.emoji} ratio="card" />


        {off > 0 && (
          <span className="absolute left-2 top-2 rounded bg-sale px-1.5 py-0.5 text-[10px] font-bold text-sale-foreground">
            {t.n(off)}% OFF
          </span>
        )}
        {soldOut && (
          <span className="absolute inset-0 grid place-items-center bg-background/70 text-[11px] font-bold text-sale">
            {t("স্টক শেষ", "Out of stock")}
          </span>
        )}
        {p.rx && (
          <span className="absolute right-2 top-2 rounded bg-primary-dark px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
            Rx
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-start gap-1">
          <Link
            to="/product/$id"
            params={{ id: p.id }}
            className="line-clamp-2 min-w-0 text-xs font-bold leading-snug text-navy"
          >
            {displayName}
          </Link>
          <button onClick={() => toggleWish(p.id)} aria-label={t("উইশলিস্ট", "Wishlist")} className="ml-auto shrink-0">
            <Heart
              className={`h-3.5 w-3.5 ${wishlist.includes(p.id) ? "fill-current text-sale" : "text-muted-foreground"}`}
            />
          </button>
        </div>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {p.form} · {p.pack}
        </p>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-display text-base font-extrabold text-primary">{t.money(p.price)}</span>
          {p.mrp > p.price && (
            <span className="text-[10px] text-muted-foreground line-through">{t.money(p.mrp)}</span>
          )}
        </div>

        {low && <p className="mt-1 text-[10px] font-semibold text-sale">{t(`মাত্র ${t.n(stock)} টি বাকি`, `Only ${t.n(stock)} left`)}</p>}
        {soldOut ? (
          <button disabled className="mt-2 rounded-lg bg-muted py-1.5 text-[11px] font-semibold text-muted-foreground">
            {t("স্টক শেষ", "Out of stock")}
          </button>
        ) : line ? (
          <div className="mt-2 flex items-center justify-between rounded-xl bg-primary px-2 py-1.5 text-primary-foreground">
            <button onClick={() => setQty(p.id, line.qty - 1)} aria-label={t("কমান", "Decrease")}>
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] font-bold">{t.n(line.qty)}</span>
            <button
              disabled={line.qty >= stock}
              onClick={() => setQty(p.id, line.qty + 1)}
              aria-label={t("বাড়ান", "Increase")}
              className="disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => add(toLine(p))}
            className="mt-2 rounded-xl bg-primary py-2 text-[11px] font-bold text-primary-foreground transition hover:bg-primary-dark"
          >
            {t("কার্টে যোগ করুন", "Add to cart")}
          </button>
        )}
      </div>
    </article>
  );
}
