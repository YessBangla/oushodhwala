/**
 * বাংলা অক্ষরে টাইপ করা সার্চ টার্মকে ইংরেজি (রোমান) রূপে রূপান্তর করে,
 * যাতে ডাটাবেজে ইংরেজিতে সংরক্ষিত ব্র্যান্ড/জেনেরিক নামও খুঁজে পাওয়া যায়।
 */

const CONS: Record<string, string> = {
  ক: "k", খ: "kh", গ: "g", ঘ: "gh", ঙ: "ng",
  চ: "ch", ছ: "chh", জ: "j", ঝ: "jh", ঞ: "n",
  ট: "t", ঠ: "th", ড: "d", ঢ: "dh", ণ: "n",
  ত: "t", থ: "th", দ: "d", ধ: "dh", ন: "n",
  প: "p", ফ: "f", ব: "b", ভ: "v", ম: "m",
  য: "j", র: "r", ল: "l", শ: "sh", ষ: "sh", স: "s", হ: "h",
  ড়: "r", ঢ়: "rh", য়: "y", ৎ: "t",
};

const VOWELS: Record<string, string> = {
  অ: "o", আ: "a", ই: "i", ঈ: "i", উ: "u", ঊ: "u", ঋ: "ri",
  এ: "e", ঐ: "oi", ও: "o", ঔ: "ou",
};

const SIGNS: Record<string, string> = {
  "\u09BE": "a", "\u09BF": "i", "\u09C0": "i", "\u09C1": "u", "\u09C2": "u",
  "\u09C3": "ri", "\u09C7": "e", "\u09C8": "oi", "\u09CB": "o", "\u09CC": "ou",
};

const HASANTA = "\u09CD";
const OTHER: Record<string, string> = { "ং": "ng", "ঃ": "h", "ঁ": "" };
const DIGITS: Record<string, string> = { "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9" };

/** পরিচিত ঔষধ/জেনেরিক শব্দের সরাসরি ম্যাপিং (ধ্বনি-রূপান্তরে যেগুলো মেলে না) */
const DICT: Record<string, string> = {
  "প্যারাসিটামল": "paracetamol",
  "প্যারাসিটামল ": "paracetamol",
  "প্যরাসিটামল": "paracetamol",
  "ওমিপ্রাজল": "omeprazole",
  "ওমেপ্রাজল": "omeprazole",
  "এসোমিপ্রাজল": "esomeprazole",
  "প্যানটোপ্রাজল": "pantoprazole",
  "মেট্রোনিডাজল": "metronidazole",
  "অ্যামোক্সিসিলিন": "amoxicillin",
  "এমোক্সিসিলিন": "amoxicillin",
  "সেফিক্সিম": "cefixime",
  "সেফ্রাডিন": "cephradine",
  "এজিথ্রোমাইসিন": "azithromycin",
  "অ্যাজিথ্রোমাইসিন": "azithromycin",
  "সিপ্রোফ্লক্সাসিন": "ciprofloxacin",
  "লেভোফ্লক্সাসিন": "levofloxacin",
  "ডক্সিসাইক্লিন": "doxycycline",
  "আইবুপ্রোফেন": "ibuprofen",
  "ন্যাপ্রক্সেন": "naproxen",
  "ডাইক্লোফেনাক": "diclofenac",
  "এসিক্লোফেনাক": "aceclofenac",
  "মন্টিলুকাস্ট": "montelukast",
  "সেটিরিজিন": "cetirizine",
  "ফেক্সোফেনাডিন": "fexofenadine",
  "লোরাটাডিন": "loratadine",
  "রেনিটিডিন": "ranitidine",
  "ফ্যামোটিডিন": "famotidine",
  "মেটফরমিন": "metformin",
  "গ্লিমেপিরাইড": "glimepiride",
  "লিনাগ্লিপটিন": "linagliptin",
  "এমলোডিপিন": "amlodipine",
  "অ্যামলোডিপিন": "amlodipine",
  "লোসারটান": "losartan",
  "এটেনোলল": "atenolol",
  "বিসোপ্রোলল": "bisoprolol",
  "এটোরভাস্ট্যাটিন": "atorvastatin",
  "রসুভাস্ট্যাটিন": "rosuvastatin",
  "ক্লোপিডোগ্রেল": "clopidogrel",
  "লেভোথাইরক্সিন": "levothyroxine",
  "ভিটামিন": "vitamin",
  "ক্যালসিয়াম": "calcium",
  "জিংক": "zinc",
  "আয়রন": "iron",
  "ফলিক": "folic",
  "স্যালাইন": "saline",
  "ইনসুলিন": "insulin",
  "ইনহেলার": "inhaler",
  "সিরাপ": "syrup",
  "ট্যাবলেট": "tablet",
  "ক্যাপসুল": "capsule",
  "ইনজেকশন": "injection",
  "ড্রপ": "drop",
  "ক্রিম": "cream",
  "মলম": "ointment",
  "মাস্ক": "mask",
  "স্যানিটাইজার": "sanitizer",
  "থার্মোমিটার": "thermometer",
  "প্রেসার": "pressure",
  "মেশিন": "machine",
  "ডায়াবেটিস": "diabetes",
  "গ্যাস্ট্রিক": "gastric",
  "জ্বর": "fever",
  "ব্যথা": "pain",
  "সর্দি": "cold",
  "কাশি": "cough",
  "এলার্জি": "allergy",
  "অ্যান্টিবায়োটিক": "antibiotic",
  "ন্যাপা": "napa",
  "নাপা": "napa",
  "সেকলো": "seclo",
  "মোনাস": "monas",
  "ফিমক্সিল": "fimoxyl",
  "হিস্টাসিন": "histacin",
  "এইস": "ace",
};

export function hasBengali(s: string) {
  return /[\u0980-\u09FF]/.test(s);
}

function translitWord(word: string, implicitA: boolean) {
  let out = "";
  const ch = [...word];
  for (let i = 0; i < ch.length; i++) {
    const c = ch[i]!;
    if (DIGITS[c] !== undefined) {
      out += DIGITS[c];
      continue;
    }
    if (VOWELS[c] !== undefined) {
      out += VOWELS[c];
      continue;
    }
    if (SIGNS[c] !== undefined) {
      out += SIGNS[c];
      continue;
    }
    if (OTHER[c] !== undefined) {
      out += OTHER[c];
      continue;
    }
    if (c === HASANTA) continue;
    if (CONS[c] !== undefined) {
      out += CONS[c];
      const nxt = ch[i + 1];
      const isLast = i === ch.length - 1;
      const followedByVowelOrHasanta = nxt !== undefined && (SIGNS[nxt] !== undefined || nxt === HASANTA);
      if (implicitA && !followedByVowelOrHasanta && !isLast) out += "a";
      continue;
    }
    out += c;
  }
  return out;
}

/** বাংলা টার্ম → সম্ভাব্য ইংরেজি রূপগুলোর তালিকা (সার্চে OR হিসেবে ব্যবহার করা হয়) */
export function romanizeVariants(term: string): string[] {
  const words = term.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const dictMapped = words.map((w) => DICT[w] ?? null);
  const out = new Set<string>();

  if (dictMapped.some(Boolean)) {
    out.add(words.map((w, i) => dictMapped[i] ?? translitWord(w, false)).join(" "));
  }
  out.add(words.map((w) => translitWord(w, false)).join(" "));
  out.add(words.map((w) => translitWord(w, true)).join(" "));

  return [...out].map((s) => s.trim()).filter((s) => s.length >= 2 && !hasBengali(s));
}

/** মূল টার্ম + রোমান রূপ — সর্বোচ্চ ৪টি */
export function expandQuery(term: string): string[] {
  const t = term.trim();
  if (!t) return [];
  if (!hasBengali(t)) return [t];
  return [t, ...romanizeVariants(t)].slice(0, 4);
}

/** ক্লায়েন্ট-সাইড ফিল্টারের জন্য: haystack গুলোর কোনোটিতে টার্ম আছে কিনা */
export function matchesQuery(term: string, ...haystacks: (string | null | undefined)[]) {
  const terms = expandQuery(term).map((s) => s.toLowerCase());
  if (!terms.length) return true;
  const hay = haystacks.filter(Boolean).join(" ").toLowerCase();
  return terms.some((t) => hay.includes(t));
}
