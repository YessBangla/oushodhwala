import { createFileRoute, Link } from "@tanstack/react-router";
import { products } from "@/data/catalog";
import { ProductCard } from "@/components/ProductCard";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "উইশলিস্ট — ঔষধওয়ালা" },
      { name: "description", content: "আপনার পছন্দের ঔষধ ও স্বাস্থ্য পণ্যের তালিকা সংরক্ষণ করুন।" },
      { property: "og:title", content: "উইশলিস্ট — ঔষধওয়ালা" },
      { property: "og:description", content: "পছন্দের পণ্য সেভ করে পরে অর্ডার করুন।" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Wishlist,
});

function Wishlist() {
  const { wishlist } = useStore();
  const list = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">উইশলিস্ট</h1>
      {list.length === 0 ? (
        <div className="pt-12 text-center">
          <p className="text-4xl">🤍</p>
          <p className="mt-2 text-xs text-muted-foreground">উইশলিস্ট খালি — পণ্যের হার্ট আইকনে চাপ দিন।</p>
          <Link to="/products" search={{ q: "", category: "all", sort: "popular" }} className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            পণ্য দেখুন
          </Link>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
