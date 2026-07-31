import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { bn } from "@/data/catalog";
import { useCatalog } from "@/lib/catalog-db";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/category/$slug")({
  loader: ({ params }) => {
    const cat = categories.find((c) => c.slug === params.slug);
    if (!cat) throw notFound();
    return { cat };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "ক্যাটাগরি পাওয়া যায়নি — ঔষধওয়ালা" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.cat.bn} — ${loaderData.cat.en} | ঔষধওয়ালা`;
    const desc = `${loaderData.cat.bn} ক্যাটাগরির অরিজিনাল পণ্য সেরা দামে অর্ডার করুন ঔষধওয়ালা থেকে।`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { products } = useCatalog();
  const { cat } = Route.useLoaderData();
  const list = products.filter((p) => p.category === cat.slug);

  return (
    <div className="pt-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-secondary text-xl">{cat.emoji}</span>
        <div>
          <h1 className="text-base font-bold">{cat.bn}</h1>
          <p className="text-xs text-muted-foreground">
            {cat.en} · {bn(list.length)} টি পণ্য
          </p>
        </div>
        <Link
          to="/products"
          search={{ q: "", category: cat.slug, sort: "popular" }}
          className="ml-auto rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold"
        >
          ফিল্টার
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}
