import { createServerFn } from "@tanstack/react-start";
import { suggestMedicineRows } from "@/lib/rx-suggest.server";

export const suggestMedicines = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string; limit?: number }) => d)
  .handler(async ({ data }) => {
    const rows = await suggestMedicineRows(data.q ?? "", Math.min(data.limit ?? 8, 20));
    return { rows };
  });
