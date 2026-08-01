import { useLang } from "@/lib/lang";
import { bn } from "@/data/catalog";

/**
 * সহজ দ্বিভাষিক হেল্পার — t("বাংলা", "English")
 * নির্বাচিত ভাষা অনুযায়ী টেক্সট ফেরত দেয়।
 */
export function useT() {
  const { lang } = useLang();
  const en = lang === "en";
  const t = (bnText: string, enText?: string) => (en ? (enText ?? bnText) : bnText);
  /** সংখ্যা — বাংলায় বাংলা অঙ্ক, ইংরেজিতে ইংরেজি অঙ্ক */
  const n = (v: number | string) => (en ? String(v) : bn(typeof v === "number" ? v : Number(v)));
  /** টাকা */
  const money = (v: number) => (en ? `BDT ${Number(v).toLocaleString("en-US")}` : `৳${bn(Number(v))}`);
  return Object.assign(t, { en, lang, n, money, t });
}

export type T = ReturnType<typeof useT>;
