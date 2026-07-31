/** স্ক্র্যাপ করা মেডিকেল টেক্সট পরিষ্কার করে পড়ার উপযোগী করে */
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

/**
 * মেডেক্স থেকে আসা টেক্সটে সুপারস্ক্রিপ্ট/সাবস্ক্রিপ্ট আলাদা লাইনে ভেঙে যায়
 * (যেমন "H" / "+" / "/K" / "+" / "ATPase")। এগুলো এক লাইনে জোড়া দেয়া হয়।
 */
export function cleanMedText(input?: string | null): string {
  if (!input) return "";
  let text = input.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");

  const lines = text.split("\n").map((l) => l.trim());
  const out: string[] = [];

  for (const line of lines) {
    if (line === "") {
      out.push("");
      continue;
    }
    const sup = SUPERSCRIPT[line];
    const prev = out.length ? out[out.length - 1] : "";
    if (sup && prev) {
      // "H" + "+"  →  "H⁺"
      out[out.length - 1] = prev + sup;
      continue;
    }
    // ছোট টুকরো (যেমন "/K", "ATPase এনজাইম...") আগের লাইনের সাথে জোড়া দাও
    if (prev && (/[⁺⁻¹²³]$/.test(prev) || /^[/,.);:]/.test(line) || prev.length < 3)) {
      out[out.length - 1] = (prev + (/^[/,.);:]/.test(line) ? "" : " ") + line).trim();
      continue;
    }
    out.push(line);
  }

  return out
    .join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
