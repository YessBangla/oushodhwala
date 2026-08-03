/** ডেলিভারি ট্র্যাকিং রিপোর্ট — প্রিন্ট/PDF এক্সপোর্ট */

export type TrackEvent = { status: string; note: string; created_at: string };

export type TrackReport = {
  order_no: string;
  status: string;
  status_label: string;
  eta_minutes?: number | null;
  rider_name?: string | null;
  rider_vehicle?: string | null;
  customer_name?: string | null;
  place?: string;
  created_at?: string | null;
  delivered_at?: string | null;
  last_seen_at?: string | null;
  link?: string;
  events: TrackEvent[];
  statusLabel: (s: string) => string;
};

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function trackReportHtml(r: TrackReport, en = false): string {
  const L = (bn: string, e: string) => (en ? e : bn);
  const dt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString(en ? "en-GB" : "bn-BD", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const rows = r.events
    .map(
      (e) => `<tr><td>${esc(dt(e.created_at))}</td><td>${esc(r.statusLabel(e.status))}</td><td>${esc(e.note || "—")}</td></tr>`,
    )
    .join("");

  const info = (label: string, value: string) =>
    `<div class="cell"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;

  return `<!doctype html><html lang="${en ? "en" : "bn"}"><head><meta charset="utf-8">
<title>${L("ডেলিভারি রিপোর্ট", "Delivery report")} #${esc(r.order_no)} — ${L("ঔষধওয়ালা", "Oushodhwala")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  body{font-family:'Hind Siliguri',system-ui,sans-serif;margin:0;padding:24px;color:#14261c;background:#fff}
  .wrap{max-width:720px;margin:0 auto}
  header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a8f5a;padding-bottom:12px}
  h1{margin:0;font-size:20px;color:#1a8f5a}
  h2{font-size:14px;margin:20px 0 8px}
  .muted{color:#5c6b62;font-size:12px}
  .grid{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0}
  .cell{flex:1 1 30%;border:1px solid #e2e8e5;border-radius:10px;padding:8px 10px}
  .cell span{display:block;font-size:11px;color:#5c6b62}
  .cell strong{font-size:13px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border-bottom:1px solid #e2e8e5;padding:7px 6px;text-align:left;vertical-align:top}
  th{background:#f2f7f4;font-size:11px;text-transform:uppercase;color:#5c6b62}
  footer{margin-top:22px;border-top:1px solid #e2e8e5;padding-top:10px;font-size:11px;color:#5c6b62}
  @media print{body{padding:0}}
</style></head><body><div class="wrap">
<header>
  <div>
    <h1>${L("ঔষধওয়ালা", "Oushodhwala")}</h1>
    <p class="muted">${L("ডেলিভারি ট্র্যাকিং রিপোর্ট", "Delivery tracking report")}</p>
  </div>
  <div class="muted" style="text-align:right">
    <div><strong>#${esc(r.order_no)}</strong></div>
    <div>${esc(dt(new Date().toISOString()))}</div>
  </div>
</header>

<div class="grid">
  ${info(L("বর্তমান অবস্থা", "Current status"), r.status_label)}
  ${info(L("আনুমানিক সময়", "ETA"), r.eta_minutes ? `${r.eta_minutes} ${L("মিনিট", "min")}` : "—")}
  ${info(L("ডেলিভারিম্যান", "Rider"), r.rider_name ? `${r.rider_name}${r.rider_vehicle ? ` (${r.rider_vehicle})` : ""}` : "—")}
  ${info(L("গ্রাহক", "Customer"), r.customer_name || "—")}
  ${info(L("এলাকা", "Area"), r.place || "—")}
  ${info(L("অর্ডারের সময়", "Ordered at"), dt(r.created_at))}
  ${info(L("সর্বশেষ অবস্থান আপডেট", "Last location update"), dt(r.last_seen_at))}
  ${info(L("ডেলিভারির সময়", "Delivered at"), dt(r.delivered_at))}
</div>

<h2>${L("ইভেন্ট ইতিহাস", "Event history")}</h2>
<table>
  <thead><tr><th>${L("সময়", "Time")}</th><th>${L("অবস্থা", "Status")}</th><th>${L("মন্তব্য", "Note")}</th></tr></thead>
  <tbody>${rows || `<tr><td colspan="3">${L("কোনো ইভেন্ট নেই।", "No events.")}</td></tr>`}</tbody>
</table>

<footer>
  ${r.link ? `${L("লাইভ ট্র্যাকিং লিংক", "Live tracking link")}: ${esc(r.link)}<br>` : ""}
  ${L("ঔষধওয়ালা — Shondhaan (Yess Bangla Private Limited এর একটি সিস্টার কনসার্ন)", "Oushodhwala — part of Shondhaan, a sister concern of Yess Bangla Private Limited")}
</footer>
</div>
<script>window.onload=function(){setTimeout(function(){window.print()},400)}</script>
</body></html>`;
}

/** নতুন উইন্ডোতে রিপোর্ট খুলে প্রিন্ট/PDF সেভ ডায়ালগ দেখায় */
export function printTrackReport(r: TrackReport, en = false) {
  const w = window.open("", "_blank", "width=860,height=900");
  if (!w) return false;
  w.document.write(trackReportHtml(r, en));
  w.document.close();
  return true;
}
