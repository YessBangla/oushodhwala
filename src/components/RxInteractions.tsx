import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useT } from "@/lib/i18n";
import { checkRxInteractions, type RxInteractionResult } from "@/lib/rx-interactions.functions";

export type InteractionMed = { name: string; generic?: string; strength?: string };

const TONE: Record<string, { cls: string; bn: string; en: string }> = {
  major: { cls: "border-sale/40 bg-sale/10 text-sale", bn: "উচ্চ ঝুঁকি", en: "Major" },
  moderate: { cls: "border-amber-500/40 bg-amber-500/10 text-amber-600", bn: "মাঝারি ঝুঁকি", en: "Moderate" },
  minor: { cls: "border-border bg-secondary text-muted-foreground", bn: "কম ঝুঁকি", en: "Minor" },
};

/** নির্বাচিত ঔষধের মধ্যে সম্ভাব্য ইন্টার‍্যাকশন — ঝুঁকির লেভেলসহ */
export function RxInteractions({ meds }: { meds: InteractionMed[] }) {
  const t = useT();
  const check = useServerFn(checkRxInteractions);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<RxInteractionResult | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      setRes((await check({ data: { meds } })) as RxInteractionResult);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const worst = res?.interactions.some((i) => i.severity === "major")
    ? "major"
    : res?.interactions.some((i) => i.severity === "moderate")
      ? "moderate"
      : "minor";

  return (
    <section className="mt-4 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-sale" />
        <h2 className="text-xs font-bold">{t("ঔষধ-ঔষধ ইন্টার‍্যাকশন পরীক্ষা", "Drug–drug interaction check")}</h2>
        <button
          onClick={run}
          disabled={loading || meds.length < 2}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {res ? t("আবার পরীক্ষা", "Re-check") : t("পরীক্ষা করুন", "Check now")}
        </button>
      </div>

      {meds.length < 2 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("অন্তত দুটি ঔষধ নির্বাচন করলে ইন্টার‍্যাকশন পরীক্ষা করা যাবে।", "Select at least two medicines to run the check.")}
        </p>
      )}

      {res && (
        <>
          {res.interactions.length === 0 ? (
            <p className="mt-2 rounded-lg bg-primary/10 p-2 text-[11px] font-semibold text-primary">
              {t("উল্লেখযোগ্য কোনো ইন্টার‍্যাকশন পাওয়া যায়নি।", "No significant interaction found.")}
            </p>
          ) : (
            <>
              <p className={`mt-2 rounded-lg border p-2 text-[11px] font-bold ${TONE[worst]?.cls}`}>
                {t.n(res.interactions.length)} {t("সম্ভাব্য ইন্টার‍্যাকশন", "possible interactions")} ·{" "}
                {t("সর্বোচ্চ", "highest")}: {t(TONE[worst]?.bn ?? "", TONE[worst]?.en ?? "")}
              </p>
              <ul className="mt-2 space-y-2">
                {res.interactions.map((it, i) => {
                  const tone = TONE[it.severity] ?? TONE["minor"]!;
                  return (
                    <li key={i} className={`rounded-lg border p-2 ${tone.cls}`}>
                      <p className="text-[11px] font-bold text-foreground">
                        {it.a} + {it.b}
                        <span className={`ml-2 rounded-full border px-1.5 py-0.5 text-[10px] ${tone.cls}`}>
                          {t(tone.bn, tone.en)}
                        </span>
                      </p>
                      <p className="mt-1 text-[11px] text-foreground/80">{t.en ? it.effectEn || it.effect : it.effect}</p>
                      {(it.advice || it.adviceEn) && (
                        <p className="mt-0.5 text-[11px] font-semibold text-foreground">
                          {t("করণীয়", "What to do")}: {t.en ? it.adviceEn || it.advice : it.advice}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">{t.en ? res.summaryEn || res.summary : res.summary}</p>
        </>
      )}
    </section>
  );
}
