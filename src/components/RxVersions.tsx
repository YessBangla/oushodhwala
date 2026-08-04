import { useState } from "react";
import { History, ChevronDown, GitCompare } from "lucide-react";

import { useT } from "@/lib/i18n";
import type { RxRead, RxReadItem, RxChange } from "@/lib/rx-read.functions";

export type RxVersion = {
  id: string;
  action: string;
  createdAt: string;
  version: number;
  snapshot: RxRead | null;
  changes: RxChange[];
};

const FIELDS: Array<{ k: keyof RxReadItem; bn: string; en: string }> = [
  { k: "name", bn: "ব্র্যান্ড", en: "Brand" },
  { k: "generic", bn: "জেনেরিক", en: "Generic" },
  { k: "strength", bn: "মাত্রা", en: "Strength" },
  { k: "form", bn: "ফর্ম", en: "Form" },
  { k: "dose", bn: "সেবনবিধি", en: "Frequency" },
  { k: "duration", bn: "সময়কাল", en: "Duration" },
  { k: "instruction", bn: "নির্দেশনা", en: "Timing" },
];

type Diff = { line: number; medicine: string; field: string; from: string; to: string };

function diffSnapshots(a: RxRead | null, b: RxRead | null, label: (bn: string, en: string) => string): Diff[] {
  if (!a || !b) return [];
  const out: Diff[] = [];
  const max = Math.max(a.items.length, b.items.length);
  for (let i = 0; i < max; i++) {
    const oldIt = a.items[i];
    const newIt = b.items[i];
    const med = newIt?.name || oldIt?.name || `#${i + 1}`;
    if (!oldIt) {
      out.push({ line: i + 1, medicine: med, field: label("ঔষধ", "Medicine"), from: "—", to: label("নতুন যোগ", "added") });
      continue;
    }
    if (!newIt) {
      out.push({ line: i + 1, medicine: med, field: label("ঔষধ", "Medicine"), from: med, to: label("বাদ", "removed") });
      continue;
    }
    for (const f of FIELDS) {
      const from = String(oldIt[f.k] ?? "");
      const to = String(newIt[f.k] ?? "");
      if (from !== to) out.push({ line: i + 1, medicine: med, field: label(f.bn, f.en), from: from || "—", to: to || "—" });
    }
  }
  return out;
}

/** প্রতিবার সেভের ভার্সন হিস্ট্রি + দুই ভার্সনের তুলনা */
export function RxVersions({ rows }: { rows: RxVersion[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(0);

  if (rows.length === 0) return null;

  const label = (bn: string, en: string) => t(bn, en);
  const a = rows[left]?.snapshot ?? null;
  const b = rows[right]?.snapshot ?? null;
  const diffs = diffSnapshots(a, b, label);

  return (
    <section className="mt-4 rounded-xl border border-border bg-card p-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 text-xs font-bold">
        <History className="h-3.5 w-3.5 text-primary" />
        {t("ভার্সন হিস্ট্রি", "Version history")}
        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px]">{t.n(rows.length)}</span>
        <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <ul className="mt-2 space-y-2">
            {rows.map((r, i) => (
              <li key={r.id} className="rounded-lg border border-border p-2">
                <p className="text-[10px] font-semibold text-muted-foreground">
                  v{t.n(r.version || rows.length - i)} · {new Date(r.createdAt).toLocaleString(t.en ? "en-US" : "bn-BD")} ·{" "}
                  {r.action === "verify_save" ? t("যাচাই সেভ", "Verification saved") : t("সেভ", "Saved")}
                </p>
                {r.changes.length === 0 ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">{t("কোনো পরিবর্তন ছাড়াই সেভ", "Saved without changes")}</p>
                ) : (
                  <ul className="mt-1 space-y-0.5 text-[11px]">
                    {r.changes.map((c, j) => (
                      <li key={j}>
                        <span className="font-semibold">
                          #{t.n(c.line)} {c.medicine}
                        </span>{" "}
                        · {c.field}: <span className="text-muted-foreground line-through">{c.from}</span>{" "}
                        <span className="font-semibold text-primary">→ {c.to}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {rows.length > 1 && (
            <div className="mt-3 rounded-lg border border-border p-2">
              <p className="flex items-center gap-1.5 text-[11px] font-bold">
                <GitCompare className="h-3.5 w-3.5 text-primary" /> {t("দুই ভার্সন তুলনা করুন", "Compare two versions")}
              </p>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {[
                  { v: left, set: setLeft, bn: "আগের ভার্সন", en: "Older version" },
                  { v: right, set: setRight, bn: "পরের ভার্সন", en: "Newer version" },
                ].map((sel, k) => (
                  <label key={k} className="block">
                    <span className="text-[10px] font-semibold text-muted-foreground">{t(sel.bn, sel.en)}</span>
                    <select
                      value={String(sel.v)}
                      onChange={(e) => sel.set(Number(e.target.value))}
                      className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs"
                    >
                      {rows.map((r, i) => (
                        <option key={r.id} value={i}>
                          v{r.version || rows.length - i} · {new Date(r.createdAt).toLocaleDateString(t.en ? "en-US" : "bn-BD")}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

              {!a || !b ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t("এই ভার্সনের সম্পূর্ণ কপি সংরক্ষিত নেই।", "A full snapshot is not stored for this version.")}
                </p>
              ) : diffs.length === 0 ? (
                <p className="mt-2 text-[11px] text-muted-foreground">{t("দুই ভার্সনে কোনো পার্থক্য নেই।", "No difference between these versions.")}</p>
              ) : (
                <ul className="mt-2 space-y-0.5 text-[11px]">
                  {diffs.map((c, i) => (
                    <li key={i}>
                      <span className="font-semibold">
                        #{t.n(c.line)} {c.medicine}
                      </span>{" "}
                      · {c.field}: <span className="text-muted-foreground line-through">{c.from}</span>{" "}
                      <span className="font-semibold text-primary">→ {c.to}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
