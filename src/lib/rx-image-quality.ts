/**
 * ব্রাউজারেই প্রেসক্রিপশনের ছবির মান যাচাই — ঝাপসা বা কম কনট্রাস্ট হলে
 * AI-তে পাঠানোর আগেই স্পষ্ট বার্তা দিয়ে বাতিল করা হয়।
 */
export type RxImageQuality = {
  ok: boolean;
  /** Laplacian variance — যত বেশি তত স্পষ্ট */
  sharpness: number;
  /** ০–১ এর মধ্যে কনট্রাস্ট (স্ট্যান্ডার্ড ডেভিয়েশন / ১২৮) */
  contrast: number;
  /** গড় উজ্জ্বলতা ০–২৫৫ */
  brightness: number;
  width: number;
  height: number;
  reason: "ok" | "small" | "blurry" | "low-contrast" | "too-dark" | "too-bright" | "unreadable";
};

/** এই সীমার নিচে হলে ছবি বাতিল */
export const RX_MIN_SHARPNESS = 45;
export const RX_MIN_CONTRAST = 0.12;
export const RX_MIN_SIDE = 480;

const loadBitmap = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });

/** ছবিটি পড়ার উপযোগী কিনা — শুধু ইমেজ ফাইলে কাজ করে (PDF সবসময় ok) */
export async function checkRxImage(file: File): Promise<RxImageQuality> {
  const fail = (reason: RxImageQuality["reason"]): RxImageQuality => ({
    ok: false,
    sharpness: 0,
    contrast: 0,
    brightness: 0,
    width: 0,
    height: 0,
    reason,
  });

  if (!file.type.startsWith("image/")) {
    return { ok: true, sharpness: 999, contrast: 1, brightness: 128, width: 0, height: 0, reason: "ok" };
  }

  let img: HTMLImageElement;
  try {
    img = await loadBitmap(file);
  } catch {
    return fail("unreadable");
  }

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (Math.min(w, h) < RX_MIN_SIDE) {
    return { ...fail("small"), width: w, height: h };
  }

  // বিশ্লেষণের জন্য ছোট করে আঁকি — বড় ছবিতেও দ্রুত চলে
  const scale = Math.min(1, 900 / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { ok: true, sharpness: 999, contrast: 1, brightness: 128, width: w, height: h, reason: "ok" };
  ctx.drawImage(img, 0, 0, cw, ch);

  let px: Uint8ClampedArray;
  try {
    px = ctx.getImageData(0, 0, cw, ch).data;
  } catch {
    return { ok: true, sharpness: 999, contrast: 1, brightness: 128, width: w, height: h, reason: "ok" };
  }

  const gray = new Float32Array(cw * ch);
  let sum = 0;
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const v = 0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!;
    gray[j] = v;
    sum += v;
  }
  const mean = sum / gray.length;
  let varSum = 0;
  for (let i = 0; i < gray.length; i++) varSum += (gray[i]! - mean) ** 2;
  const contrast = Math.min(1, Math.sqrt(varSum / gray.length) / 128);

  // Laplacian variance — ঝাপসা মাপার মানসম্মত উপায়
  let lSum = 0;
  let lSq = 0;
  let n = 0;
  for (let y = 1; y < ch - 1; y++) {
    for (let x = 1; x < cw - 1; x++) {
      const i = y * cw + x;
      const lap = 4 * gray[i]! - gray[i - 1]! - gray[i + 1]! - gray[i - cw]! - gray[i + cw]!;
      lSum += lap;
      lSq += lap * lap;
      n++;
    }
  }
  const lMean = n ? lSum / n : 0;
  const sharpness = n ? lSq / n - lMean * lMean : 0;

  const base = { sharpness: Math.round(sharpness), contrast: Number(contrast.toFixed(3)), brightness: Math.round(mean), width: w, height: h };
  if (mean < 45) return { ...base, ok: false, reason: "too-dark" };
  if (mean > 232) return { ...base, ok: false, reason: "too-bright" };
  if (contrast < RX_MIN_CONTRAST) return { ...base, ok: false, reason: "low-contrast" };
  if (sharpness < RX_MIN_SHARPNESS) return { ...base, ok: false, reason: "blurry" };
  return { ...base, ok: true, reason: "ok" };
}

/** বাতিলের কারণ অনুযায়ী ব্যবহারকারী-বান্ধব বার্তা */
export function rxQualityMessage(q: RxImageQuality, en: boolean): string {
  switch (q.reason) {
    case "small":
      return en
        ? `Image is too small (${q.width}×${q.height}px). Take the photo closer, at least 480px on each side.`
        : `ছবিটি খুব ছোট (${q.width}×${q.height}px)। কাছ থেকে আবার তুলুন — প্রতিটি দিক অন্তত ৪৮০px হওয়া দরকার।`;
    case "blurry":
      return en
        ? "The photo looks blurry. Hold the phone steady, tap to focus on the writing, then retake."
        : "ছবিটি ঝাপসা মনে হচ্ছে। ফোন স্থির রেখে লেখার উপর ট্যাপ করে ফোকাস নিন, তারপর আবার তুলুন।";
    case "low-contrast":
      return en
        ? "Contrast is too low — the writing will not be readable. Use brighter, even light and avoid shadows."
        : "কনট্রাস্ট খুব কম — লেখা পড়া যাবে না। ভালো আলোতে, ছায়া এড়িয়ে আবার তুলুন।";
    case "too-dark":
      return en ? "The photo is too dark. Retake it in brighter light." : "ছবিটি খুব অন্ধকার। আরও আলোতে আবার তুলুন।";
    case "too-bright":
      return en
        ? "The photo is over-exposed (glare). Avoid direct flash or reflections and retake."
        : "ছবিতে অতিরিক্ত আলো/ঝলক পড়েছে। ফ্ল্যাশ বা প্রতিফলন এড়িয়ে আবার তুলুন।";
    case "unreadable":
      return en ? "This image file could not be opened." : "এই ছবিটি খোলা যায়নি।";
    default:
      return "";
  }
}
