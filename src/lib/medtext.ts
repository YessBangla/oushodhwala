/** স্ক্র্যাপ করা মেডিকেল টেক্সট পরিষ্কার করে পড়ার উপযোগী করে (বাংলা ও ইংরেজি) */

const SUPERSCRIPT: Record<string, string> = {
  "+": "⁺",
  "-": "⁻",
  "−": "⁻",
  "2+": "²⁺",
  "3+": "³⁺",
  "2-": "²⁻",
  "1": "¹",
  "2": "²",
  "3": "³",
};

/** সাবস্ক্রিপ্ট টোকেন: "C" / "max" আলাদা লাইনে ভেঙে যায় → "Cmax" */
const SUBSCRIPT_TOKENS = /^(max|min|ss|avg|eff|ss,av|1\/2|½|0-t|0-∞|au?c)$/i;

/** স্ক্র্যাপারের ছেঁটে ফেলা মার্কার */
const READ_MORE = /(\u2026|\.\.\.)?\s*read\s*more\s*$/i;

function unbalancedParen(s: string) {
  let n = 0;
  for (const ch of s) {
    if (ch === "(") n++;
    else if (ch === ")") n--;
  }
  return n > 0;
}

/**
 * একই প্যারাগ্রাফ একাধিকবার থাকলে (স্ক্র্যাপ ডুপ্লিকেট) শুধু একটি রাখে।
 * "… Read more" দিয়ে কাটা সংক্ষিপ্ত অংশ পরে পূর্ণরূপে থাকলে সেটিও বাদ যায়।
 */
function dedupeParagraphs(paragraphs: string[]) {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const keys = paragraphs.map(norm);
  const kept: string[] = [];
  const keptKeys: string[] = [];

  paragraphs.forEach((p, i) => {
    const key = keys[i] ?? "";
    if (key.length > 40) {
      // পরে বা আগে কোনো লম্বা প্যারাগ্রাফ এটিকে ধারণ করলে বাদ
      const swallowed = keys.some((k, j) => j !== i && (k?.length ?? 0) > key.length && k!.startsWith(key));
      if (swallowed) return;
      if (keptKeys.some((k) => k === key || k.startsWith(key))) return;
      // আগে রাখা ছোট (কাটা) অংশ এখনকার বড়টির শুরু হলে সেটিকে সরিয়ে দাও
      for (let j = keptKeys.length - 1; j >= 0; j--) {
        if (key.startsWith(keptKeys[j]!) && keptKeys[j]!.length > 40) {
          kept.splice(j, 1);
          keptKeys.splice(j, 1);
        }
      }
    }
    kept.push(p);
    keptKeys.push(key);
  });

  return kept;
}


export function cleanMedText(input?: string | null): string {
  if (!input) return "";
  const text = input.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");

  const lines = text.split("\n").map((l) => l.replace(READ_MORE, "").trim());
  const out: string[] = [];

  for (const raw of lines) {
    const line = raw;
    if (line === "") {
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }

    const prev: string = (out.length ? out[out.length - 1] : "") ?? "";
    const canJoin = prev !== "" && out.length > 0;

    // "H" + "+" → "H⁺"
    const sup = SUPERSCRIPT[line];
    if (canJoin && sup) {
      out[out.length - 1] = prev + sup;
      continue;
    }

    // "C" + "max" → "Cmax"  (কোনো স্পেস ছাড়া)
    if (canJoin && SUBSCRIPT_TOKENS.test(line) && /[A-Za-z⁺⁻)]$/.test(prev)) {
      out[out.length - 1] = prev + line.toLowerCase();
      continue;
    }

    // "(C" + "max) occur at ..." → "(Cmax) occur at ..."
    if (canJoin && /(^|[\s(])[A-Z]$/.test(prev) && /^(max|min|ss|avg|eff)\b/i.test(line)) {
      out[out.length - 1] = prev + line;
      continue;
    }

    // বিরামচিহ্ন দিয়ে শুরু → আগের লাইনের সাথে
    if (canJoin && /^[/,.);:%°–—-]/.test(line)) {
      out[out.length - 1] = prev + line;
      continue;
    }


    // আগের লাইন অসম্পূর্ণ (খোলা বন্ধনী, সুপারস্ক্রিপ্ট, খুব ছোট টুকরো,
    // বা শেষে যতিচিহ্ন নেই এবং নতুন লাইন ছোট হাতের অক্ষরে শুরু)
    if (
      canJoin &&
      (unbalancedParen(prev) ||
        /[⁺⁻¹²³]$/.test(prev) ||
        prev.length < 3 ||
        (/[a-z,(-]$/.test(prev) && /^[a-z(]/.test(line)))
    ) {
      out[out.length - 1] = (prev + " " + line).replace(/\(\s+/g, "(").trim();
      continue;
    }

    out.push(line);
  }

  const joined = out
    .join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:%])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return dedupeParagraphs(joined.split("\n"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
