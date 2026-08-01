/** প্রিন্টযোগ্য অর্ডার ইনভয়েস / Printable order invoice */

export type InvoiceItem = { name: string; qty: number; price: number };

export type InvoiceOrder = {
  order_no: string;
  created_at: string;
  customer_name: string;
  phone: string;
  address: string;
  slot: string;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  payment_method: string;
  payment_status: string;
  payment_ref?: string | null;
  items: InvoiceItem[];
};

export type InvoiceFormat = {
  en: boolean;
  money: (n: number) => string;
  n: (n: number) => string;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function invoiceHtml(o: InvoiceOrder, f: InvoiceFormat): string {
  const L = (bn: string, en: string) => (f.en ? en : bn);
  const date = new Date(o.created_at).toLocaleString(f.en ? "en-US" : "bn-BD");
  const rows = o.items
    .map(
      (l, i) => `<tr>
        <td>${f.n(i + 1)}</td>
        <td>${esc(l.name)}</td>
        <td class="r">${f.n(l.qty)}</td>
        <td class="r">${esc(f.money(Math.round(l.price)))}</td>
        <td class="r">${esc(f.money(Math.round(l.price * l.qty)))}</td>
      </tr>`,
    )
    .join("");

  const line = (label: string, value: string, strong = false) =>
    `<tr class="${strong ? "tot" : ""}"><td colspan="4" class="r">${esc(label)}</td><td class="r">${esc(value)}</td></tr>`;

  return `<!doctype html><html lang="${f.en ? "en" : "bn"}"><head><meta charset="utf-8">
<title>${L("রশিদ", "Invoice")} #${esc(o.order_no)} — ${L("ঔষধওয়ালা", "Oushodhwala")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  body{font-family:'Hind Siliguri',system-ui,sans-serif;margin:0;padding:24px;color:#14261c;background:#fff}
  .wrap{max-width:720px;margin:0 auto}
  header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a8f5a;padding-bottom:12px}
  h1{margin:0;font-size:20px;color:#1a8f5a}
  .muted{color:#5c6b62;font-size:12px}
  .grid{display:flex;gap:24px;flex-wrap:wrap;margin:16px 0}
  .grid section{flex:1;min-width:220px}
  h2{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#5c6b62;margin:0 0 4px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
  th,td{padding:7px 6px;border-bottom:1px solid #e2e8e4;text-align:left}
  th{background:#f2f8f4;font-size:12px}
  .r{text-align:right}
  .tot td{font-weight:700;font-size:14px;border-top:2px solid #1a8f5a;border-bottom:none}
  footer{margin-top:20px;font-size:11px;color:#5c6b62;text-align:center;border-top:1px dashed #cfdad3;padding-top:10px}
  @media print{body{padding:0}.noprint{display:none}}
</style></head><body><div class="wrap">
<header>
  <div>
    <h1>${L("ঔষধওয়ালা", "Oushodhwala")}</h1>
    <p class="muted">${L("অনলাইন ফার্মেসি ও স্বাস্থ্যসেবা", "Online pharmacy & healthcare")}</p>
  </div>
  <div class="r">
    <p style="margin:0;font-weight:700">${L("রশিদ", "INVOICE")} #${esc(o.order_no)}</p>
    <p class="muted" style="margin:2px 0 0">${esc(date)}</p>
  </div>
</header>
<div class="grid">
  <section>
    <h2>${L("গ্রাহক", "Customer")}</h2>
    <p style="margin:0;font-size:13px"><strong>${esc(o.customer_name)}</strong><br>${esc(o.phone)}<br>${esc(o.address)}</p>
  </section>
  <section>
    <h2>${L("ডেলিভারি ও পেমেন্ট", "Delivery & payment")}</h2>
    <p style="margin:0;font-size:13px">${esc(o.slot)}<br>${esc(o.payment_method.toUpperCase())} — ${
      o.payment_status === "paid" ? L("পরিশোধিত", "Paid") : L("বাকি", "Due")
    }${o.payment_ref ? `<br>${L("রেফ:", "Ref:")} ${esc(o.payment_ref)}` : ""}</p>
  </section>
</div>
<table>
  <thead><tr>
    <th>#</th><th>${L("পণ্য", "Item")}</th><th class="r">${L("পরিমাণ", "Qty")}</th>
    <th class="r">${L("দর", "Rate")}</th><th class="r">${L("মোট", "Amount")}</th>
  </tr></thead>
  <tbody>
    ${rows}
    ${line(L("সাবটোটাল", "Subtotal"), f.money(Math.round(o.subtotal)))}
    ${o.discount > 0 ? line(L("ছাড়", "Discount"), "− " + f.money(Math.round(o.discount))) : ""}
    ${line(L("ডেলিভারি চার্জ", "Delivery charge"), o.delivery_fee === 0 ? L("ফ্রি", "Free") : f.money(Math.round(o.delivery_fee)))}
    ${line(L("সর্বমোট", "Total"), f.money(Math.round(o.total)), true)}
  </tbody>
</table>
<footer>
  ${L(
    "এটি একটি কম্পিউটার-জেনারেটেড রশিদ, স্বাক্ষরের প্রয়োজন নেই। ঔষধ সংক্রান্ত যেকোনো প্রশ্নে আমাদের ফার্মাসিস্টের সাথে যোগাযোগ করুন।",
    "This is a computer-generated invoice; no signature required. For any medicine-related question, contact our pharmacist.",
  )}
</footer>
<p class="noprint" style="text-align:center;margin-top:16px">
  <button onclick="window.print()" style="font:inherit;padding:8px 18px;border:0;border-radius:8px;background:#1a8f5a;color:#fff;cursor:pointer">
    ${L("প্রিন্ট / PDF সেভ", "Print / Save PDF")}
  </button>
</p>
</div></body></html>`;
}

export function printInvoice(o: InvoiceOrder, f: InvoiceFormat) {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return false;
  w.document.write(invoiceHtml(o, f));
  w.document.close();
  return true;
}
