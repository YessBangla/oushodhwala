import { useT } from "@/lib/i18n";

export type LegalSection = {
  bn: string;
  en: string;
  body: { bn: string; en: string }[];
};

/** শেয়ার্ড লেআউট — প্রাইভেসি, টার্মস, রিটার্ন পলিসির জন্য */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: { bn: string; en: string };
  updated: { bn: string; en: string };
  intro: { bn: string; en: string };
  sections: LegalSection[];
}) {
  const t = useT();
  return (
    <div className="pt-4 pb-8">
      <h1 className="font-display text-lg font-extrabold text-navy">{t(title.bn, title.en)}</h1>
      <p className="mt-1 text-[11px] text-muted-foreground">{t(updated.bn, updated.en)}</p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t(intro.bn, intro.en)}</p>

      <div className="mt-5 space-y-3">
        {sections.map((s, i) => (
          <section key={s.bn} className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-bold text-navy">
              {t.n(i + 1)}. {t(s.bn, s.en)}
            </h2>
            <div className="mt-2 space-y-2 text-xs leading-relaxed text-muted-foreground">
              {s.body.map((p) => (
                <p key={p.bn}>{t(p.bn, p.en)}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-5 rounded-xl border border-border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
        {t(
          "কোনো প্রশ্ন থাকলে হটলাইন ১৬৭০০ (২৪/৭) অথবা support@oushodhwala.com — এ যোগাযোগ করুন।",
          "For any question call our hotline 16700 (24/7) or email support@oushodhwala.com.",
        )}
      </p>
    </div>
  );
}
