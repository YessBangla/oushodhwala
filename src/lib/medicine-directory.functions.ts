import { createServerFn } from "@tanstack/react-start";
import { expandQuery } from "@/lib/bn-search";
import { publicClient } from "@/lib/public-supabase.server";

export type DirectoryRow = {
  id: string;
  name: string;
  en: string;
  brand: string;
  generic: string;
  strength: string;
  form: string;
  pack: string;
  price: number;
  mrp: number;
  rx: boolean;
  company: string;
  grp_bn: string;
  grp_en: string;
};

/** ঔষধ তালিকা — গ্রুপ, কম্পোজিশন (জেনেরিক) ও কোম্পানিসহ */
export const listMedicineDirectory = createServerFn({ method: "GET" })
  .inputValidator(
    (d: { q?: string; group?: string; company?: string; sort?: string; offset?: number; limit?: number }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const limit = Math.min(Math.max(data.limit ?? 50, 1), 200);
    const offset = Math.max(data.offset ?? 0, 0);
    let q = supabase.from("medicine_directory").select("*", { count: "exact" });

    if (data.group) q = q.eq("grp_en", data.group);
    if (data.company) q = q.eq("company", data.company);

    const term = (data.q ?? "").trim().replace(/[%,()]/g, " ");
    if (term) {
      const variants = Array.from(new Set([term, ...expandQuery(term)])).slice(0, 4);
      const ors = variants.flatMap((v) => [
        `name.ilike.%${v}%`,
        `en.ilike.%${v}%`,
        `brand.ilike.%${v}%`,
        `generic.ilike.%${v}%`,
      ]);
      q = q.or(ors.join(","));
    }

    if (data.sort === "company") q = q.order("company").order("en");
    else if (data.sort === "generic") q = q.order("generic").order("en");
    else if (data.sort === "group") q = q.order("grp_en").order("en");
    else q = q.order("en");

    const { data: rows, count } = await q.range(offset, offset + limit - 1);
    return { rows: (rows ?? []) as unknown as DirectoryRow[], count: count ?? 0 };
  });

/** ফিল্টারের জন্য গ্রুপ ও কোম্পানির তালিকা */
export const getMedicineFacets = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data } = await supabase.rpc("medicine_directory_facets");
  const rows = (data ?? []) as { kind: string; value: string; cnt: number }[];
  return {
    groups: rows.filter((r) => r.kind === "group").map((r) => ({ value: r.value, cnt: Number(r.cnt) })),
    companies: rows.filter((r) => r.kind === "company").map((r) => ({ value: r.value, cnt: Number(r.cnt) })),
  };
});
