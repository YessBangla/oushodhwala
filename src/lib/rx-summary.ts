/** যাচাই করা প্রেসক্রিপশনের প্রিন্টযোগ্য / শেয়ারযোগ্য সারাংশ
 *  Printable & shareable summary of a verified prescription */

export type RxSummaryLine = {
  no: number;
  name: string;
  generic: string;
  strength: string;
  form: string;
  pack: string;
  dose: string;
  duration: string;
  instruction: string;
  qty: number;
  price: number;
  confidence: number;
  excluded: boolean;
};

export type RxSummary = {
  id: string;
  patientName: string;
  patientAge?: string;
  patientAddress?: string;
  hospital?: string;
  doctorName: string;
  doctorQualification?: string;
  date: string;
  advice: string;
  note: string;
  verifiedAt: string;
  lines: RxSummaryLine[];
  total: number;
};

export type RxSummaryFormat = { en: boolean; n: (n: number) => string };

const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function rxSummaryHtml(s: RxSummary, f: RxSummaryFormat): string {
  const L = (bn: string, en: string) => (f.en ? en : bn);
  const money = (n: number) => `৳${f.n(Math.round(n))}`;
  const when = s.verifiedAt ? new Date(s.verifiedAt).toLocaleString(f.en ? "en-US" : "bn-BD") : "—";

  const rows = s.lines
    .map(
      (l) => `<tr class="${l.excluded ? "off" : ""}">
      <td>${f.n(l.no)}</td>
      <td>
        <b>${esc(l.name)}${l.strength ? " " + esc(l.strength) : ""}</b>
        ${l.generic ? `<div class="muted">${esc(l.generic)}</div>` : ""}
        ${l.form || l.pack ? `<div class="muted">${esc([l.form, l.pack].filter(Boolean).join(" · "))}</div>` : ""}
        ${l.excluded ? `<div class="muted">${L("অর্ডারে নেই", "Excluded from order")}</div>` : ""}
      </td>
      <td>
        ${l.dose ? `${L("সেবনবিধি", "Frequency")}: ${esc(l.dose)}<br>` : ""}
        ${l.duration ? `${L("সময়কাল", "Duration")}: ${esc(l.duration)}<br>` : ""}
        ${l.instruction ? `${L("নির্দেশনা", "Timing")}: ${esc(l.instruction)}` : ""}
      </td>
      <td class="r">${f.n(l.qty)}</td>
      <td class="r">${l.price ? money(l.price * l.qty) : "—"}</td>
    </tr>`,
    )
    .join("");

  return `<!doctype html><html lang="${f.en ? "en" : "bn"}"><head><meta charset="utf-8">
<title>${L("প্রেসক্রিপশন সারাংশ", "Prescription summary")} — ${L("ঔষধওয়ালা", "Oushodhwala")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  body{font-family:'Hind Siliguri',system-ui,sans-serif;margin:0;padding:24px;color:#14261c;background:#fff}
  .wrap{max-width:760px;margin:0 auto}
  header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a8f5a;padding-bottom:12px}
  h1{margin:0;font-size:20px;color:#1a8f5a}
  .muted{color:#5c6b62;font-size:12px}
  .grid{display:flex;gap:24px;flex-wrap:wrap;margin:16px 0;font-size:13px}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
  th,td{border-bottom:1px solid #e3ebe6;padding:8px 6px;text-align:left;vertical-align:top}
  th{background:#f2f8f5;font-size:12px}
  .r{text-align:right}
  .off{opacity:.5;text-decoration:line-through}
  .tot td{font-weight:700;border-top:2px solid #1a8f5a}
  .box{margin-top:14px;background:#f2f8f5;border-radius:8px;padding:10px;font-size:12px}
  footer{margin-top:18px;border-top:1px solid #e3ebe6;padding-top:10px;font-size:11px;color:#5c6b62}
  @media print{.noprint{display:none}}
</style></head><body><div class="wrap">
<header>
  <div>
    <h1>${L("ঔষধওয়ালা", "Oushodhwala")}</h1>
    <div class="muted">${L("যাচাই করা প্রেসক্রিপশন সারাংশ", "Verified prescription summary")}</div>
  </div>
  <div class="muted r">#${esc(s.id.slice(0, 8))}<br>${esc(when)}</div>
</header>
<div class="grid">
  <div><b>${L("হাসপাতাল / চেম্বার", "Hospital / chamber")}:</b> ${esc(s.hospital || "—")}</div>
  <div><b>${L("ডাক্তার", "Doctor")}:</b> ${esc(s.doctorName || "—")}${s.doctorQualification ? `, ${esc(s.doctorQualification)}` : ""}</div>
  <div><b>${L("রোগী", "Patient")}:</b> ${esc(s.patientName || "—")}</div>
  <div><b>${L("বয়স", "Age")}:</b> ${esc(s.patientAge || "—")}</div>
  <div><b>${L("ঠিকানা", "Address")}:</b> ${esc(s.patientAddress || "—")}</div>
  <div><b>${L("তারিখ", "Date")}:</b> ${esc(s.date || "—")}</div>
</div>
<table>
  <thead><tr>
    <th>#</th><th>${L("ঔষধ", "Medicine")}</th><th>${L("সেবনবিধি", "Dosage instruction")}</th>
    <th class="r">${L("পরিমাণ", "Qty")}</th><th class="r">${L("মূল্য", "Amount")}</th>
  </tr></thead>
  <tbody>
    ${rows}
    <tr class="tot"><td colspan="4" class="r">${L("সর্বমোট", "Total")}</td><td class="r">${money(s.total)}</td></tr>
  </tbody>
</table>
${s.advice ? `<div class="box"><b>${L("ডাক্তারের পরামর্শ", "Doctor's advice")}:</b> ${esc(s.advice)}</div>` : ""}
${s.note ? `<div class="box"><b>${L("সতর্কতা", "Caution")}:</b> ${esc(s.note)}</div>` : ""}
<footer>
  ${L(
    "এটি কম্পিউটার-জেনারেটেড সারাংশ, কোনো ডাক্তারি প্রেসক্রিপশনের বিকল্প নয়। ঔষধ গ্রহণের আগে মূল প্রেসক্রিপশন ও ফার্মাসিস্টের পরামর্শ নিন।",
    "This is a computer-generated summary, not a substitute for a doctor's prescription. Always check the original prescription and consult our pharmacist.",
  )}
</footer>
<p class="noprint" style="text-align:center;margin-top:16px">
  <button onclick="window.print()" style="font:inherit;padding:8px 18px;border:0;border-radius:8px;background:#1a8f5a;color:#fff;cursor:pointer">
    ${L("প্রিন্ট / PDF সেভ", "Print / Save PDF")}
  </button>
</p>
</div></body></html>`;
}

export function printRxSummary(s: RxSummary, f: RxSummaryFormat) {
  const w = window.open("", "_blank", "width=860,height=920");
  if (!w) return false;
  w.document.write(rxSummaryHtml(s, f));
  w.document.close();
  return true;
}

export function rxSummaryText(s: RxSummary, f: RxSummaryFormat): string {
  const L = (bn: string, en: string) => (f.en ? en : bn);
  const head = [
    L("ঔষধওয়ালা — যাচাই করা প্রেসক্রিপশন", "Oushodhwala — verified prescription"),
    `${L("রোগী", "Patient")}: ${s.patientName || "—"} | ${L("ডাক্তার", "Doctor")}: ${s.doctorName || "—"}`,
  ];
  const lines = s.lines.map((l) => {
    const bits = [
      `${f.n(l.no)}. ${l.name}${l.strength ? " " + l.strength : ""}${l.form ? " (" + l.form + ")" : ""}`,
      l.generic ? `   ${L("জেনেরিক", "Generic")}: ${l.generic}` : "",
      [l.dose, l.duration, l.instruction].filter(Boolean).join(" · ") ? `   ${[l.dose, l.duration, l.instruction].filter(Boolean).join(" · ")}` : "",
      `   ${L("পরিমাণ", "Qty")}: ${f.n(l.qty)}${l.price ? ` · ৳${f.n(Math.round(l.price * l.qty))}` : ""}${l.excluded ? ` · ${L("বাদ", "excluded")}` : ""}`,
    ];
    return bits.filter(Boolean).join("\n");
  });
  return [...head, "", ...lines, "", `${L("সর্বমোট", "Total")}: ৳${f.n(Math.round(s.total))}`].join("\n");
}
