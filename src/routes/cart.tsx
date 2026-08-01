import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { useStore } from "@/lib/store";
import { useCatalog, deliveryChargeFor } from "@/lib/catalog-db";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "আপনার কার্ট — ঔষধওয়ালা" },
      { name: "description", content: "কার্টে থাকা ঔষধ ও পণ্য দেখুন, পরিমাণ পরিবর্তন করুন এবং চেকআউট করুন।" },
      { property: "og:title", content: "আপনার কার্ট — ঔষধওয়ালা" },
      { property: "og:description", content: "কার্ট দেখে সহজেই অর্ডার সম্পন্ন করুন।" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const t = useT();
  const { cart, setQty, remove, subtotal, discount, clear, couponCode, setCouponCode } = useStore();
  const { offers, products, settings } = useCatalog();
  const stockOf = (id: string, kind: string) =>
    kind === "lab" ? null : (products.find((p) => p.id === id)?.stock ?? null);

  const [coupon, setCoupon] = useState(couponCode ?? "");
  const [invalid, setInvalid] = useState(false);

  const applied = offers.find((o) => o.code === couponCode && subtotal >= o.minOrder) ?? null;
  const couponCut = applied
    ? Math.min(Math.round((subtotal * applied.discountPct) / 100), applied.maxDiscount || Infinity)
    : 0;
  const delivery = deliveryChargeFor(subtotal - couponCut, settings);
  const total = Math.max(0, subtotal - couponCut + delivery);


  if (cart.length === 0) {
    return (
      <div className="pt-16 text-center">
        <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-base font-bold">{t("আপনার কার্ট খালি", "Your cart is empty")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("পছন্দের ঔষধ ও পণ্য যোগ করুন।", "Add your favorite medicines and products.")}</p>
        <Link to="/products" search={{ q: "", category: "all", sort: "popular" }} className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          {t("কেনাকাটা শুরু করুন", "Start shopping")}
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">{t(`আপনার কার্ট (${t.n(cart.length)} আইটেম)`, `Your cart (${t.n(cart.length)} items)`)}</h1>

      <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          {cart.map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-secondary text-lg">
                {l.kind === "lab" ? "🧪" : "💊"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{l.name}</p>
                <p className="text-[11px] text-primary-dark font-bold">{t.money(l.price * l.qty)}</p>
                {stockOf(l.id, l.kind) !== null && l.qty >= (stockOf(l.id, l.kind) as number) && (
                  <p className="text-[10px] font-semibold text-sale">
                    {t(`স্টকে আছে মাত্র ${t.n(stockOf(l.id, l.kind) as number)} টি`, `Only ${t.n(stockOf(l.id, l.kind) as number)} left in stock`)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border px-2 py-1">
                <button onClick={() => setQty(l.id, l.qty - 1)} aria-label={t("কমান", "Decrease")}><Minus className="h-3.5 w-3.5" /></button>
                <span className="text-xs font-bold">{t.n(l.qty)}</span>
                <button
                  disabled={stockOf(l.id, l.kind) !== null && l.qty >= (stockOf(l.id, l.kind) as number)}
                  onClick={() => setQty(l.id, l.qty + 1)}
                  aria-label={t("বাড়ান", "Increase")}
                  className="disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <button onClick={() => remove(l.id)} aria-label={t("মুছুন", "Remove")}><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
            </div>

          ))}
          <button onClick={clear} className="text-xs font-semibold text-muted-foreground underline">
            {t("কার্ট খালি করুন", "Clear cart")}
          </button>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-bold">{t("অর্ডার সারাংশ", "Order summary")}</p>
          <div className="mt-3 flex gap-2">
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder={t("কুপন কোড", "Coupon code")}
              className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
            />
            <button
              onClick={() => {
                const found = offers.find((o) => o.code === coupon);
                if (found && subtotal >= found.minOrder) {
                  setCouponCode(found.code);
                  setInvalid(false);
                } else {
                  setCouponCode(null);
                  setInvalid(true);
                }
              }}
              className="rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
            >
              {t("প্রয়োগ", "Apply")}
            </button>
          </div>
          {applied && <p className="mt-1 text-[11px] font-semibold text-primary">{t(`${applied.code} প্রয়োগ হয়েছে (${t.n(applied.discountPct)}% ছাড়)`, `${applied.code} applied (${t.n(applied.discountPct)}% off)`)}</p>}
          {invalid && !applied && <p className="mt-1 text-[11px] text-destructive">{t("কুপন কোডটি সঠিক নয় বা সর্বনিম্ন অর্ডার পূরণ হয়নি", "Coupon code is invalid or minimum order not met")}</p>}

          <dl className="mt-3 space-y-1.5 text-xs">
            <Row k={t("সাবটোটাল", "Subtotal")} v={t.money(subtotal)} />
            <Row k={t("MRP ছাড়", "MRP discount")} v={`− ${t.money(discount)}`} />
            {couponCut > 0 && <Row k={t("কুপন ছাড়", "Coupon discount")} v={`− ${t.money(couponCut)}`} />}
            <Row k={t("ডেলিভারি চার্জ", "Delivery charge")} v={delivery === 0 ? t("ফ্রি", "Free") : t.money(delivery)} />
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-bold">
              <dt>{t("সর্বমোট", "Total")}</dt>
              <dd className="text-primary-dark">{t.money(total)}</dd>
            </div>
          </dl>

          <Link
            to="/checkout"
            className="mt-4 block rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground"
          >
            {t("চেকআউট করুন", "Checkout")}
          </Link>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">{t(`${t.money(settings.freeDeliveryMin)}+ অর্ডারে ফ্রি ডেলিভারি`, `Free delivery on orders over ${t.money(settings.freeDeliveryMin)}`)}</p>
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  );
}
