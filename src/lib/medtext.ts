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

/** একই প্যারাগ্রাফ একাধিকবার থাকলে (স্ক্র্যাপ ডুপ্লিকেট) শুধু প্রথমটি রাখে */
function dedupeParagraphs(paragraphs: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paragraphs) {
    const key = p.toLowerCase().replace(/\s+/g, " ").trim();
    if (key.length > 40 && seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
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

    const prev = out.length ? out[out.length - 1] : "";
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

    // বিরামচিহ্ন দিয়ে শুরু → আগের লাইনের সাথে
    if (canJoin && /^[/,.);:%°]/.test(line)) {
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
