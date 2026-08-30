import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { listMedicineDirectory, getMedicineFacets, type DirectoryRow } from "@/lib/medicine-directory.functions";
import { useT } from "@/lib/i18n";

type Search = { q: string; group: string; company: string; sort: string };

export const Route = createFileRoute("/medicines")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s["q"] === "string" ? (s["q"] as string) : "",
    group: typeof s["group"] === "string" ? (s["group"] as string) : "",
    company: typeof s["company"] === "string" ? (s["company"] as string) : "",
    sort: typeof s["sort"] === "string" ? (s["sort"] as string) : "name",
  }),
  head: () => ({
    meta: [
      { title: "ঔষধের তালিকা — গ্রুপ, কম্পোজিশন ও কোম্পানি | ঔষধওয়ালা" },
      {
        name: "description",
        content:
          "বাংলাদেশের সব ঔষধের পূর্ণাঙ্গ তালিকা — ব্র্যান্ড নাম, জেনেরিক কম্পোজিশন, ঔষধ গ্রুপ ও উৎপাদনকারী কোম্পানিসহ খুঁজুন ও ডাউনলোড করুন।",
      },
      { property: "og:title", content: "বাংলাদেশের ঔষধের তালিকা | ঔষধওয়ালা" },
      {
        property: "og:description",
        content: "২৫ হাজারের বেশি ঔষধ — গ্রুপ, কম্পোজিশন ও কোম্পানি অনুযায়ী ফিল্টার করুন।",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MedicineDirectoryPage,
});

const PAGE = 50;

function csvEscape(v: string) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function MedicineDirectoryPage() {
  const t = useT();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [page, setPage] = useState(0);
  const [term, setTerm] = useState(search.q);
  const [exporting, setExporting] = useState(false);

  useEffect(() => setPage(0), [search.q, search.group, search.company, search.sort]);

  const set = (patch: Partial<Search>) => navigate({ search: (prev: Search) => ({ ...prev, ...patch }) });

  const { data: facets } = useQuery({
    queryKey: ["medicine-facets"],
    queryFn: () => getMedicineFacets(),
    staleTime: 5 * 60_000,
  });

  const { data, isFetching } = useQuery({
    queryKey: ["medicine-directory", search.q, search.group, search.company, search.sort, page],
    queryFn: () =>
      listMedicineDirectory({
        data: { q: search.q, group: search.group, company: search.company, sort: search.sort, offset: page * PAGE, limit: PAGE },
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const rows: DirectoryRow[] = data?.rows ?? [];
  const total = data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const cap = Math.min(total, 5000);
      const all: DirectoryRow[] = [];
      for (let off = 0; off < cap; off += 200) {
        const chunk = await listMedicineDirectory({
          data: { q: search.q, group: search.group, company: search.company, sort: search.sort, offset: off, limit: 200 },
        });
        all.push(...chunk.rows);
        if (chunk.rows.length === 0) break;
      }
      const head = ["Brand", "Bangla", "Generic (Composition)", "Strength", "Form", "Pack", "Group", "Company", "Price", "MRP", "Rx"];
      const body = all.map((r) =>
        [r.en, r.name, r.generic, r.strength, r.form, r.pack, r.grp_en, r.company, r.price, r.mrp, r.rx ? "Rx" : "OTC"]
          .map((v) => csvEscape(String(v ?? "")))
          .join(","),
      );
      const blob = new Blob(["\ufeff" + [head.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "oushodhwala-medicine-list.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="pt-4">
      <h1 className="text-base font-bold">
        {t("ঔষধের তালিকা", "Medicine directory")}{" "}
        <span className="text-xs font-normal text-muted-foreground">
          ({t.n(total)} {t("টি", "items")})
        </span>
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {t(
          "গ্রুপ, কম্পোজিশন (জেনেরিক) ও উৎপাদনকারী কোম্পানিসহ সম্পূর্ণ তালিকা।",
          "Full list with drug group, composition (generic) and manufacturer.",
        )}
      </p>

      <div className="mt-3 grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: term });
          }}
          className="flex gap-2"
        >
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t("নাম / জেনেরিক দিয়ে খুঁজুন", "Search name / generic")}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          />
          <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            {t("খুঁজুন", "Search")}
          </button>
        </form>

        <select
          value={search.group}
          onChange={(e) => set({ group: e.target.value })}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
        >
          <option value="">{t("সব গ্রুপ", "All groups")}</option>
          {(facets?.groups ?? []).map((g) => (
            <option key={g.value} value={g.value}>
              {g.value} ({g.cnt})
            </option>
          ))}
        </select>

        <select
          value={search.company}
          onChange={(e) => set({ company: e.target.value })}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
        >
          <option value="">{t("সব কোম্পানি", "All companies")}</option>
          {(facets?.companies ?? []).map((c) => (
            <option key={c.value} value={c.value}>
              {c.value} ({c.cnt})
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <select
            value={search.sort}
            onChange={(e) => set({ sort: e.target.value })}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          >
            <option value="name">{t("নাম অনুসারে", "By name")}</option>
            <option value="generic">{t("কম্পোজিশন অনুসারে", "By composition")}</option>
            <option value="group">{t("গ্রুপ অনুসারে", "By group")}</option>
            <option value="company">{t("কোম্পানি অনুসারে", "By company")}</option>
          </select>
          <button
            onClick={exportCsv}
            disabled={exporting || total === 0}
            className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            {exporting ? t("তৈরি হচ্ছে…", "Preparing…") : t("CSV", "CSV")}
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="bg-muted/50 text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("ঔষধের নাম", "Medicine")}</th>
              <th className="px-3 py-2">{t("কম্পোজিশন", "Composition")}</th>
              <th className="px-3 py-2">{t("গ্রুপ", "Group")}</th>
              <th className="px-3 py-2">{t("কোম্পানি", "Company")}</th>
              <th className="px-3 py-2 text-right">{t("দাম", "Price")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-3 py-2">
                  <Link to="/medicine/$id" params={{ id: r.id }} className="font-semibold text-primary">
                    {r.en || r.name}
                  </Link>
                  <div className="text-[11px] text-muted-foreground">
                    {[r.strength, r.form, r.pack].filter(Boolean).join(" · ")}
                    {r.rx ? " · Rx" : ""}
                  </div>
                </td>
                <td className="px-3 py-2">{r.generic || "—"}</td>
                <td className="px-3 py-2">{r.grp_en || "—"}</td>
                <td className="px-3 py-2">{r.company || "—"}</td>
                <td className="px-3 py-2 text-right font-semibold">{t.money(r.price)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  {t("কোনো ঔষধ পাওয়া যায়নি", "No medicines found")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          disabled={page === 0 || isFetching}
          onClick={() => setPage((n) => Math.max(0, n - 1))}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold disabled:opacity-40"
        >
          {t("আগের", "Previous")}
        </button>
        <span className="text-xs text-muted-foreground">
          {t("পৃষ্ঠা", "Page")} {t.n(page + 1)} / {t.n(pages)}
        </span>
        <button
          disabled={(page + 1) * PAGE >= total || isFetching}
          onClick={() => setPage((n) => n + 1)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold disabled:opacity-40"
        >
          {t("পরের", "Next")}
        </button>
      </div>
    </div>
  );
}
