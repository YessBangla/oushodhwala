import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshCw,
  ShoppingCart,
  AlertTriangle,
  ChevronDown,
  Check,
  Pencil,
  Minus,
  Plus,
  FileText,
  Share2,
  Save,
  Trash2,
  Bug,
  Loader2,
  Printer,
} from "lucide-react";

import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { ProductImage } from "@/components/ProductImage";
import { BrandLogo } from "@/components/BrandLogo";

import { MedSections, type MedSection } from "@/components/MedSections";
import { cleanMedText, dedupeSections } from "@/lib/medtext";
import {
  readPrescription,
  readPrescriptionGuest,
  saveRxEdits,
  listRxAudit,
  type RxRead,
  type RxReadItem,
  type RxChange,
  type RxDebug,

} from "@/lib/rx-read.functions";
import { getGuestToken } from "@/lib/rx-guest";
import { printRxSummary, rxSummaryText, type RxSummary } from "@/lib/rx-summary";
import { RxInteractions } from "@/components/RxInteractions";
import { RxShareManager } from "@/components/RxShareManager";
import { RxVersions } from "@/components/RxVersions";


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

/** প্রেসক্রিপশন থেকে অর্ডারে ঔষধওয়ালার নির্ধারিত ছাড় */
const RX_DISCOUNT = 0.1;

type Row = Result["items"][number];
type Product = Row["matches"][number];

/** প্রতিটি ঔষধের জন্য ব্যবহারকারীর সিলেকশন — localStorage-এ সেভ থাকে */
type Sel = { match: number; qty: number; skip: boolean };

const DEF_SEL: Sel = { match: 0, qty: 1, skip: false };

/** প্রেসক্রিপশনের হেডার তথ্য — ব্যবহারকারী সরাসরি সম্পাদনা করতে পারে */
type RxMeta = {
  hospital: string;
  doctorName: string;
  doctorQualification: string;
  patientName: string;
  patientAge: string;
  patientAddress: string;
  date: string;
  advice: string;
};

const EMPTY_META: RxMeta = {
  hospital: "",
  doctorName: "",
  doctorQualification: "",
  patientName: "",
  patientAge: "",
  patientAddress: "",
  date: "",
  advice: "",
};

const metaOf = (r: RxRead): RxMeta => ({
  hospital: r.hospital ?? "",
  doctorName: r.doctorName ?? "",
  doctorQualification: r.doctorQualification ?? "",
  patientName: r.patientName ?? "",
  patientAge: r.patientAge ?? "",
  patientAddress: r.patientAddress ?? "",
  date: r.date ?? "",
  advice: r.advice ?? "",
});

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

const packLabel = (p: Product) => (p.pack || p.form || "—").trim();

/** নতুন ঔষধের খালি লাইন */
const emptyItem = (): RxReadItem => ({
  raw: "",
  name: "",
  generic: "",
  strength: "",
  form: "",
  dose: "",
  duration: "",
  instruction: "",
  confidence: 1,
  fieldConf: { name: 1, strength: 1, form: 1, dose: 1, duration: 1, instruction: 1 },
  reason: "হাতে যোগ করা লাইন",
});

const hasDigit = (s: string) => /\d|[০-৯]/.test(s);
const ageNum = (s: string) => Number((s.match(/\d+/) ?? ["NaN"])[0]);

export type RxErrors = { meta: Partial<Record<keyof RxMeta, string>>; items: Record<string, string> };

/** ব্যবহারকারী-বান্ধব ভ্যালিডেশন — ডাক্তার, রোগী ও ডোজ/সময়কাল */
function validateRx(meta: RxMeta, items: RxReadItem[], en: boolean): RxErrors {
  const tr = (bn: string, eng: string) => (en ? eng : bn);
  const m: RxErrors["meta"] = {};
  const it: Record<string, string> = {};

  if (!meta.doctorName.trim()) m.doctorName = tr("ডাক্তারের নাম লিখুন", "Doctor name is required");
  else if (meta.doctorName.trim().length < 3)
    m.doctorName = tr("নামটি খুব ছোট — অন্তত ৩ অক্ষর", "Name is too short — at least 3 characters");
  else if (/^\d+$/.test(meta.doctorName.trim()))
    m.doctorName = tr("শুধু সংখ্যা নয়, নাম লিখুন", "Enter a name, not only digits");

  if (meta.patientAge.trim()) {
    const n = ageNum(meta.patientAge);
    if (Number.isNaN(n)) m.patientAge = tr("বয়সে সংখ্যা থাকতে হবে, যেমন ৩৫ বছর", "Age must contain a number, e.g. 35 years");
    else if (n < 0 || n > 120) m.patientAge = tr("বয়স ০–১২০ এর মধ্যে হতে হবে", "Age must be between 0 and 120");
  }

  if (meta.patientAddress.trim() && meta.patientAddress.trim().length < 5)
    m.patientAddress = tr("ঠিকানা অন্তত ৫ অক্ষরের হতে হবে", "Address must be at least 5 characters");

  items.forEach((x, i) => {
    if (!x.name.trim() && !x.raw.trim()) it[`${i}.name`] = tr("ঔষধের নাম দিন", "Medicine name is required");
    if (x.strength.trim() && !hasDigit(x.strength))
      it[`${i}.strength`] = tr("মাত্রায় সংখ্যা থাকতে হবে, যেমন 500 mg", "Strength must contain a number, e.g. 500 mg");
    if (x.duration.trim() && !hasDigit(x.duration) && !/চলবে|continue/i.test(x.duration))
      it[`${i}.duration`] = tr("সময়কালে সংখ্যা দিন, যেমন ৭ দিন", "Duration needs a number, e.g. 7 days");
    const slots = (x.dose || "").split("+").map((s) => s.trim());
    if (slots.length === 3 && slots.every((s) => !s || s === "0"))
      it[`${i}.dose`] = tr("সকাল/দুপুর/রাতের অন্তত একটি ডোজ দিন", "Set at least one morning/noon/night dose");
  });

  return { meta: m, items: it };
}

const errCount = (e: RxErrors) => Object.keys(e.meta).length + Object.keys(e.items).length;


function RxReading() {
  const { id } = Route.useParams();
  const t = useT();
  const { user } = useAuth();
  const read = useServerFn(readPrescription);
  const readGuest = useServerFn(readPrescriptionGuest);
  const save = useServerFn(saveRxEdits);
  const audit = useServerFn(listRxAudit);
  const { add } = useStore();

  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"verify" | "details">("verify");
  const [draft, setDraft] = useState<RxReadItem[] | null>(null);
  const [base, setBase] = useState<RxReadItem[] | null>(null);
  const [sel, setSel] = useState<Record<number, Sel>>({});
  const [edited, setEdited] = useState<Result | null>(null);
  /** প্রেসক্রিপশনের হেডার তথ্য — হাসপাতাল, ডাক্তার, রোগী, বয়স, ঠিকানা, পরামর্শ */
  const [meta, setMeta] = useState<RxMeta>(EMPTY_META);
  /** অটোসেভের অবস্থা */
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");
  const [autoSaving, setAutoSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  /** ভ্যালিডেশন ত্রুটি দেখানো হবে কিনা (প্রথম সেভ/ব্লার-এর পর) */
  const [showErrors, setShowErrors] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);


  /** এই ব্রাউজারের গেস্ট কোড — লগইন থাকুক বা না থাকুক, ফলব্যাক হিসেবে লাগে */
  const guestToken = useMemo(() => getGuestToken(), []);
  /** প্রেসক্রিপশনটি গেস্ট-কোড দিয়ে পড়া হয়েছে কিনা — তাহলে সার্ভারে সেভ করা যাবে না */
  const [viaGuest, setViaGuest] = useState(false);
  /** ড্রাফট একবারই ইনিশিয়ালাইজ হবে — রিফেচ হলে ব্যবহারকারীর এডিট মুছে যাবে না */
  const initRef = useRef(false);

  /** আগে লগইন-পাথে পড়ি; না পেলে (গেস্ট হিসেবে আপলোড করা) গেস্ট কোড দিয়ে পড়ি */
  const runRead = useCallback(
    async (force?: boolean): Promise<Result> => {
      if (user) {
        try {
          const r = (await read({ data: force ? { id, force: true } : { id } })) as Result;
          setViaGuest(false);
          return r;
        } catch (e) {
          if (!guestToken) throw e;
        }
      }
      const g = (await readGuest({
        data: force ? { id, token: guestToken, force: true } : { id, token: guestToken },
      })) as Result;
      setViaGuest(true);
      return g;
    },
    [user, read, readGuest, id, guestToken],
  );

  const { data: fetched, isLoading, error, refetch } = useQuery<Result>({
    queryKey: ["rx-read", id, user ? "user" : "guest"],
    enabled: !!user || !!guestToken,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: () => runRead(),
  });



  const auditQ = useQuery({
    queryKey: ["rx-audit", id],
    enabled: !!user,
    retry: false,
    queryFn: () => audit({ data: { id } }),
  });


  const data = edited ?? fetched ?? null;

  // প্রথমবার লোড হলে সেভ করা সিলেকশন ও ধাপ ফিরিয়ে আনি (রিফেচে এডিট মুছবে না)
  useEffect(() => {
    if (!fetched || initRef.current) return;
    initRef.current = true;
    setDraft(fetched.read.items.map((it) => ({ ...it })));
    setBase(fetched.read.items.map((it) => ({ ...it })));
    setMeta(metaOf(fetched.read));
    const savedSel = loadJson<Record<number, Sel>>(selKey(id), {});
    const next: Record<number, Sel> = {};
    fetched.items.forEach((_, i) => {
      next[i] = savedSel[i] ?? { ...DEF_SEL };
    });
    setSel(next);
    setStep(loadJson<boolean>(stepKey(id), false) ? "details" : "verify");
  }, [fetched, id]);


  useEffect(() => {
    if (typeof window === "undefined" || !data) return;
    window.localStorage.setItem(selKey(id), JSON.stringify(sel));
  }, [sel, id, data]);

  const order = useMemo(() => {

    if (!data) return { lines: [] as Array<{ p: Product; qty: number }>, total: 0, discount: 0, payable: 0, mrp: 0 };
    const lines: Array<{ p: Product; qty: number }> = [];
    data.items.forEach((row, i) => {
      const s = sel[i];
      if (!s || s.skip) return;
      const p = row.matches[s.match];
      if (!p) return;
      lines.push({ p, qty: s.qty });
    });
    const total = lines.reduce((a, l) => a + l.p.price * l.qty, 0);
    const discount = Math.round(total * RX_DISCOUNT);
    return {
      lines,
      total,
      discount,
      payable: total - discount,
      mrp: lines.reduce((a, l) => a + (l.p.mrp || l.p.price) * l.qty, 0),
    };

  }, [data, sel]);

  /** ইন্টার‍্যাকশন পরীক্ষার জন্য নির্বাচিত ঔষধ */
  const interactionMeds = useMemo(() => {
    const src = draft ?? data?.read.items ?? [];
    return src
      .map((it, i) => {
        const s = sel[i] ?? DEF_SEL;
        if (s.skip) return null;
        const p = data?.items[i]?.matches[s.match];
        return {
          name: p?.en || p?.name || it.name || it.raw,
          generic: p?.generic || it.generic,
          strength: p?.strength || it.strength,
        };
      })
      .filter(Boolean) as Array<{ name: string; generic: string; strength: string }>;
  }, [draft, data, sel]);



  // লগইন ছাড়াও গেস্ট কোড দিয়ে প্রেসক্রিপশন দেখা ও অর্ডার করা যায়


  const setSelAt = (i: number, s: Partial<Sel>) =>
    setSel((p) => ({ ...p, [i]: { ...(p[i] ?? DEF_SEL), ...s } }));

  /** যাচাইয়ের সময় কী কী বদলেছে তার তালিকা */
  const diffChanges = (): RxChange[] => {
    if (!draft || !base) return [];
    const fields: Array<[keyof RxReadItem, string]> = [
      ["name", t("ব্র্যান্ড", "Brand")],
      ["generic", t("জেনেরিক", "Generic")],
      ["strength", t("মাত্রা", "Strength")],
      ["form", t("ফর্ম", "Form")],
      ["dose", t("সেবনবিধি", "Frequency")],
      ["duration", t("সময়কাল", "Duration")],
      ["instruction", t("নির্দেশনা", "Timing")],
    ];
    const out: RxChange[] = [];
    draft.forEach((it, i) => {
      const b = base[i];
      const label = it.name || it.raw;
      for (const [f, fl] of fields) {
        const from = String(b?.[f] ?? "");
        const to = String(it[f] ?? "");
        if (b && from !== to) out.push({ line: i + 1, medicine: label, field: fl, from: from || "—", to: to || "—" });
      }
      const s = sel[i] ?? DEF_SEL;
      if (s.qty !== 1) out.push({ line: i + 1, medicine: label, field: t("পরিমাণ", "Qty"), from: "1", to: String(s.qty) });
      if (s.skip) out.push({ line: i + 1, medicine: label, field: t("অর্ডার", "Order"), from: t("অন্তর্ভুক্ত", "included"), to: t("বাদ", "excluded") });
      const p = data?.items[i]?.matches[s.match];
      if (p && s.match !== 0) out.push({ line: i + 1, medicine: label, field: t("প্যাক/ইউনিট", "Pack/unit"), from: "—", to: `${p.name} · ${packLabel(p)}` });
    });
    return out;
  };

  /** চলতি ভ্যালিডেশন ত্রুটি */
  const errors = useMemo(() => validateRx(meta, draft ?? [], t.en), [meta, draft, t.en]);
  const errTotal = errCount(errors);

  /** এডিট চিহ্নিত করি — অটোসেভ চালু হবে */
  const touch = () => {
    setDirty(true);
    setSaveErr("");
  };

  const patchMeta = (patch: Partial<RxMeta>) => {
    setMeta((m) => ({ ...m, ...patch }));
    touch();
  };

  const patchItem = (i: number, patch: Partial<RxReadItem>) => {
    setDraft((d) => d?.map((x, j) => (j === i ? { ...x, ...patch } : x)) ?? d);
    touch();
  };

  /** নতুন ঔষধের লাইন যোগ */
  const addRow = () => {
    setDraft((d) => [...(d ?? []), emptyItem()]);
    setSel((p) => ({ ...p, [(draft?.length ?? 0)]: { ...DEF_SEL } }));
    touch();
    setShowErrors(true);
  };

  /** লাইন মুছে ফেলা — সিলেকশনও সরিয়ে নেওয়া হয় */
  const removeRow = (i: number) => {
    setDraft((d) => d?.filter((_, j) => j !== i) ?? d);
    setSel((p) => {
      const next: Record<number, Sel> = {};
      Object.keys(p)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach((k) => {
          if (k === i) return;
          next[k > i ? k - 1 : k] = p[k]!;
        });
      return next;
    });
    setEdited((e) => (e ? ({ ...e, items: e.items.filter((_, j) => j !== i) } as Result) : e));
    touch();
  };

  /** সেভ / আপডেট — লগইন থাকলে সার্ভারে, গেস্ট হলে এই ডিভাইসে */
  const persist = useCallback(
    async (silent: boolean) => {
      if (!data || !draft) return false;
      const v = validateRx(meta, draft, t.en);
      if (errCount(v) > 0) {
        setShowErrors(true);
        if (!silent)
          toast.error(
            t(`${errCount(v)}টি ঘর ঠিক করা দরকার — লাল লেখা দেখুন`, `${errCount(v)} field(s) need fixing — see the red messages`),
          );
        return false;
      }
      setAutoSaving(true);
      try {
        const payload: RxRead = { ...data.read, ...meta, items: draft };
        const res = user
          ? ((await save({ data: { id, read: payload, changes: diffChanges() } })) as Result)
          : ({ ...data, read: payload } as Result);
        setEdited(res);
        setBase(draft.map((x) => ({ ...x })));
        setDirty(false);
        setSaveErr("");
        setSavedAt(new Date().toISOString());
        if (typeof window !== "undefined")
          window.localStorage.setItem(`rx-draft-${id}`, JSON.stringify({ meta, items: draft }));
        if (user) void auditQ.refetch();
        if (!silent) toast.success(t("সংরক্ষিত হয়েছে", "Saved"));
        return true;
      } catch (e) {
        const msg = (e as Error).message;
        setSaveErr(msg);
        if (!silent) toast.error(msg);
        return false;
      } finally {
        setAutoSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, draft, meta, user, id, t.en, sel],
  );

  /** অটোসেভ — এডিট থামার ১.৫ সেকেন্ড পর নিজে থেকেই সেভ */
  useEffect(() => {
    if (!dirty || errTotal > 0) return;
    const timer = setTimeout(() => {
      void persist(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [dirty, errTotal, persist]);

  const confirm = async () => {
    if (!data || !draft) return;
    setSaving(true);
    try {
      const changes = diffChanges();
      const payload: RxRead = { ...data.read, ...meta, items: draft };
      // গেস্ট হলে সার্ভারে সেভ না করে স্থানীয়ভাবেই যাচাই সম্পন্ন হয়
      const res = user
        ? ((await save({ data: { id, read: payload, confirmed: true, changes } })) as Result)
        : ({ ...data, read: payload } as Result);

      setEdited(res);
      setMeta(metaOf(res.read));
      setDraft(res.read.items.map((it) => ({ ...it })));
      setBase(res.read.items.map((it) => ({ ...it })));
      setSel((prev) => {
        const next: Record<number, Sel> = {};
        res.items.forEach((_, i) => (next[i] = prev[i] ?? { ...DEF_SEL }));
        return next;
      });
      setStep("details");
      if (typeof window !== "undefined") window.localStorage.setItem(stepKey(id), "true");
      void auditQ.refetch();
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

  const buildSummary = (): RxSummary | null => {
    if (!data) return null;
    return {
      id: data.id,
      patientName: meta.patientName,
      patientAge: meta.patientAge,
      patientAddress: meta.patientAddress,
      hospital: meta.hospital,
      doctorQualification: meta.doctorQualification,
      doctorName: meta.doctorName,
      date: meta.date,
      advice: meta.advice,
      note: data.read.note,
      verifiedAt: data.parsedAt,
      total: order.payable,
      // সবসময় সর্বশেষ এডিট করা (draft) লাইনগুলো প্রিন্টে যায়
      lines: (draft ?? data.read.items).map((item, i) => {
        const s = sel[i] ?? DEF_SEL;
        const p = data.items[i]?.matches[s.match];
        return {
          no: i + 1,
          name: p ? (t.en ? p.en || p.name : p.name) : item.name || item.raw,
          generic: p?.generic || item.generic,
          strength: p?.strength || item.strength,
          form: p?.form || item.form,
          pack: p?.pack ?? "",
          dose: item.dose,
          duration: item.duration,
          instruction: item.instruction,
          qty: s.qty,
          price: p?.price ?? 0,
          confidence: item.confidence,
          excluded: s.skip,
        };
      }),

    };
  };

  const exportPdf = () => {
    const s = buildSummary();
    if (!s) return;
    if (!printRxSummary(s, { en: t.en, n: t.n })) {
      toast.error(t("পপ-আপ ব্লক করা আছে — অনুমতি দিন", "Pop-up blocked — please allow pop-ups"));
    }
  };

  const shareSummary = async () => {
    const s = buildSummary();
    if (!s) return;
    const text = rxSummaryText(s, { en: t.en, n: t.n });
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: t("প্রেসক্রিপশন সারাংশ", "Prescription summary"), text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success(t("সারাংশ কপি হয়েছে", "Summary copied"));
    } catch {
      /* user cancelled */
    }
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
              await runRead(true);
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
          {t("ঔষধওয়ালা পড়ছে... কিছুক্ষণ অপেক্ষা করুন।", "Oushodhwala is reading... please wait.")}
        </p>
      )}
      {error && (
        <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="flex items-start gap-2 text-[12px] font-bold text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {t("প্রেসক্রিপশনটি পড়া যায়নি", "Could not read the prescription")}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{(error as Error).message}</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
            <li>{t("ছবিটি যেন স্পষ্ট ও আলোকিত হয় — ঝাপসা বা কাটা ছবি এড়িয়ে চলুন।", "Use a clear, well-lit photo — avoid blur or cropped edges.")}</li>
            <li>{t("পুরো কাগজটি ফ্রেমে রাখুন, ঔষধের নামগুলো যেন দেখা যায়।", "Keep the whole page in frame so medicine names are visible.")}</li>
            <li>{t("সমস্যা থাকলে ০৯৬১৩-০০০০০০ নম্বরে কল করুন, আমরা ম্যানুয়ালি পড়ে দেব।", "Still stuck? Call 09613-000000 and we will read it manually.")}</li>
          </ul>
          <button
            onClick={async () => {
              setRefreshing(true);
              try {
                await runRead(true);
                setEdited(null);
                await refetch();
                toast.success(t("আবার পড়া হয়েছে", "Re-read complete"));
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setRefreshing(false);
              }
            }}
            disabled={refreshing}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {t("আবার পড়ুন", "Re-read")}
          </button>
        </div>
      )}

      {/* ডিবাগ প্যানেল — রিকোয়েস্ট আইডি, গেটওয়ে স্ট্যাটাস ও ভ্যালিডেশন ত্রুটি */}
      <RxDebugPanel
        debug={(fetched?.debug ?? (error as (Error & { debug?: RxDebug }) | null)?.debug) ?? null}
        open={debugOpen}
        onToggle={() => setDebugOpen((v) => !v)}
      />


      {data && (
        <>
          <section className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
            <Field t={t("হাসপাতাল / চেম্বার", "Hospital")} v={meta.hospital || "—"} />
            <Field t={t("ডাক্তার", "Doctor")} v={meta.doctorName || "—"} />
            <Field t={t("রোগী", "Patient")} v={meta.patientName || "—"} />
            <Field t={t("বয়স", "Age")} v={meta.patientAge || "—"} />
            <Field t={t("ঠিকানা", "Address")} v={meta.patientAddress || "—"} />
            <Field t={t("তারিখ", "Date")} v={meta.date || "—"} />
            <Field t={t("শনাক্ত ঔষধ", "Medicines found")} v={t.n(data.items.length)} />
            <Field t={t("রিডিং আইডি", "Reading ID")} v={id.slice(0, 8)} />
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

          {(draft?.length ?? 0) === 0 && data.items.length === 0 ? (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t("কোনো ঔষধ শনাক্ত করা যায়নি। স্পষ্ট ছবি আপলোড করে আবার চেষ্টা করুন।", "No medicine could be detected. Please upload a clearer photo.")}
              </p>
              <button onClick={addRow} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold">
                <Plus className="h-3.5 w-3.5" /> {t("হাতে ঔষধ যোগ করুন", "Add medicine manually")}
              </button>
            </div>
          ) : step === "verify" ? (
            <>
              <p className="mt-4 text-xs text-muted-foreground">
                {t(
                  "প্রতিটি ঔষধের নাম, জেনেরিক, মাত্রা, প্যাক ও সেবনবিধি যাচাই করুন — প্রয়োজনে সম্পাদনা করুন। পরিবর্তন নিজে থেকেই সেভ হয়ে যায়।",
                  "Check each medicine's brand, generic, strength, pack and dosage — edit if needed. Changes save automatically.",
                )}
              </p>

              <SaveBar
                t={t}
                dirty={dirty}
                saving={autoSaving}
                savedAt={savedAt}
                errTotal={showErrors ? errTotal : 0}
                error={saveErr}
                onSave={() => void persist(false)}
                onPrint={exportPdf}
              />

              <MetaEditor meta={meta} onChange={patchMeta} errors={showErrors ? errors.meta : {}} />

              <RxTable
                items={draft ?? []}
                rows={data.items}
                sel={sel}
                onSel={setSelAt}
                onChange={patchItem}
                errors={showErrors ? errors.items : {}}
                onRemove={removeRow}
                onAdd={addRow}
              />

              <div className="mt-4 rounded-xl border border-border bg-card p-3">
                <p className="text-[11px] text-muted-foreground">
                  {t("চলতি অর্ডার প্রিভিউ", "Live order preview")} · {t.n(order.lines.length)} {t("আইটেম", "items")}
                </p>
                <p className="text-base font-extrabold text-primary">৳{t.n(order.total)}</p>
              </div>

              <button
                onClick={() => {
                  setShowErrors(true);
                  if (errTotal > 0) {
                    toast.error(t("আগে লাল চিহ্নিত ঘরগুলো ঠিক করুন", "Please fix the highlighted fields first"));
                    return;
                  }
                  void confirm();
                }}
                disabled={saving}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                {saving ? t("সেভ হচ্ছে...", "Saving...") : t("নিশ্চিত করে দাম দেখুন", "Confirm & see prices")}
              </button>
            </>
          ) : (

            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setStep("verify");
                    if (typeof window !== "undefined") window.localStorage.removeItem(stepKey(id));
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold"
                >
                  <Pencil className="h-3.5 w-3.5" /> {t("আবার যাচাই করুন", "Edit verification")}
                </button>
                <button
                  onClick={exportPdf}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold"
                >
                  <FileText className="h-3.5 w-3.5" /> {t("PDF / প্রিন্ট", "PDF / Print")}
                </button>
                <button
                  onClick={shareSummary}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold"
                >
                  <Share2 className="h-3.5 w-3.5" /> {t("সারাংশ শেয়ার", "Share summary")}
                </button>
              </div>

              {/* ঔষধওয়ালার নিজস্ব ফরম্যাটে প্রেসক্রিপশন শিট — বিস্তারিত + দাম + ১০% ছাড় */}
              <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-3 py-2.5">
                  <BrandLogo size={30} />
                  <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {t("প্রেসক্রিপশন শিট", "Prescription sheet")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-3">
                  <Field t={t("হাসপাতাল / চেম্বার", "Hospital / chamber")} v={meta.hospital || "—"} />
                  <Field t={t("ডাক্তার", "Doctor")} v={[meta.doctorName, meta.doctorQualification].filter(Boolean).join(", ") || "—"} />
                  <Field t={t("প্রেসক্রিপশনের তারিখ", "Rx date")} v={meta.date || "—"} />
                  <Field t={t("রোগী", "Patient")} v={meta.patientName || "—"} />
                  <Field t={t("বয়স", "Age")} v={meta.patientAge || "—"} />
                  <Field t={t("ঠিকানা", "Address")} v={meta.patientAddress || "—"} />
                </div>

                <ul className="divide-y divide-border">
                  {data.items.map((row, i) => {
                    const s = sel[i] ?? DEF_SEL;
                    const p = row.matches[s.match];
                    const name = p ? (t.en ? p.en || p.name : p.name) : row.item.name || row.item.raw;
                    const lineTotal = (p?.price ?? 0) * s.qty;
                    return (
                      <li key={i} className={`px-3 py-2.5 text-[11px] ${s.skip ? "opacity-50" : ""}`}>
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 text-[10px] font-bold text-muted-foreground">{t.n(i + 1)}.</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold">{name}</p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {[p?.generic || row.item.generic, p?.strength || row.item.strength, p?.form || row.item.form]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </p>
                            <p className="mt-0.5 text-[10px]">
                              <span className="font-semibold">{t("সেবনবিধি", "Dosage")}:</span>{" "}
                              {[row.item.dose, row.item.duration, row.item.instruction].filter(Boolean).join(" · ") || "—"}
                            </p>
                            {p?.pack && (
                              <p className="text-[10px] text-muted-foreground">
                                {t("প্যাক", "Pack")}: {p.pack}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[10px] text-muted-foreground">
                              {t.n(s.qty)} × ৳{t.n(p?.price ?? 0)}
                            </p>
                            <p className="text-xs font-extrabold">
                              {s.skip ? t("বাদ", "Excluded") : `৳${t.n(lineTotal)}`}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="space-y-1 border-t border-border bg-secondary/40 px-3 py-2.5 text-[11px]">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">{t("সাবটোটাল", "Subtotal")}</span>
                    <span className="font-semibold">৳{t.n(order.total)}</span>
                  </p>
                  <p className="flex justify-between text-primary">
                    <span className="font-semibold">{t("ঔষধওয়ালা ছাড় (১০%)", "Oushodhwala discount (10%)")}</span>
                    <span className="font-bold">− ৳{t.n(order.discount)}</span>
                  </p>
                  <p className="flex justify-between border-t border-border pt-1.5 text-sm">
                    <span className="font-bold">{t("সর্বমোট", "Payable")}</span>
                    <span className="font-extrabold text-primary">৳{t.n(order.payable)}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {t(
                      "ডেলিভারি চার্জ প্রযোজ্য হতে পারে। লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট যাচাইয়ের পর অর্ডার নিশ্চিত হবে।",
                      "Delivery charge may apply. The order is confirmed after licensed pharmacist verification.",
                    )}
                  </p>
                </div>
              </section>

              <p className="mt-4 text-[11px] font-bold text-muted-foreground">
                {t("ঔষধের বিস্তারিত ও বিকল্প", "Medicine details & alternatives")}
              </p>
              <ul className="mt-2 space-y-3">
                {data.items.map((row, i) => (
                  <RxRow key={i} index={i} row={row} sel={sel[i] ?? DEF_SEL} onSel={(s) => setSelAt(i, s)} />
                ))}
              </ul>

              {meta.advice && (
                <section className="mt-5 rounded-xl border border-border bg-card p-3">
                  <h2 className="text-xs font-bold">{t("ডাক্তারের পরামর্শ", "Doctor's advice")}</h2>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{meta.advice}</p>
                </section>
              )}

              <section className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
                <div className="mx-auto flex max-w-3xl items-center gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">
                      {t("অর্ডার প্রিভিউ", "Order preview")} · {t.n(order.lines.length)} {t("আইটেম", "items")} ·{" "}
                      <span className="font-semibold text-primary">{t("১০% ছাড়সহ", "incl. 10% off")}</span>
                    </p>
                    <p className="text-base font-extrabold text-primary">
                      ৳{t.n(order.payable)}
                      {order.total > order.payable && (
                        <span className="ml-2 text-[11px] font-semibold text-muted-foreground line-through">৳{t.n(order.total)}</span>
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
                  <Link to="/cart" className="rounded-xl border border-border px-3 py-2.5 text-xs font-bold">
                    {t("কার্ট", "Cart")}
                  </Link>
                </div>
              </section>
            </>
          )}

          <RxInteractions meds={interactionMeds} />

          {user && <RxShareManager id={id} />}

          {user && <RxVersions rows={auditQ.data ?? []} />}

          {!user && (
            <div className="mt-4 rounded-xl border border-border bg-card p-3 text-[11px] text-muted-foreground">
              {t(
                "আপনি লগইন ছাড়া দেখছেন — ফলাফলটি এই ডিভাইসে গোপন কোড দিয়ে সংরক্ষিত। অন্য ডিভাইসে দেখতে বা শেয়ার করতে লগইন করুন।",
                "You are viewing without login — this result is kept on this device with a private code. Log in to view or share it elsewhere.",
              )}
            </div>
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

/** প্রতিটি অংশের আলাদা OCR কনফিডেন্স — কোনটা কেন অনিশ্চিত */
function ConfBreakdown({ item }: { item: RxReadItem }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const fc = item.fieldConf ?? { name: 0, strength: 0, form: 0, dose: 0, duration: 0, instruction: 0 };
  const rows: Array<{ label: string; value: string; c: number }> = [
    { label: t("ব্র্যান্ড নাম", "Brand"), value: item.name, c: fc.name },
    { label: t("মাত্রা", "Strength"), value: item.strength, c: fc.strength },
    { label: t("ফর্ম", "Form"), value: item.form, c: fc.form },
    { label: t("সেবনবিধি", "Frequency"), value: item.dose, c: fc.dose },
    { label: t("সময়কাল", "Duration"), value: item.duration, c: fc.duration },
    { label: t("নির্দেশনা", "Timing"), value: item.instruction, c: fc.instruction },
  ];
  const weak = rows.filter((r) => r.c < 0.6).length;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg bg-secondary px-2.5 py-1.5 text-[10px] font-bold"
      >
        <span>
          {t("OCR কনফিডেন্স বিশ্লেষণ", "OCR confidence breakdown")}
          {weak > 0 && <span className="ml-1.5 text-sale">· {t.n(weak)} {t("অংশ অনিশ্চিত", "uncertain")}</span>}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-1.5 space-y-1.5 rounded-lg border border-border p-2">
          {rows.map((r) => {
            const pct = Math.round(r.c * 100);
            const tone = r.c >= 0.75 ? "bg-primary" : r.c >= 0.5 ? "bg-accent-foreground" : "bg-sale";
            return (
              <div key={r.label} className="text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="w-20 shrink-0 font-semibold text-muted-foreground">{r.label}</span>
                  <span className="min-w-0 flex-1 truncate">{r.value || t("লেখা নেই", "not written")}</span>
                  <span className={`shrink-0 font-bold ${r.c >= 0.75 ? "text-primary" : r.c >= 0.5 ? "text-foreground" : "text-sale"}`}>
                    {t.n(pct)}%
                  </span>
                </div>
                <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={`h-full ${tone}`} style={{ width: `${Math.max(3, pct)}%` }} />
                </div>
              </div>
            );
          })}
          <p className="pt-1 text-[10px] text-muted-foreground">
            <span className="font-semibold">{t("কারণ", "Why")}: </span>
            {item.reason || t("হাতের লেখা স্পষ্ট — উল্লেখযোগ্য সন্দেহ নেই।", "Handwriting is clear — no notable doubt.")}
          </p>
        </div>
      )}
    </div>
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

const DOSE_OPTS = ["0", "½", "1", "1½", "2", "3"];

/** ফ্রিকোয়েন্সি, সময় ও সময়কাল যাচাই করার এডিটর */
function DosageEditor({ item, onChange }: { item: RxReadItem; onChange: (patch: Partial<RxReadItem>) => void }) {
  const t = useT();
  const parts = (item.dose || "").split("+").map((s) => s.trim());
  const slot = (i: number) => (parts.length === 3 ? parts[i] ?? "0" : "");
  const setSlot = (i: number, v: string) => {
    const cur = parts.length === 3 ? [...parts] : ["0", "0", "0"];
    cur[i] = v;
    onChange({ dose: cur.join("+") });
  };

  const durNum = (item.duration.match(/\d+/) ?? [""])[0];
  const durUnit = /সপ্তাহ|week/i.test(item.duration)
    ? "week"
    : /মাস|month/i.test(item.duration)
      ? "month"
      : /চলবে|continue/i.test(item.duration)
        ? "cont"
        : "day";
  const setDur = (num: string, unit: string) => {
    if (unit === "cont") return onChange({ duration: t("চলবে", "Continue") });
    if (!num) return onChange({ duration: "" });
    const label = unit === "week" ? t("সপ্তাহ", "weeks") : unit === "month" ? t("মাস", "months") : t("দিন", "days");
    onChange({ duration: `${num} ${label}` });
  };

  const timings = [
    { v: "before", bn: "খাবারের আগে", en: "Before food" },
    { v: "after", bn: "খাবারের পরে", en: "After food" },
    { v: "with", bn: "খাবারের সাথে", en: "With food" },
    { v: "empty", bn: "খালি পেটে", en: "Empty stomach" },
    { v: "bed", bn: "ঘুমানোর আগে", en: "At bedtime" },
  ];
  const activeTiming = timings.find((x) => item.instruction.includes(x.bn) || item.instruction.toLowerCase().includes(x.en.toLowerCase()));

  return (
    <div className="mt-2 rounded-lg border border-border bg-secondary/40 p-2">
      <p className="text-[10px] font-bold">{t("সেবনবিধি এডিটর — যাচাই করুন", "Dosage editor — verify before saving")}</p>

      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {[t("সকাল", "Morning"), t("দুপুর", "Noon"), t("রাত", "Night")].map((lbl, i) => (
          <label key={lbl} className="block">
            <span className="text-[10px] font-semibold text-muted-foreground">{lbl}</span>
            <select
              value={slot(i) || "0"}
              onChange={(e) => setSlot(i, e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs"
            >
              {DOSE_OPTS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <label className="block">
          <span className="text-[10px] font-semibold text-muted-foreground">{t("সময়", "Timing")}</span>
          <select
            value={activeTiming?.v ?? ""}
            onChange={(e) => {
              const found = timings.find((x) => x.v === e.target.value);
              onChange({ instruction: found ? t(found.bn, found.en) : "" });
            }}
            className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs"
          >
            <option value="">{t("উল্লেখ নেই", "Not specified")}</option>
            {timings.map((x) => (
              <option key={x.v} value={x.v}>
                {t(x.bn, x.en)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <label className="block">
            <span className="text-[10px] font-semibold text-muted-foreground">{t("সময়কাল", "Duration")}</span>
            <input
              inputMode="numeric"
              value={durUnit === "cont" ? "" : durNum}
              onChange={(e) => setDur(e.target.value.replace(/\D/g, ""), durUnit === "cont" ? "day" : durUnit)}
              className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold text-muted-foreground">{t("একক", "Unit")}</span>
            <select
              value={durUnit}
              onChange={(e) => setDur(durNum, e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs"
            >
              <option value="day">{t("দিন", "Days")}</option>
              <option value="week">{t("সপ্তাহ", "Weeks")}</option>
              <option value="month">{t("মাস", "Months")}</option>
              <option value="cont">{t("চলবে", "Continue")}</option>
            </select>
          </label>
        </div>
      </div>

      <p className="mt-1.5 text-[10px] text-muted-foreground">
        {t("সারাংশ", "Summary")}:{" "}
        <span className="font-semibold text-foreground">
          {[item.dose, item.duration, item.instruction].filter(Boolean).join(" · ") || t("কিছু নির্ধারণ করা হয়নি", "nothing set")}
        </span>
      </p>
    </div>
  );
}

function QtyBox({ qty, onQty }: { qty: number; onQty: (n: number) => void }) {
  const t = useT();
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border">
      <button onClick={() => onQty(Math.max(1, qty - 1))} className="px-2 py-2" aria-label={t("কমান", "Decrease")}>
        <Minus className="h-3 w-3" />
      </button>
      <input
        inputMode="numeric"
        value={String(qty)}
        onChange={(e) => onQty(Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))}
        className="w-10 bg-transparent text-center text-xs font-bold outline-none"
      />
      <button onClick={() => onQty(qty + 1)} className="px-2 py-2" aria-label={t("বাড়ান", "Increase")}>
        <Plus className="h-3 w-3" />
      </button>
    </div>
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

      <ConfBreakdown item={item} />

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

                <div className="ml-auto">
                  <QtyBox qty={sel.qty} onQty={(n) => onSel({ qty: n })} />
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
                  {(t.en ? m.en || m.name : m.name)} · {packLabel(m)} · ৳{t.n(m.price)}
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

/** আলাদা সেল — কর্পোরেট শিটের প্রতিটি তথ্য নিজের ঘরে */
function Field({ t, v }: { t: string; v: string }) {
  return (
    <div className="min-w-0 bg-card px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t}</p>
      <p className="truncate text-xs font-bold" title={v}>
        {v}
      </p>
    </div>
  );
}

/** হাসপাতাল / ডাক্তার / রোগীর তথ্য — প্রতিটি আলাদা সেলে, সরাসরি এডিটযোগ্য */
function MetaEditor({
  meta,
  onChange,
  errors = {},
}: {
  meta: RxMeta;
  onChange: (patch: Partial<RxMeta>) => void;
  errors?: Partial<Record<keyof RxMeta, string>>;
}) {
  const t = useT();
  const cells: Array<{ k: keyof RxMeta; label: string; ph: string }> = [
    { k: "hospital", label: t("হাসপাতাল / চেম্বার", "Hospital / chamber"), ph: t("যেমন: ঢাকা মেডিকেল", "e.g. Dhaka Medical") },
    { k: "doctorName", label: t("ডাক্তারের নাম", "Doctor name"), ph: t("ডাঃ ...", "Dr. ...") },
    { k: "doctorQualification", label: t("ডিগ্রি / পদবি", "Qualification"), ph: "MBBS, FCPS" },
    { k: "patientName", label: t("রোগীর নাম", "Patient name"), ph: t("রোগীর নাম", "Patient name") },
    { k: "patientAge", label: t("বয়স", "Age"), ph: t("যেমন: ৩৫ বছর", "e.g. 35 years") },
    { k: "date", label: t("প্রেসক্রিপশনের তারিখ", "Rx date"), ph: t("দিন-মাস-বছর", "dd-mm-yyyy") },
    { k: "patientAddress", label: t("ঠিকানা", "Address"), ph: t("রোগীর ঠিকানা", "Patient address") },
  ];

  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-3 py-2">
        <Pencil className="h-3.5 w-3.5 text-primary" />
        <p className="text-[11px] font-bold">{t("প্রেসক্রিপশনের তথ্য — প্রয়োজনে ঠিক করুন", "Prescription details — correct if needed")}</p>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
        {cells.map((c) => (
          <label key={c.k} className={`block bg-card px-3 py-2 ${c.k === "patientAddress" ? "col-span-2 sm:col-span-3" : ""}`}>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</span>
            <input
              value={meta[c.k]}
              placeholder={c.ph}
              onChange={(e) => onChange({ [c.k]: e.target.value } as Partial<RxMeta>)}
              aria-invalid={!!errors[c.k]}
              className={`mt-0.5 w-full bg-transparent text-xs font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/60 ${
                errors[c.k] ? "text-destructive" : ""
              }`}
            />
            {errors[c.k] && <span className="mt-0.5 block text-[10px] font-semibold text-destructive">{errors[c.k]}</span>}
          </label>
        ))}

        <label className="col-span-2 block bg-card px-3 py-2 sm:col-span-3">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("ডাক্তারের পরামর্শ", "Doctor's advice")}
          </span>
          <textarea
            value={meta.advice}
            rows={2}
            placeholder={t("বিশ্রাম, পরীক্ষা, ফলো-আপ ইত্যাদি", "Rest, tests, follow-up etc.")}
            onChange={(e) => onChange({ advice: e.target.value })}
            className="mt-0.5 w-full resize-y bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
          />
        </label>
      </div>
    </section>
  );
}

const TH = "whitespace-nowrap px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground";
const CELL = "border-l border-border px-1.5 py-1.5 align-top";

function CellInput({
  value,
  onChange,
  w = "w-28",
  ph,
  err,
}: {
  value: string;
  onChange: (v: string) => void;
  w?: string;
  ph?: string;
  err?: string;
}) {
  return (
    <div className={w}>
      <input
        value={value}
        placeholder={ph ?? "—"}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!err}
        className={`w-full rounded-md bg-transparent px-1.5 py-1 text-[11px] font-semibold outline-none focus:bg-secondary placeholder:font-normal placeholder:text-muted-foreground/50 ${
          err ? "text-destructive ring-1 ring-destructive/60" : ""
        }`}
      />
      {err && <p className="px-1 pt-0.5 text-[9px] font-semibold leading-tight text-destructive">{err}</p>}
    </div>
  );
}

/** ঔষধের সম্পূর্ণ তালিকা — এক টেবিলে, প্রতিটি অপশন আলাদা সেলে ও এডিটযোগ্য */
function RxTable({
  items,
  rows,
  sel,
  onSel,
  onChange,
  errors = {},
  onAdd,
  onRemove,
}: {
  items: RxReadItem[];
  rows: Row[];
  sel: Record<number, Sel>;
  onSel: (i: number, s: Partial<Sel>) => void;
  onChange: (i: number, patch: Partial<RxReadItem>) => void;
  errors?: Record<string, string>;
  onAdd?: () => void;
  onRemove?: (i: number) => void;
}) {

  const t = useT();
  const [open, setOpen] = useState<number | null>(null);

  const slots = (dose: string) => {
    const p = (dose || "").split("+").map((x) => x.trim());
    return p.length === 3 ? p : ["", "", ""];
  };
  const setSlot = (i: number, dose: string, k: number, v: string) => {
    const cur = slots(dose);
    const next = cur.map((x) => x || "0");
    next[k] = v;
    onChange(i, { dose: next.join("+") });
  };

  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-3 py-2">
        <FileText className="h-3.5 w-3.5 text-primary" />
        <p className="text-[11px] font-bold">{t("ঔষধের তালিকা — সব ঘর এডিট করা যায়", "Medicine table — every cell is editable")}</p>
        <span className="ml-auto text-[10px] text-muted-foreground">{t.n(items.length)} {t("আইটেম", "items")}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-[11px]">
          <thead className="bg-secondary/40">
            <tr>
              <th className={TH}>#</th>
              <th className={TH}>{t("ব্র্যান্ড", "Brand")}</th>
              <th className={TH}>{t("জেনেরিক", "Generic")}</th>
              <th className={TH}>{t("মাত্রা", "Strength")}</th>
              <th className={TH}>{t("ফর্ম", "Form")}</th>
              <th className={TH}>{t("সকাল", "Morn")}</th>
              <th className={TH}>{t("দুপুর", "Noon")}</th>
              <th className={TH}>{t("রাত", "Night")}</th>
              <th className={TH}>{t("সময়কাল", "Duration")}</th>
              <th className={TH}>{t("নির্দেশনা", "Timing")}</th>
              <th className={TH}>{t("প্যাক / ইউনিট", "Pack / unit")}</th>
              <th className={TH}>{t("পরিমাণ", "Qty")}</th>
              <th className={TH}>{t("মূল্য", "Amount")}</th>
              <th className={TH}>{t("অর্ডার", "Order")}</th>
              <th className={TH}>{t("মুছুন", "Del")}</th>

            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const row = rows[i];
              const matches = row?.matches ?? [];
              const s = sel[i] ?? DEF_SEL;
              const p = matches[s.match];
              const d = slots(item.dose);
              return (
                <Fragment key={i}>
                  <tr className={`border-t border-border ${s.skip ? "opacity-50" : ""}`}>
                    <td className="px-2 py-1.5 align-top">
                      <button
                        onClick={() => setOpen(open === i ? null : i)}
                        className="flex items-center gap-1 text-[10px] font-bold text-primary"
                        aria-expanded={open === i}
                      >
                        {t.n(i + 1)}
                        <ChevronDown className={`h-3 w-3 transition-transform ${open === i ? "rotate-180" : ""}`} />
                      </button>
                    </td>
                    <td className={CELL}>
                      <CellInput value={item.name} onChange={(v) => onChange(i, { name: v })} w="w-36" err={errors[`${i}.name`] ?? ""} />
                    </td>
                    <td className={CELL}>
                      <CellInput value={item.generic} onChange={(v) => onChange(i, { generic: v })} w="w-32" />
                    </td>
                    <td className={CELL}>
                      <CellInput value={item.strength} onChange={(v) => onChange(i, { strength: v })} w="w-20" err={errors[`${i}.strength`] ?? ""} />
                    </td>

                    <td className={CELL}>
                      <CellInput value={item.form} onChange={(v) => onChange(i, { form: v })} w="w-20" />
                    </td>
                    {[0, 1, 2].map((k) => (
                      <td key={k} className={CELL}>
                        <select
                          value={d[k] || "0"}
                          onChange={(e) => setSlot(i, item.dose, k, e.target.value)}
                          className={`w-14 rounded-md bg-transparent px-1 py-1 text-[11px] font-semibold outline-none focus:bg-secondary ${
                            errors[`${i}.dose`] ? "ring-1 ring-destructive/60" : ""
                          }`}
                        >
                          {DOSE_OPTS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                        {k === 2 && errors[`${i}.dose`] && (
                          <p className="pt-0.5 text-[9px] font-semibold leading-tight text-destructive">{errors[`${i}.dose`]}</p>
                        )}
                      </td>
                    ))}
                    <td className={CELL}>
                      <CellInput
                        value={item.duration}
                        onChange={(v) => onChange(i, { duration: v })}
                        w="w-20"
                        ph={t("৭ দিন", "7 days")}
                        err={errors[`${i}.duration`] ?? ""}
                      />
                    </td>
                    <td className={CELL}>
                      <CellInput value={item.instruction} onChange={(v) => onChange(i, { instruction: v })} w="w-28" ph={t("খাবারের পরে", "After food")} />
                    </td>

                    <td className={CELL}>
                      <select
                        value={String(s.match)}
                        onChange={(e) => onSel(i, { match: Number(e.target.value), skip: false })}
                        disabled={matches.length === 0}
                        className="w-40 rounded-md bg-transparent px-1 py-1 text-[11px] font-semibold outline-none focus:bg-secondary disabled:opacity-50"
                      >
                        {matches.length === 0 ? (
                          <option value="0">{t("ক্যাটালগে নেই", "Not in catalogue")}</option>
                        ) : (
                          matches.map((m, mi) => (
                            <option key={m.id} value={mi}>
                              {(t.en ? m.en || m.name : m.name)} · {packLabel(m)} · ৳{Math.round(m.price)}
                            </option>
                          ))
                        )}
                      </select>
                    </td>
                    <td className={CELL}>
                      <QtyBox qty={s.qty} onQty={(n) => onSel(i, { qty: n })} />
                    </td>
                    <td className={`${CELL} whitespace-nowrap font-extrabold text-primary`}>
                      {p ? `৳${t.n(Math.round(p.price * s.qty))}` : "—"}
                    </td>
                    <td className={CELL}>
                      <label className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={!s.skip}
                          onChange={(e) => onSel(i, { skip: !e.target.checked })}
                          className="h-3.5 w-3.5"
                        />
                        {s.skip ? t("বাদ", "Off") : t("আছে", "On")}
                      </label>
                    </td>
                    <td className={CELL}>
                      <button
                        onClick={() => onRemove?.(i)}
                        aria-label={t("লাইন মুছুন", "Remove line")}
                        className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                  {open === i && (
                    <tr className="border-t border-border bg-secondary/20">
                      <td colSpan={15} className="px-3 py-2">

                        <p className="text-[11px] text-muted-foreground">
                          {t("লেখা ছিল", "Written")}: “{item.raw}” <ConfBadge c={item.confidence} />
                        </p>
                        <ConfBreakdown item={item} />
                        {matches.length > 0 && (
                          <div className="mt-2">
                            <p className="text-[10px] font-semibold text-muted-foreground">
                              {t("সম্ভাব্য মিল — সঠিকটি বেছে নিন", "Possible matches — pick the correct one")}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {matches.map((m, mi) => (
                                <button
                                  key={m.id}
                                  onClick={() => onSel(i, { match: mi, skip: false })}
                                  className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                                    mi === s.match && !s.skip ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                                  }`}
                                >
                                  {(t.en ? m.en || m.name : m.name)} · {m.strength} · ৳{t.n(m.price)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-secondary/30 px-3 py-2">
        <button onClick={() => onAdd?.()} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-bold">
          <Plus className="h-3.5 w-3.5" /> {t("ঔষধ যোগ করুন", "Add medicine")}
        </button>
        <p className="text-[10px] text-muted-foreground">
          {t(
            "মোবাইলে টেবিলটি ডানে-বামে স্ক্রল করুন। নম্বরে ট্যাপ করলে OCR কনফিডেন্স ও বিকল্প ঔষধ দেখা যাবে।",
            "Scroll the table sideways on mobile. Tap the row number to see OCR confidence and alternative matches.",
          )}
        </p>
      </div>
    </section>
  );
}

/** সেভ/আপডেট বার — অটোসেভের অবস্থা, ম্যানুয়াল সেভ ও প্রিন্ট */
function SaveBar({
  t,
  dirty,
  saving,
  savedAt,
  errTotal,
  error,
  onSave,
  onPrint,
}: {
  t: ReturnType<typeof useT>;
  dirty: boolean;
  saving: boolean;
  savedAt: string;
  errTotal: number;
  error: string;
  onSave: () => void;
  onPrint: () => void;
}) {
  const status = saving
    ? t("সেভ হচ্ছে...", "Saving...")
    : errTotal > 0
      ? t(`${errTotal}টি ঘরে সমস্যা — অটোসেভ থেমে আছে`, `${errTotal} field(s) invalid — autosave paused`)
      : dirty
        ? t("অসংরক্ষিত পরিবর্তন", "Unsaved changes")
        : savedAt
          ? t(`সব সেভ হয়েছে · ${new Date(savedAt).toLocaleTimeString("bn-BD")}`, `All saved · ${new Date(savedAt).toLocaleTimeString()}`)
          : t("অটোসেভ চালু", "Autosave on");

  return (
    <div className="sticky top-14 z-20 mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 backdrop-blur">
      <span
        className={`flex items-center gap-1.5 text-[11px] font-semibold ${
          errTotal > 0 || error ? "text-destructive" : dirty || saving ? "text-sale" : "text-primary"
        }`}
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        {error || status}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button onClick={onPrint} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold">
          <Printer className="h-3.5 w-3.5" /> {t("প্রিন্ট / PDF", "Print / PDF")}
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" /> {t("সেভ / আপডেট", "Save / Update")}
        </button>
      </div>
    </div>
  );
}


/** ডিবাগ লগ প্যানেল — রিকোয়েস্ট আইডি, গেটওয়ে স্ট্যাটাস ও ভ্যালিডেশন ত্রুটি */
function RxDebugPanel({ debug, open, onToggle }: { debug: RxDebug | null; open: boolean; onToggle: () => void }) {
  const t = useT();
  if (!debug) return null;
  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-border">
      <button onClick={onToggle} className="flex w-full items-center gap-2 bg-secondary/50 px-3 py-2 text-left">
        <Bug className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-bold">{t("ডিবাগ লগ", "Debug log")}</span>
        <span className="text-[10px] text-muted-foreground">ref: {debug.requestId.slice(0, 12)}</span>
        <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-2 px-3 py-2">
          <p className="text-[10px] text-muted-foreground">
            {t("ক্যাশ", "Cached")}: {debug.cached ? t("হ্যাঁ", "yes") : t("না", "no")} · {t("সময়", "At")}: {debug.at}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[10px]">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-1 py-1 text-left">#</th>
                  <th className="px-1 py-1 text-left">{t("মডেল", "Model")}</th>
                  <th className="px-1 py-1 text-left">strict</th>
                  <th className="px-1 py-1 text-left">status</th>
                  <th className="px-1 py-1 text-left">ms</th>
                  <th className="px-1 py-1 text-left">run id</th>
                  <th className="px-1 py-1 text-left">{t("ত্রুটি", "Error")}</th>
                </tr>
              </thead>
              <tbody>
                {debug.attempts.map((a) => (
                  <tr key={a.attempt} className={`border-t border-border ${a.ok ? "" : "text-destructive"}`}>
                    <td className="px-1 py-1">{a.attempt}</td>
                    <td className="px-1 py-1">{a.model}</td>
                    <td className="px-1 py-1">{String(a.strict)}</td>
                    <td className="px-1 py-1">{a.status || "—"}</td>
                    <td className="px-1 py-1">{a.ms}</td>
                    <td className="px-1 py-1">{a.runId ? a.runId.slice(0, 10) : "—"}</td>
                    <td className="max-w-[240px] truncate px-1 py-1" title={a.error}>{a.error || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
