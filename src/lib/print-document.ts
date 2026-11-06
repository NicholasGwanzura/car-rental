import { BRAND, BRAND_LOGO_SVG, brandedCompany } from "@/lib/brand";
import type { CompanyProfile } from "@/lib/rental-data";

/**
 * Shared shell for printable reports (inspection reports, usage reports…).
 * Each opens in a new tab with a "Save as PDF / Print" button, branded with the company details.
 */

export function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

export function longDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Harare" }).format(new Date(value.length <= 10 ? `${value}T12:00:00` : value));
}

export function shortDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Harare" }).format(new Date(value.length <= 10 ? `${value}T12:00:00` : value));
}

export function dateTime(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Harare" }).format(new Date(value));
}

export function km(value: number | undefined | null) {
  return value === undefined || value === null || !Number.isFinite(value) ? "—" : `${Math.round(value).toLocaleString("en-US")} km`;
}

export const documentStyles = (landscape: boolean) => `
@page{size:A4${landscape ? " landscape" : ""};margin:14mm}
*{box-sizing:border-box}
body{margin:0;padding:24px;background:#fff;color:#161a18;font:12px/1.5 Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
main{max-width:${landscape ? "1060px" : "780px"};margin:0 auto}
.toolbar{position:sticky;top:0;z-index:5;display:flex;justify-content:flex-end;margin:-24px -24px 16px;padding:10px 24px;background:#f3f6f4;border-bottom:1px solid #dfe6e1}
.toolbar button{height:38px;padding:0 16px;border:0;border-radius:8px;background:${BRAND.accent};color:#fff;font:700 13px Arial,sans-serif;cursor:pointer}
.brand-head{display:flex;justify-content:space-between;align-items:center;gap:20px;padding-bottom:12px}
.brand-mark{display:flex;align-items:center;gap:11px}
.brand-mark strong{display:block;color:${BRAND.ink};font-size:17px;font-weight:800;letter-spacing:1.4px}
.brand-mark small{display:block;color:${BRAND.muted};font-size:10px;font-weight:700;letter-spacing:2.6px}
.brand-contact{text-align:right;color:#333;font-size:10.5px;line-height:1.6}
.brand-bar{height:4px;margin-bottom:14px;background:linear-gradient(90deg,${BRAND.ink} 0 72%,${BRAND.accent} 72% 100%)}
.doc-meta{display:flex;justify-content:space-between;gap:12px;margin-bottom:4px;color:#555;font-size:10.5px}
.doc-meta strong{color:${BRAND.accent}}
h1{margin:6px 0 4px;text-align:center;color:${BRAND.ink};font-size:19px;font-weight:800;letter-spacing:1.6px}
h1::after{content:"";display:block;width:56px;height:3px;margin:8px auto 0;background:${BRAND.accent}}
.subtitle{margin:8px 0 16px;text-align:center;color:#555;font-size:12px}
h2{margin:22px 0 8px;color:${BRAND.ink};font-size:13px;font-weight:800;letter-spacing:.4px;break-after:avoid}
h2 small{margin-left:8px;color:#666;font-size:11px;font-weight:600;letter-spacing:0}
h3{margin:14px 0 4px;color:${BRAND.ink};font-size:12px;font-weight:800;break-after:avoid}
p{margin:6px 0}
table{width:100%;border-collapse:collapse;margin:6px 0}
th,td{padding:5px 8px;border:1px solid #c9ceca;text-align:left;vertical-align:top}
thead th{background:${BRAND.ink};color:#fff;font-size:11px;font-weight:700}
tbody tr:nth-child(even) td{background:#fafaf8}
tr{break-inside:avoid}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.facts th{width:24%;background:#f4f5f2;color:#111;font-weight:700}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:8px 0 4px}
.stat{padding:9px 11px;border:1px solid #d6dbd7;border-radius:8px;background:#fafaf8;break-inside:avoid}
.stat span{display:block;color:#666;font-size:10px;font-weight:700;letter-spacing:.4px;text-transform:uppercase}
.stat strong{display:block;margin-top:3px;font-size:16px;font-variant-numeric:tabular-nums}
.stat.is-accent strong{color:${BRAND.accent}}
.pill{display:inline-block;padding:1px 8px;border-radius:999px;font-size:10px;font-weight:800}
.pill-ok{background:#e4f4ea;color:#1d6b42}.pill-issue{background:#fbe6e4;color:#a8261d}.pill-na{background:#eceeed;color:#555}.pill-info{background:#e6eefb;color:#1f4f9a}.pill-warn{background:#fdf1d9;color:#8a5a12}
.issue{color:#a8261d;font-weight:700}.muted{color:#666}
.callout{margin:10px 0;padding:9px 12px;border-left:3px solid ${BRAND.accent};background:#fff8f3;break-inside:avoid}
.callout.is-issue{border-left-color:#c8372d;background:#fdf3f2}
.photos{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
figure{margin:0;break-inside:avoid}
.photo{position:relative;border:1px solid #d6dbd7;border-radius:6px;overflow:hidden;background:#fff}
.photo img{display:block;width:100%}
.photo span{position:absolute;transform:translate(-50%,-50%);display:grid;place-items:center;width:18px;height:18px;border:2px solid #fff;border-radius:50%;background:${BRAND.accent};color:#fff;font-size:10px;font-weight:800;line-height:1}
figcaption{margin-top:3px;color:#555;font-size:10px}
.odometer-photo{max-width:340px}
.signatures{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:20px;break-inside:avoid}
.sig .line{display:flex;align-items:flex-end;height:64px;border-bottom:1px solid #161a18}
.sig img{max-height:60px;max-width:100%;object-fit:contain}
.sig small{display:block;margin-top:3px;color:#555}
.page-foot{display:flex;justify-content:space-between;gap:12px;margin-top:26px;padding-top:8px;border-top:2px solid ${BRAND.accent};color:#555;font-size:9.5px}
.page-break{break-before:page}
@media print{.toolbar{display:none}body{padding:0 0 12mm}.page-foot{position:fixed;left:0;right:0;bottom:0;margin:0;background:#fff}}
@media(max-width:640px){body{padding:14px}.toolbar{margin:-14px -14px 14px;padding:10px 14px}.brand-head{flex-direction:column;align-items:flex-start}.brand-contact{text-align:left}.photos{grid-template-columns:repeat(2,1fr)}.signatures{grid-template-columns:1fr}table{font-size:11px}th,td{padding:4px 5px}}
`;

export function buildDocument({ title, company, heading, subtitle, reference, issuedOn, body, landscape = false, extraStyles = "" }: {
  title: string;
  company: Partial<CompanyProfile> | undefined;
  heading: string;
  subtitle?: string;
  reference?: string;
  issuedOn?: string;
  body: string;
  landscape?: boolean;
  extraStyles?: string;
}) {
  const details = brandedCompany(company);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>
<style>${documentStyles(landscape)}${extraStyles}</style></head><body><main>
<div class="toolbar"><button type="button" onclick="window.print()">Save as PDF / Print</button></div>
<header class="brand-head"><div class="brand-mark">${BRAND_LOGO_SVG}<div><strong>${escapeHtml(details.name.toUpperCase())}</strong><small>CAR RENTAL</small></div></div>
<div class="brand-contact">${escapeHtml(details.address)}<br>${escapeHtml(details.phone)}<br>${escapeHtml(details.emails.join(" · "))} · ${escapeHtml(details.website)}</div></header>
<div class="brand-bar"></div>
<div class="doc-meta"><span>${reference ? `Ref: <strong>${escapeHtml(reference)}</strong>` : ""}</span><span>Issued: ${escapeHtml(issuedOn ?? longDate(new Date().toISOString()))}</span></div>
<h1>${escapeHtml(heading)}</h1>
${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}
${body}
<footer class="page-foot"><span>${escapeHtml(details.name)} Car Rental · ${escapeHtml(details.address)}</span><span>${escapeHtml(details.phone)} · ${escapeHtml(details.emails.join(" · "))} · ${escapeHtml(details.website)}</span></footer>
</main></body></html>`;
}

/** Opens a document in a new tab (with a Save as PDF / Print button); falls back to downloading it if pop-ups are blocked. */
export function openHtmlDocument(html: string, filename: string) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const opened = window.open(url, "_blank");
  if (!opened) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".html") ? filename : `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
