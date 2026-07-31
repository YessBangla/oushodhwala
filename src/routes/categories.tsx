import { createFileRoute, Link } from "@tanstack/react-router";
import { categories, products, bn } from "@/data/catalog";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "সব ক্যাটাগরি — ঔষধওয়ালা" },
      { name: "description", content: "ঔষধ, স্বাস্থ্য সামগ্রী, বেবি কেয়ার, সাপ্লিমেন্ট, হারবাল সহ সব ক্যাটাগরি ব্রাউজ করুন।" },
      { property: "og:title", content: "সব ক্যাটাগরি — ঔষধওয়ালা" },
      { property: "og:description", content: "ঔষধওয়ালার সব প্রোডাক্ট ক্যাটাগরি এক জায়গায়।" },
    ],
  }),
  component: Categories,
});

function Categories() {
  return (
    <div className="pt-4">
      <h1 className="mb-3 text-base font-bold">সব ক্যাটাগরি</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((c) => (
          <Link
            key={c.slug}
            to="/category/$slug"
            params={{ slug: c.slug }}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-lg">{c.emoji}</span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold">{c.bn}</span>
              <span className="block text-[10px] text-muted-foreground">
                {bn(products.filter((p) => p.category === c.slug).length)} টি পণ্য
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
