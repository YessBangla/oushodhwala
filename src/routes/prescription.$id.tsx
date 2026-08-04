import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ShoppingCart, AlertTriangle, ChevronDown, Check, Pencil, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { ProductImage } from "@/components/ProductImage";
import { MedSections, type MedSection } from "@/components/MedSections";
import { cleanMedText, dedupeSections } from "@/lib/medtext";
import { readPrescription, saveRxEdits, type RxRead, type RxReadItem } from "@/lib/rx-read.functions";

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
type Row = Result["items"][number];
type Product = Row["matches"][number];

/** প্রতিটি ঔষধের জন্য ব্যবহারকারীর সিলেকশন — localStorage-এ সেভ থাকে */
type Sel = { match: number; qty: number; skip: boolean };

const selKey = (id: string) => `rx-sel-${id}`;
const stepKey = (id: string) => `rx-verified-${id}`;

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function RxReading() {
  const { id } = Route.useParams();
  const t = useT();
  const { user } = useAuth();
  const read = useServerFn(readPrescription);
  const save = useServerFn(saveRxEdits);
  const { add } = useStore();

  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"verify" | "details">("verify");
  const [draft, setDraft] = useState<RxReadItem[] | null>(null);
  const [sel, setSel] = useState<Record<number, Sel>>({});
  const [edited, setEdited] = useState<Result | null>(null);

  const { data: fetched, isLoading, error, refetch } = useQuery<Result>({
    queryKey: ["rx-read", id],
    enabled: !!user,
    retry: false,
    queryFn: () => read({ data: { id } }),
  });

  const data = edited ?? fetched ?? null;

  // প্রথমবার লোড হলে সেভ করা সিলেকশন ও ধাপ ফিরিয়ে আনি
  useEffect(() => {
    if (!fetched) return;
    setDraft(fetched.read.items.map((it) => ({ ...it })));
    const savedSel = loadJson<Record<number, Sel>>(selKey(id), {});
    const base: Record<number, Sel> = {};
    fetched.items.forEach((_, i) => {
      base[i] = savedSel[i] ?? { match: 0, qty: 1, skip: false };
    });
    setSel(base);
    setStep(loadJson<boolean>(stepKey(id), false) ? "details" : "verify");
  }, [fetched, id]);

  useEffect(() => {
    if (typeof window === "undefined" || !data) return;
    window.localStorage.setItem(selKey(id), JSON.stringify(sel));
  }, [sel, id, data]);

  const order = useMemo(() => {
    if (!data) return { lines: [] as Array<{ p: Product; qty: number }>, total: 0, mrp: 0 };
    const lines: Array<{ p: Product; qty: number }> = [];
    data.items.forEach((row, i) => {
      const s = sel[i];
      if (!s || s.skip) return;
      const p = row.matches[s.match];
      if (!p) return;
      lines.push({ p, qty: s.qty });
    });
    return {
      lines,
      total: lines.reduce((a, l) => a + l.p.price * l.qty, 0),
      mrp: lines.reduce((a, l) => a + (l.p.mrp || l.p.price) * l.qty, 0),
    };
  }, [data, sel]);

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

  const confirm = async () => {
    if (!data || !draft) return;
    setSaving(true);
    try {
      const payload: RxRead = { ...data.read, items: draft };
      const res = (await save({ data: { id, read: payload, confirmed: true } })) as Result;
      setEdited(res);
      setDraft(res.read.items.map((it) => ({ ...it })));
      setSel((prev) => {
        const next: Record<number, Sel> = {};
        res.items.forEach((_, i) => (next[i] = prev[i] ?? { match: 0, qty: 1, skip: false }));
        return next;
      });
      setStep("details");
      if (typeof window !== "undefined") window.localStorage.setItem(stepKey(id), "true");
      toast.success(t("যাচাই সম্পন্ন — দাম ও বিস্তারিত দেখানো হচ্ছে", "Verified — showing prices and details"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addAll = () => {
    if (order.lines.length === 0) {
      toast.error(t("কোনো ঔষধ নির্বাচন করা হয়নি", "No medicine selected"));
      return;
    }
    order.lines.forEach((l) => add({ id: l.p.id, kind: "product", name: l.p.name, price: l.p.price }, l.qty));
    toast.success(t("সব ঔষধ কার্টে যোগ হয়েছে", "All medicines added to cart"));
  };

  return (
    <div className="pb-32 pt-4">
      <div className="flex items-center gap-2">
        <Link to="/prescription" className="text-[11px] font-semibold text-muted-foreground hover:text-primary">
          ← {t("প্রেসক্রিপশন আপলোড", "Prescription upload")}
        </Link>
        <button
          onClick={async () => {
            setRefreshing(true);
            try {
              await read({ data: { id, force: true } });
              setEdited(null);
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

      <ol className="mt-3 flex items-center gap-2 text-[11px] font-bold">
        <StepPill active={step === "verify"} done={step === "details"} n={1} label={t("যাচাই ও সম্পাদনা", "Verify & edit")} />
        <span className="h-px flex-1 bg-border" />
        <StepPill active={step === "details"} done={false} n={2} label={t("দাম ও বিস্তারিত", "Prices & details")} />
      </ol>

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
                  "হাতের লেখা পড়ায় ভুল হতে পারে — অর্ডার করার আগে প্রতিটি ঔষধ যাচাই করে নিন।",
                  "Handwriting can be misread — please verify every medicine before ordering.",
                )}
            </span>
          </p>

          {data.items.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("কোনো ঔষধ শনাক্ত করা যায়নি। স্পষ্ট ছবি আপলোড করে আবার চেষ্টা করুন।", "No medicine could be detected. Please upload a clearer photo.")}
            </p>
          ) : step === "verify" ? (
            <>
              <p className="mt-4 text-xs text-muted-foreground">
                {t(
                  "প্রতিটি ঔষধের নাম, জেনেরিক, মাত্রা ও প্যাক যাচাই করুন — প্রয়োজনে সম্পাদনা করুন। এরপর দাম ও স্টক দেখানো হবে।",
                  "Check each medicine's brand, generic, strength and pack — edit if needed. Prices and stock come next.",
                )}
              </p>
              <ul className="mt-3 space-y-3">
                {draft?.map((item, i) => (
                  <VerifyRow
                    key={i}
                    index={i}
                    item={item}
                    matches={data.items[i]?.matches ?? []}
                    sel={sel[i] ?? { match: 0, qty: 1, skip: false }}
                    onSel={(s) => setSel((p) => ({ ...p, [i]: { ...(p[i] ?? { match: 0, qty: 1, skip: false }), ...s } }))}
                    onChange={(patch) =>
                      setDraft((d) => d?.map((x, j) => (j === i ? { ...x, ...patch } : x)) ?? d)
                    }
                  />
                ))}
              </ul>
              <button
                onClick={confirm}
                disabled={saving}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                {saving ? t("সেভ হচ্ছে...", "Saving...") : t("নিশ্চিত করে দাম দেখুন", "Confirm & see prices")}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setStep("verify");
                  if (typeof window !== "undefined") window.localStorage.removeItem(stepKey(id));
                }}
                className="mt-4 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold"
              >
                <Pencil className="h-3.5 w-3.5" /> {t("আবার যাচাই করুন", "Edit verification")}
              </button>

              <ul className="mt-3 space-y-3">
                {data.items.map((row, i) => (
                  <RxRow
                    key={i}
                    index={i}
                    row={row}
                    sel={sel[i] ?? { match: 0, qty: 1, skip: false }}
                    onSel={(s) => setSel((p) => ({ ...p, [i]: { ...(p[i] ?? { match: 0, qty: 1, skip: false }), ...s } }))}
                  />
                ))}
              </ul>

              {data.read.advice && (
                <section className="mt-5 rounded-xl border border-border bg-card p-3">
                  <h2 className="text-xs font-bold">{t("ডাক্তারের পরামর্শ", "Doctor's advice")}</h2>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{data.read.advice}</p>
                </section>
              )}

              <section className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
                <div className="mx-auto flex max-w-3xl items-center gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">
                      {t("অর্ডার প্রিভিউ", "Order preview")} · {t.n(order.lines.length)} {t("আইটেম", "items")}
                    </p>
                    <p className="text-base font-extrabold text-primary">
                      ৳{t.n(order.total)}
                      {order.mrp > order.total && (
                        <span className="ml-2 text-[11px] font-semibold text-muted-foreground line-through">৳{t.n(order.mrp)}</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={addAll}
                    disabled={order.lines.length === 0}
                    className="ml-auto flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                  >
                    <ShoppingCart className="h-4 w-4" /> {t("সব কার্টে যোগ করুন", "Add all to cart")}
                  </button>
                  <Link
                    to="/cart"
                    className="rounded-xl border border-border px-3 py-2.5 text-xs font-bold"
                  >
                    {t("কার্ট", "Cart")}
                  </Link>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

function StepPill({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <li
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
        active ? "bg-primary/10 text-primary" : done ? "bg-secondary text-foreground" : "bg-secondary text-muted-foreground"
      }`}
    >
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-background text-[10px]">
        {done ? <Check className="h-3 w-3" /> : n}
      </span>
      {label}
    </li>
  );
}

function ConfBadge({ c }: { c: number }) {
  const t = useT();
  const ok = c >= 0.75;
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ok ? "bg-primary/10 text-primary" : "bg-sale/10 text-sale"}`}>
      {ok ? t("নিশ্চিত", "Confident") : t("যাচাই দরকার", "Verify")} · {t.n(Math.round(c * 100))}%
    </span>
  );
}

function Inp({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs"
      />
    </label>
  );
}

function VerifyRow({
  index,
  item,
  matches,
  sel,
  onSel,
  onChange,
}: {
  index: number;
  item: RxReadItem;
  matches: Product[];
  sel: Sel;
  onSel: (s: Partial<Sel>) => void;
  onChange: (patch: Partial<RxReadItem>) => void;
}) {
  const t = useT();
  return (
    <li className={`rounded-xl border p-3 ${sel.skip ? "border-dashed border-border opacity-60" : "border-border bg-card"}`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
          {t.n(index + 1)}
        </span>
        <p className="min-w-0 text-[11px] text-muted-foreground">
          {t("লেখা ছিল", "Written")}: “{item.raw}”
        </p>
        <ConfBadge c={item.confidence} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Inp label={t("ব্র্যান্ড নাম", "Brand")} value={item.name} onChange={(v) => onChange({ name: v })} />
        <Inp label={t("জেনেরিক", "Generic")} value={item.generic} onChange={(v) => onChange({ generic: v })} />
        <Inp label={t("মাত্রা", "Strength")} value={item.strength} onChange={(v) => onChange({ strength: v })} />
        <Inp label={t("ফর্ম / প্যাক", "Form / pack")} value={item.form} onChange={(v) => onChange({ form: v })} />
        <Inp label={t("সেবনবিধি", "Frequency")} value={item.dose} onChange={(v) => onChange({ dose: v })} />
        <Inp label={t("সময়কাল", "Duration")} value={item.duration} onChange={(v) => onChange({ duration: v })} />
        <div className="col-span-2">
          <Inp label={t("নির্দেশনা (খাবার আগে/পরে)", "Timing / instruction")} value={item.instruction} onChange={(v) => onChange({ instruction: v })} />
        </div>
      </div>

      {matches.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] font-semibold text-muted-foreground">{t("সম্ভাব্য মিল — সঠিকটি বেছে নিন", "Possible matches — pick the correct one")}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {matches.map((m, i) => (
              <button
                key={m.id}
                onClick={() => onSel({ match: i, skip: false })}
                className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                  i === sel.match && !sel.skip ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {(t.en ? m.en || m.name : m.name)} · {m.strength} · ৳{t.n(m.price)}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
        <input type="checkbox" checked={sel.skip} onChange={(e) => onSel({ skip: e.target.checked })} className="h-3.5 w-3.5" />
        {t("এই ঔষধটি অর্ডারে রাখব না", "Exclude this medicine from the order")}
      </label>
    </li>
  );
}

function RxRow({ row, index, sel, onSel }: { row: Row; index: number; sel: Sel; onSel: (s: Partial<Sel>) => void }) {
  const t = useT();
  const { add } = useStore();
  const [open, setOpen] = useState(false);
  const item = row.item;
  const p = row.matches[sel.match];

  return (
    <li className={`rounded-xl border p-3 ${sel.skip ? "border-dashed border-border opacity-60" : "border-border bg-card"}`}>
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
          </p>
        </div>
        <ConfBadge c={item.confidence} />
      </div>

      {(item.dose || item.duration || item.instruction) && (
        <div className="mt-2 flex flex-wrap gap-1.5 rounded-lg bg-secondary p-2 text-[11px]">
          {item.dose && (
            <span className="font-semibold">
              {t("সেবনবিধি", "Frequency")}: <span className="font-normal text-muted-foreground">{item.dose}</span>
            </span>
          )}
          {item.duration && (
            <span className="font-semibold">
              · {t("সময়কাল", "Duration")}: <span className="font-normal text-muted-foreground">{item.duration}</span>
            </span>
          )}
          {item.instruction && (
            <span className="font-semibold">
              · {t("নির্দেশনা", "Timing")}: <span className="font-normal text-muted-foreground">{item.instruction}</span>
            </span>
          )}
        </div>
      )}

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
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-extrabold text-primary">৳{t.n(p.price)}</span>
                {p.mrp > p.price && <span className="text-[11px] text-muted-foreground line-through">৳{t.n(p.mrp)}</span>}
                {p.rx && <span className="rounded bg-sale/10 px-1.5 py-0.5 text-[10px] font-bold text-sale">℞</span>}
                <span className={`text-[10px] font-semibold ${p.stock > 0 ? "text-primary" : "text-sale"}`}>
                  {p.stock > 0 ? t("স্টকে আছে", "In stock") : t("স্টক নেই", "Out of stock")}
                </span>

                <div className="ml-auto flex items-center gap-1 rounded-lg border border-border">
                  <button
                    onClick={() => onSel({ qty: Math.max(1, sel.qty - 1) })}
                    className="px-2 py-1.5"
                    aria-label={t("কমান", "Decrease")}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-6 text-center text-[11px] font-bold">{t.n(sel.qty)}</span>
                  <button
                    onClick={() => onSel({ qty: sel.qty + 1 })}
                    className="px-2 py-1.5"
                    aria-label={t("বাড়ান", "Increase")}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    add({ id: p.id, kind: "product", name: p.name, price: p.price }, sel.qty);
                    toast.success(t("কার্টে যোগ হয়েছে", "Added to cart"));
                  }}
                  disabled={p.stock <= 0}
                  className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
                >
                  <ShoppingCart className="h-3 w-3" /> {t("কার্ট", "Cart")}
                </button>
              </div>
              <p className="mt-1 text-[11px] font-semibold">
                {t("সাব-টোটাল", "Subtotal")}: <span className="text-primary">৳{t.n(p.price * sel.qty)}</span>
              </p>
            </div>
          </div>

          {row.matches.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.matches.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => onSel({ match: i })}
                  className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                    i === sel.match ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {(t.en ? m.en || m.name : m.name)} · ৳{t.n(m.price)}
                </button>
              ))}
            </div>
          )}

          <label className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
            <input type="checkbox" checked={sel.skip} onChange={(e) => onSel({ skip: e.target.checked })} className="h-3.5 w-3.5" />
            {t("অর্ডার থেকে বাদ দিন", "Exclude from order")}
          </label>

          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-2 flex w-full items-center justify-between rounded-lg bg-secondary px-2.5 py-2 text-[11px] font-bold"
          >
            {t("বিস্তারিত তথ্য", "Full details")}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="mt-2">
              <MedSections sections={sectionsOf(p, t.en, t)} reading={false} />
            </div>
          )}
        </>
      )}
    </li>
  );
}

function sectionsOf(p: Product, en: boolean, t: ReturnType<typeof useT>): MedSection[] {
  const pick = (bn: string, eng: string) => cleanMedText(en ? eng || bn : bn || eng);
  const list = [
    { kind: "plain" as const, title: t("থেরাপিউটিক ক্লাস", "Therapeutic class"), body: pick(p.therapeutic_class, p.therapeutic_class_en) },
    { kind: "plain" as const, title: t("নির্দেশনা", "Indications"), body: pick(p.indications, p.indications_en) },
    { kind: "dosage" as const, title: t("মাত্রা ও সেবনবিধি", "Dosage & administration"), body: pick(p.dosage, p.dosage_en) },
    { kind: "warning" as const, title: t("প্রতিনির্দেশনা", "Contraindications"), body: pick(p.contraindications, p.contraindications_en) },
    { kind: "side-effects" as const, title: t("পার্শ্ব প্রতিক্রিয়া", "Side effects"), body: pick(p.side_effects, p.side_effects_en) },
    { kind: "pregnancy" as const, title: t("গর্ভাবস্থা ও স্তন্যদান", "Pregnancy & lactation"), body: pick(p.pregnancy, p.pregnancy_en) },
    { kind: "warning" as const, title: t("সতর্কতা", "Precautions"), body: pick(p.precautions, p.precautions_en) },
  ].filter((s) => s.body.trim() !== "") as MedSection[];
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
