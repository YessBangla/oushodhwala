import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Building2, FlaskConical, Layers, ShieldAlert, ArrowLeft } from "lucide-react";
import { getMedicineBrandDetail, type DirectoryRow } from "@/lib/medicine-directory.functions";
import { MedSections, type MedSection } from "@/components/MedSections";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/medicine/$id")({
  loader: async ({ params }) => {
    const data = await getMedicineBrandDetail({ data: { id: params.id } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const m = loaderData?.medicine;
    const title = m ? `${m.en || m.name} — ${m.company || ""} | ঔষধওয়ালা` : "ঔষধের বিবরণ | ঔষধওয়ালা";
    const desc = m
      ? `${m.en || m.name} (${m.generic || ""}) — গ্রুপ: ${m.grp_en || m.grp_bn || "—"}, কোম্পানি: ${m.company || "—"}, দাম: ৳${m.price}. বিকল্প ব্র্যান্ড ও জেনেরিক তথ্যসহ।`
      : "ঔষধের বিস্তারিত তথ্য — গ্রুপ, কম্পোজিশন, কোম্পানি ও বিকল্প।";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <div role="alert" className="rounded-xl border border-sale/40 bg-sale/5 p-4 text-sm text-sale">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="py-16 text-center text-sm text-muted-foreground">এই ঔষধটি খুঁজে পাওয়া যায়নি।</div>
  ),
  component: MedicineBrandPage,
});

function Fact({ icon: Icon, label, value }: { icon: typeof Layers; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold">{value || "—"}</p>
      </div>
    </div>
  );
}

function AltTable({ title, rows, showCompany }: { title: string; rows: DirectoryRow[]; showCompany: boolean }) {
  const t = useT();
  if (rows.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="text-sm font-bold">{title}</h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="bg-muted/50 text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("ব্র্যান্ড", "Brand")}</th>
              {showCompany && <th className="px-3 py-2">{t("কোম্পানি", "Company")}</th>}
              <th className="px-3 py-2">{t("ফর্ম", "Form")}</th>
              <th className="px-3 py-2 text-right">{t("দাম", "Price")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <Link to="/medicine/$id" params={{ id: r.id }} className="font-semibold text-primary">
                    {r.en || r.name}
                  </Link>
                  <div className="text-[11px] text-muted-foreground">{[r.strength, r.pack].filter(Boolean).join(" · ")}</div>
                </td>
                {showCompany && <td className="px-3 py-2">{r.company || "—"}</td>}
                <td className="px-3 py-2">{r.form || "—"}</td>
                <td className="px-3 py-2 text-right font-semibold">{t.money(r.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MedicineBrandPage() {
  const t = useT();
  const { medicine: m, genericInfo: g, alternatives, moreFromCompany } = Route.useLoaderData();
  const en = t.en;

  const pick = (bn?: string | null, enV?: string | null) => (en ? (enV || bn || "") : (bn || enV || ""));

  const sections: MedSection[] = [];
  if (g) {
    const add = (kind: MedSection["kind"], titleBn: string, titleEn: string, body: string) => {
      if (body && body.trim()) sections.push({ kind, title: t(titleBn, titleEn), body });
    };
    add("plain", "নির্দেশনা / ইন্ডিকেশন", "Indications", pick(g["indications"], g["indications_en"]));
    add("plain", "ফার্মাকোলজি", "Pharmacology", pick(g["pharmacology"], g["pharmacology_en"]));
    add("dosage", "মাত্রা ও সেবনবিধি", "Dosage & Administration", pick(g["dosage"], g["dosage_en"]));
    add("side-effects", "পার্শ্বপ্রতিক্রিয়া", "Side effects", pick(g["side_effects"], g["side_effects_en"]));
    add("warning", "প্রতিনির্দেশনা", "Contraindications", pick(g["contraindications"], g["contraindications_en"]));
    add("warning", "সতর্কতা ও খবরদারি", "Precautions & Warnings", pick(g["precautions"], g["precautions_en"]));
    add("pregnancy", "গর্ভাবস্থা ও স্তন্যদান", "Pregnancy & Lactation", pick(g["pregnancy"], g["pregnancy_en"]));
    add("plain", "ঔষধের পারস্পরিক প্রতিক্রিয়া", "Drug Interactions", pick(g["interaction"], g["interaction_en"]));
    add("plain", "বিশেষ জনগোষ্ঠী", "Special Populations", pick(g["special_populations"], g["special_populations_en"]));
    add("warning", "অতিরিক্ত মাত্রা", "Overdose", pick(g["overdose"], g["overdose_en"]));
    add("plain", "সংরক্ষণ", "Storage", pick(g["storage"], g["storage_en"]));
  }

  return (
    <div className="pt-4">
      <Link to="/medicines" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
        <ArrowLeft className="h-3.5 w-3.5" /> {t("ঔষধের তালিকা", "Medicine directory")}
      </Link>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold">{m.en || m.name}</h1>
            {m.name && m.name !== m.en && <p className="text-sm text-muted-foreground">{m.name}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              {[m.strength, m.form, m.pack].filter(Boolean).join(" · ")}
              {m.rx ? ` · ${t("প্রেসক্রিপশন (Rx)", "Prescription (Rx)")}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold text-primary">{t.money(m.price)}</p>
            {m.mrp > 0 && m.mrp !== m.price && (
              <p className="text-xs text-muted-foreground line-through">{t.money(m.mrp)}</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Fact icon={Layers} label={t("গ্রুপ", "Group")} value={t(m.grp_bn || m.grp_en, m.grp_en || m.grp_bn)} />
          <Fact icon={FlaskConical} label={t("কম্পোজিশন (জেনেরিক)", "Composition (Generic)")} value={m.generic} />
          <Fact icon={Building2} label={t("কোম্পানি", "Company")} value={m.company} />
          <Fact
            icon={ShieldAlert}
            label={t("ধরন", "Type")}
            value={m.rx ? t("প্রেসক্রিপশন ঔষধ", "Prescription medicine") : t("ওটিসি", "OTC")}
          />
        </div>
      </div>

      {sections.length > 0 && <MedSections sections={sections} reading={false} badgeText={t("গুরুত্বপূর্ণ", "Important")} />}

      <AltTable
        title={t(`একই কম্পোজিশনের বিকল্প ব্র্যান্ড (${alternatives.length})`, `Alternative brands with same composition (${alternatives.length})`)}
        rows={alternatives}
        showCompany
      />
      <AltTable
        title={t(`${m.company} কোম্পানির আরও ঔষধ`, `More from ${m.company}`)}
        rows={moreFromCompany}
        showCompany={false}
      />
    </div>
  );
}
