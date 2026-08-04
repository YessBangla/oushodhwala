import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { RefreshCw, ShoppingCart, AlertTriangle, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { ProductImage } from "@/components/ProductImage";
import { MedSections, type MedSection } from "@/components/MedSections";
import { cleanMedText, dedupeSections } from "@/lib/medtext";
import { readPrescription } from "@/lib/rx-read.functions";

export const Route = createFileRoute("/prescription/$id")({
  head: () => ({
    meta: [
      { title: "প্রেসক্রিপশন রিডিং — ঔষধওয়ালা" },
      {
        name: "description",
        content: "আপলোড করা প্রেসক্রিপশন পড়ে প্রতিটি ঔষধের দাম, জেনেরিক ও বিস্তারিত তথ্য এক পেইজে দেখুন।",
      },
      { property: "og:title", content: "প্রেসক্রিপশন রিডিং — ঔষধওয়ালা" },
      { property: "og:description", content: "হাতে লেখা প্রেসক্রিপশন থেকে ঔষধ শনাক্ত — দাম, জেনেরিক ও নির্দেশনা সহ।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: RxReading,
});

type Result = Awaited<ReturnType<typeof readPrescription>>;
type Product = Result["items"][number]["matches"][number];

function RxReading() {
  const { id } = Route.useParams();
  const t = useT();
  const { user } = useAuth();
  const read = useServerFn(readPrescription);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<Result>({
    queryKey: ["rx-read", id],
    enabled: !!user,
    retry: false,
    queryFn: () => read({ data: { id } }),
  });

  if (!user) {
    return (
      <div className="pt-16 text-center text-sm">
        <p className="text-muted-foreground">{t("প্রেসক্রিপশন দেখতে লগইন করুন।", "Please log in to view this prescription.")}</p>
        <Link to="/auth" className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          {t("লগইন", "Login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-12 pt-4">
      <div className="flex items-center gap-2">
        <Link to="/prescription" className="text-[11px] font-semibold text-muted-foreground hover:text-primary">
          ← {t("প্রেসক্রিপশন আপলোড", "Prescription upload")}
        </Link>
        <button
          onClick={async () => {
            setRefreshing(true);
            try {
              await read({ data: { id, force: true } });
              await refetch();
              toast.success(t("আবার পড়া হয়েছে", "Re-read complete"));
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setRefreshing(false);
            }
          }}
          disabled={refreshing || isLoading}
          className="ml-auto flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {t("আবার পড়ুন", "Re-read")}
        </button>
      </div>

      <h1 className="mt-3 text-base font-bold">{t("প্রেসক্রিপশন রিডিং", "Prescription reading")}</h1>
      <p className="text-xs text-muted-foreground">
        {t(
          "আপনার প্রেসক্রিপশন পড়ে প্রতিটি ঔষধের দাম, জেনেরিক ও বিস্তারিত নিচে দেখানো হলো।",
          "Every medicine detected in your prescription with price, generic and full details.",
        )}
      </p>

      {isLoading && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t("প্রেসক্রিপশন পড়া হচ্ছে... কিছুক্ষণ অপেক্ষা করুন।", "Reading your prescription... please wait.")}
        </p>
      )}
      {error && <p className="mt-8 text-center text-sm text-sale">{(error as Error).message}</p>}

      {data && (
        <>
          <section className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 text-xs">
            <Field t={t("রোগী", "Patient")} v={data.read.patientName || "—"} />
            <Field t={t("ডাক্তার", "Doctor")} v={data.read.doctorName || "—"} />
            <Field t={t("তারিখ", "Date")} v={data.read.date || "—"} />
            <Field t={t("শনাক্ত ঔষধ", "Medicines found")} v={t.n(data.items.length)} />
          </section>

          <p className="mt-3 flex items-start gap-2 rounded-lg bg-secondary p-3 text-[11px] text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sale" />
            <span>
              {data.read.note ||
                t(
                  "হাতের লেখা পড়ায় ভুল হতে পারে — অর্ডার করার আগে আমাদের ফার্মাসিস্ট প্রতিটি ঔষধ যাচাই করে নেবেন।",
                  "Handwriting can be misread — our pharmacist verifies every medicine before dispatch.",
                )}
            </span>
          </p>

          {data.items.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("কোনো ঔষধ শনাক্ত করা যায়নি। স্পষ্ট ছবি আপলোড করে আবার চেষ্টা করুন।", "No medicine could be detected. Please upload a clearer photo.")}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.items.map((row, i) => (
                <RxRow key={i} index={i} row={row} />
              ))}
            </ul>
          )}

          {data.read.advice && (
            <section className="mt-5 rounded-xl border border-border bg-card p-3">
              <h2 className="text-xs font-bold">{t("ডাক্তারের পরামর্শ", "Doctor's advice")}</h2>
              <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{data.read.advice}</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function RxRow({ row, index }: { row: Result["items"][number]; index: number }) {
  const t = useT();
  const { add } = useStore();
  const [sel, setSel] = useState(0);
  const [open, setOpen] = useState(false);
  const item = row.item;
  const p = row.matches[sel];

  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
          {t.n(index + 1)}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold">
            {item.name || item.raw}
            {item.strength ? ` ${item.strength}` : ""}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t("লেখা ছিল", "Written")}: “{item.raw}”
            {item.form ? ` · ${item.form}` : ""}
            {item.dose ? ` · ${item.dose}` : ""}
            {item.duration ? ` · ${item.duration}` : ""}
          </p>
        </div>
        <span
          className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            item.confidence >= 0.75 ? "bg-primary/10 text-primary" : "bg-sale/10 text-sale"
          }`}
        >
          {item.confidence >= 0.75 ? t("নিশ্চিত", "Confident") : t("যাচাই দরকার", "Verify")}
        </span>
      </div>

      {!p ? (
        <p className="mt-2 rounded-lg bg-secondary p-2 text-[11px] text-muted-foreground">
          {t("এই ঔষধটি আমাদের ক্যাটালগে পাওয়া যায়নি — ফার্মাসিস্ট বিকল্প জানাবেন।", "Not found in our catalogue — our pharmacist will suggest an alternative.")}
        </p>
      ) : (
        <>
          <div className="mt-2 flex gap-3 rounded-lg border border-border p-2">
            <Link to="/product/$id" params={{ id: p.id }} className="w-16 shrink-0">
              <ProductImage
                src={p.medicine_image_url || p.image_url}
                alt={p.name}
                emoji={p.emoji}
                ratio="square"
                className="rounded-lg"
                emojiClassName="text-2xl"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link to="/product/$id" params={{ id: p.id }} className="line-clamp-2 text-xs font-bold hover:text-primary">
                {t.en ? p.en || p.name : p.name}
              </Link>
              <p className="text-[11px] text-muted-foreground">
                {t("জেনেরিক", "Generic")}: <span className="font-semibold text-foreground">{p.generic || "—"}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {p.manufacturer || p.brand} · {p.form} {p.strength} · {p.pack}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-extrabold text-primary">৳{t.n(p.price)}</span>
                {p.mrp > p.price && <span className="text-[11px] text-muted-foreground line-through">৳{t.n(p.mrp)}</span>}
                {p.rx && <span className="rounded bg-sale/10 px-1.5 py-0.5 text-[10px] font-bold text-sale">℞</span>}
                <span className={`text-[10px] font-semibold ${p.stock > 0 ? "text-primary" : "text-sale"}`}>
                  {p.stock > 0 ? t("স্টকে আছে", "In stock") : t("স্টক নেই", "Out of stock")}
                </span>
                <button
                  onClick={() => {
                    add({ id: p.id, kind: "product", name: p.name, price: p.price }, 1);
                    toast.success(t("কার্টে যোগ হয়েছে", "Added to cart"));
                  }}
                  disabled={p.stock <= 0}
                  className="ml-auto flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
                >
                  <ShoppingCart className="h-3 w-3" /> {t("কার্ট", "Cart")}
                </button>
              </div>
            </div>
          </div>

          {row.matches.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.matches.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setSel(i)}
                  className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                    i === sel ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {(t.en ? m.en || m.name : m.name)} · ৳{t.n(m.price)}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-2 flex w-full items-center justify-between rounded-lg bg-secondary px-2.5 py-2 text-[11px] font-bold"
          >
            {t("বিস্তারিত তথ্য", "Full details")}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="mt-2">
              <MedSections sections={sectionsOf(p, t.en, t)} />
            </div>
          )}
        </>
      )}
    </li>
  );
}

function sectionsOf(p: Product, en: boolean, t: ReturnType<typeof useT>): MedSection[] {
  const pick = (bn: string, eng: string) => cleanMedText(en ? eng || bn : bn || eng);
  const list: MedSection[] = [
    { kind: "plain", title: t("থেরাপিউটিক ক্লাস", "Therapeutic class"), body: pick(p.therapeutic_class, p.therapeutic_class_en) },
    { kind: "plain", title: t("নির্দেশনা", "Indications"), body: pick(p.indications, p.indications_en) },
    { kind: "dosage", title: t("মাত্রা ও সেবনবিধি", "Dosage & administration"), body: pick(p.dosage, p.dosage_en) },
    { kind: "warning", title: t("প্রতিনির্দেশনা", "Contraindications"), body: pick(p.contraindications, p.contraindications_en) },
    { kind: "side-effects", title: t("পার্শ্ব প্রতিক্রিয়া", "Side effects"), body: pick(p.side_effects, p.side_effects_en) },
    { kind: "pregnancy", title: t("গর্ভাবস্থা ও স্তন্যদান", "Pregnancy & lactation"), body: pick(p.pregnancy, p.pregnancy_en) },
    { kind: "warning", title: t("সতর্কতা", "Precautions"), body: pick(p.precautions, p.precautions_en) },
  ].filter((s) => s.body.trim() !== "");
  return dedupeSections(list);
}

function Field({ t, v }: { t: string; v: string }) {
  return (
    <p className="text-xs">
      <span className="text-muted-foreground">{t}: </span>
      <span className="font-semibold">{v}</span>
    </p>
  );
}
