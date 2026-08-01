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
  "এইচ": "h",
  "ম্যাক্সপ্রো": "maxpro",
  "লোসেকটিল": "losectil",
  "সার্জেল": "sergel",
  "ফিনিক্স": "finix",
  "প্যানটোনিক্স": "pantonix",
  "এক্সিয়াম": "exium",
  "ওরস্যালাইন": "orsaline",
  "রিকোনিল": "riconil",
  "ফ্লুক্লক্স": "flucloxacillin",
  "মেট্রিল": "metryl",
  "টাফনিল": "tufnil",
  "ডাইজিন": "digene",
  "ইনসেপ্টা": "incepta",
  "স্কয়ার": "square",
  "বেক্সিমকো": "beximco",
  "রেনাটা": "renata",
  "অপসোনিন": "opsonin",
  "একমি": "acme",
  "একমী": "acme",
  "হেলথকেয়ার": "healthcare",
  "রেডিয়েন্ট": "radiant",
  "এসকেএফ": "skf",
  "ড্রপস": "drops",
  "সাসপেনশন": "suspension",
  "অয়েন্টমেন্ট": "ointment",
  "জেল": "gel",
  "শ্যাম্পু": "shampoo",
  "সাবান": "soap",
  "ডায়াপার": "diaper",
  "গ্লুকোমিটার": "glucometer",
  "স্ট্রিপ": "strip",
  "নেবুলাইজার": "nebulizer",
  "অক্সিমিটার": "oximeter",
  "গজ": "gauze",
  "ব্যান্ডেজ": "bandage",
  "সিরিঞ্জ": "syringe",
};

/** বানানের সাধারণ বিকল্প রূপ (ph/f, z/j, k/c ইত্যাদি) */
const ALTS: [RegExp, string][] = [
  [/f/g, "ph"],
  [/ph/g, "f"],
  [/j/g, "z"],
  [/z/g, "j"],
  [/k/g, "c"],
  [/c(?!h)/g, "k"],
  [/sh/g, "s"],
  [/v/g, "b"],
  [/oi/g, "oy"],
  [/ou/g, "ow"],
  [/ee/g, "i"],
  [/oo/g, "u"],
  [/y$/g, "i"],
];

function altForms(s: string): string[] {
  const out = new Set<string>();
  for (const [re, to] of ALTS) {
    if (re.test(s)) out.add(s.replace(re, to));
    re.lastIndex = 0;
  }
  // শেষের অতিরিক্ত 'a' বাদ
  if (/[a]$/.test(s) && s.length > 4) out.add(s.slice(0, -1));
  return [...out];
}


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
    if (c === HASANTA) {
      const nxt = ch[i + 1];
      // য-ফলা ও ব-ফলা উচ্চারণে বাদ যায় (প্যারাসিটামল → paracetamol)
      if (nxt === "য" || nxt === "ব" || nxt === "য়") {
        i++;
        continue;
      }
      // র-ফলা → r
      if (nxt === "র") {
        out += "r";
        i++;
        continue;
      }
      continue;
    }
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

/** শব্দটিকে অভিধান/ধ্বনি অনুযায়ী রোমান রূপে আনে */
function wordForms(w: string): string[] {
  const direct = DICT[w];
  if (direct) return [direct];
  const base = translitWord(w, false);
  const withA = translitWord(w, true);
  // অভিধানে আংশিক মিল (যেমন "প্যারাসিটামলের")
  const partial = Object.keys(DICT).find((k) => k.length >= 4 && w.startsWith(k));
  const out = new Set<string>();
  if (partial) out.add(DICT[partial]!);
  out.add(base);
  if (withA !== base) out.add(withA);
  return [...out];
}

/** বাংলা টার্ম → সম্ভাব্য ইংরেজি রূপগুলোর তালিকা (সার্চে OR হিসেবে ব্যবহার করা হয়) */
export function romanizeVariants(term: string): string[] {
  const words = term.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const perWord = words.map(wordForms);
  const out = new Set<string>();

  // প্রতিটি শব্দের প্রথম রূপ নিয়ে প্রধান বাক্য
  out.add(perWord.map((f) => f[0]!).join(" "));
  // দ্বিতীয় রূপগুলো (থাকলে)
  if (perWord.some((f) => f.length > 1)) {
    out.add(perWord.map((f) => f[1] ?? f[0]!).join(" "));
  }
  // এক-শব্দের টার্মে বানানের বিকল্প রূপ
  if (words.length === 1) {
    for (const f of perWord[0]!) for (const a of altForms(f)) out.add(a);
  }

  return [...out].map((s) => s.trim()).filter((s) => s.length >= 2 && !hasBengali(s));
}

/** মূল টার্ম + রোমান রূপ — সর্বোচ্চ ৬টি */
export function expandQuery(term: string): string[] {
  const t = term.trim();
  if (!t) return [];
  if (!hasBengali(t)) return [t];
  return [...new Set([t, ...romanizeVariants(t)])].slice(0, 6);
}


/** ক্লায়েন্ট-সাইড ফিল্টারের জন্য: haystack গুলোর কোনোটিতে টার্ম আছে কিনা */
export function matchesQuery(term: string, ...haystacks: (string | null | undefined)[]) {
  const terms = expandQuery(term).map((s) => s.toLowerCase());
  if (!terms.length) return true;
  const hay = haystacks.filter(Boolean).join(" ").toLowerCase();
  return terms.some((t) => hay.includes(t));
}
