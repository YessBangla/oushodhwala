/** লেবেল/বারকোড প্রিন্টার সেটিংস — ডিভাইসভিত্তিক, লোকাল স্টোরেজে সেভ থাকে */

export type LabelSettings = {
  preset: string;
  widthMm: number;
  heightMm: number;
  gapMm: number;
  columns: number;
  fontPt: number;
  showPrice: boolean;
  showPack: boolean;
  showBarcode: boolean;
  showShop: boolean;
  printerName: string;
};

export const LABEL_PRESETS: { v: string; t: string; w: number; h: number; cols: number }[] = [
  { v: "38x25", t: "৩৮×২৫ মিমি (থার্মাল)", w: 38, h: 25, cols: 5 },
  { v: "50x25", t: "৫০×২৫ মিমি (থার্মাল)", w: 50, h: 25, cols: 4 },
  { v: "50x30", t: "৫০×৩০ মিমি", w: 50, h: 30, cols: 4 },
  { v: "70x37", t: "৭০×৩৭ মিমি (A4 শিট)", w: 70, h: 37, cols: 3 },
  { v: "custom", t: "কাস্টম", w: 50, h: 25, cols: 4 },
];

export const DEFAULT_LABEL_SETTINGS: LabelSettings = {
  preset: "50x25",
  widthMm: 50,
  heightMm: 25,
  gapMm: 2,
  columns: 4,
  fontPt: 8,
  showPrice: true,
  showPack: true,
  showBarcode: true,
  showShop: true,
  printerName: "",
};

const KEY = "ow.label.settings.v1";

export function loadLabelSettings(): LabelSettings {
  if (typeof localStorage === "undefined") return DEFAULT_LABEL_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_LABEL_SETTINGS, ...(JSON.parse(raw) as Partial<LabelSettings>) } : DEFAULT_LABEL_SETTINGS;
  } catch {
    return DEFAULT_LABEL_SETTINGS;
  }
}

export function saveLabelSettings(s: LabelSettings) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

/** Code128-ধাঁচের ভিজ্যুয়াল বার প্যাটার্ন (স্ক্যানযোগ্য নয় — লেআউট প্রিভিউ) */
export function barPattern(code: string, bars = 30): number[] {
  const out: number[] = [];
  for (let i = 0; i < bars; i += 1) {
    const c = code.charCodeAt(i % Math.max(code.length, 1)) || 65;
    out.push(1 + ((c * (i + 3)) % 3));
  }
  return out;
}
