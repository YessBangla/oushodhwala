/** ERP রিপোর্ট এক্সপোর্ট — CSV ও প্রিন্টযোগ্য PDF */

export type Column = { key: string; label: string };
export type Row = Record<string, string | number | null | undefined>;

const cell = (v: unknown) => String(v ?? "");

export function downloadCsv(filename: string, cols: Column[], rows: Row[]) {
  const lines = [cols.map((c) => c.label), ...rows.map((r) => cols.map((c) => cell(r[c.key])))];
  const csv = lines.map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** ব্রাউজারের প্রিন্ট ডায়ালগ খোলে — সেখান থেকে "Save as PDF" করা যায় */
export function printReport(title: string, subtitle: string, cols: Column[], rows: Row[]) {
  const head = cols.map((c) => `<th>${esc(c.label)}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${cols.map((c) => `<td>${esc(cell(r[c.key]))}</td>`).join("")}</tr>`)
    .join("");

  const html = `<!doctype html><html lang="bn"><head><meta charset="utf-8" />
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  *{box-sizing:border-box}
  body{font-family:'Hind Siliguri',system-ui,sans-serif;margin:24px;color:#12232e}
  h1{font-size:20px;margin:0 0 2px}
  .sub{font-size:12px;color:#5a6b78;margin-bottom:16px}
  .brand{font-size:12px;color:#12a67a;font-weight:700}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th,td{border:1px solid #dfe6ea;padding:6px 8px;text-align:left;vertical-align:top}
  th{background:#f2f7f5;font-weight:700}
  tr:nth-child(even) td{background:#fafcfb}
  .foot{margin-top:14px;font-size:10px;color:#8a99a4}
  @media print{@page{size:A4 landscape;margin:12mm}}
</style></head><body>
<div class="brand">ঔষধওয়ালা · Oushodhwala</div>
<h1>${esc(title)}</h1>
<div class="sub">${esc(subtitle)}</div>
<table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${cols.length}">কোনো তথ্য নেই</td></tr>`}</tbody></table>
<div class="foot">তৈরি: ${new Date().toLocaleString("bn-BD")} · মোট সারি: ${rows.length}</div>
<script>window.onload=()=>{window.print()}<\/script>
</body></html>`;

  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
