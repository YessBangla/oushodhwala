import { createFileRoute } from "@tanstack/react-router";
import { useCatalog } from "@/lib/catalog-db";
import { ProductCard } from "@/components/ProductCard";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "অফার ও ক্যাম্পেইন — ঔষধওয়ালা" },
      { name: "description", content: "চলমান ডিসকাউন্ট, কুপন কোড ও ক্যাম্পেইন — ঔষধ ও স্বাস্থ্য পণ্যে সর্বোচ্চ ছাড়।" },
      { property: "og:title", content: "অফার ও ক্যাম্পেইন — ঔষধওয়ালা" },
      { property: "og:description", content: "সর্বোচ্চ ছাড়ে ঔষধ ও স্বাস্থ্য পণ্য কিনুন।" },
    ],
  }),
  component: Offers,
});

function Offers() {
  const t = useT();
  const { products, offers } = useCatalog();
  const deals = [...products]
    .map((p) => ({ p, off: (p.mrp - p.price) / p.mrp }))
    .sort((a, b) => b.off - a.off)
    .slice(0, 12);

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">{t("অফার ও ক্যাম্পেইন", "Offers & campaigns")}</h1>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {offers.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border border-dashed border-primary bg-secondary p-3">
            <span className="text-lg">{c.emoji}</span>
            <span>
              <span className="block text-sm font-bold text-primary-dark">{c.code}</span>
              <span className="block text-[11px] font-semibold">{c.title}</span>
              <span className="block text-[11px] text-muted-foreground">{c.subtitle}</span>
            </span>
          </div>
        ))}
      </div>

      <h2 className="mt-6 text-sm font-bold">{t("সর্বোচ্চ ছাড়ের পণ্য", "Top discounted products")}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {deals.map(({ p, off }) => (
          <div key={p.id}>
            <ProductCard p={p} />
            <p className="mt-1 text-center text-[10px] font-semibold text-sale">{t(`সাশ্রয় ${t.money(p.mrp - p.price)} (${t.n(Math.round(off * 100))}%)`, `Save ${t.money(p.mrp - p.price)} (${t.n(Math.round(off * 100))}%)`)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
