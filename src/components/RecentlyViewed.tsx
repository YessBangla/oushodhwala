import { SectionTitle } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { useCatalog } from "@/lib/catalog-db";
import { useT } from "@/lib/i18n";
import { clearRecent, useRecent } from "@/lib/recent";

export function RecentlyViewed({ excludeId, limit = 8 }: { excludeId?: string; limit?: number }) {
  const t = useT();
  const ids = useRecent();
  const { products } = useCatalog();

  const list = ids
    .filter((id) => id !== excludeId)
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, limit);

  if (list.length === 0) return null;

  return (
    <section className="pt-8">
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <SectionTitle title={t("সম্প্রতি দেখা পণ্য", "Recently viewed")} />
        </div>
        <button
          onClick={clearRecent}
          className="mb-4 shrink-0 text-xs font-semibold text-muted-foreground hover:text-sale"
        >
          {t("মুছুন", "Clear")}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
