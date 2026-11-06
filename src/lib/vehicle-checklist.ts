import { checklistDeclaration, checklistRows, checkStatusLabels } from "@/components/inspection-inputs";
import { BRAND, BRAND_LOGO_SVG, brandedCompany } from "@/lib/brand";
import type { Booking, CompanyProfile, Customer, PrebookingInspection, Vehicle } from "@/lib/rental-data";
import { diagramViews, photoSrc } from "@/lib/vehicle-diagrams";

/**
 * The Classic Ride "Vehicle Checklist" form, rebuilt from the paper version:
 * renter and car details, fuel, the OUT / IN checklist, comments, car diagrams and the four sign-offs.
 */

export type ChecklistInput = { booking: Booking; customer?: Customer; vehicle?: Vehicle; company: CompanyProfile; out?: PrebookingInspection; in?: PrebookingInspection };

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function shortDate(value?: string) {
  if (!value) return "";
  const date = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Africa/Harare" }).format(date);
}

const fuelSteps = [{ label: "E", value: 0 }, { label: "¼", value: 25 }, { label: "½", value: 50 }, { label: "¾", value: 75 }, { label: "F", value: 100 }];

function fuelBoxes(percent?: number) {
  return fuelSteps.map((step) => `<span class="ck-fuel-step">${step.label}<i class="ck-box${percent === step.value ? " is-ticked" : ""}"></i></span>`).join("");
}

function cell(inspection: PrebookingInspection | undefined, key: string) {
  if (!inspection) return "";
  const status = inspection.checklist?.[key];
  const note = inspection.checklistNotes?.[key];
  return `${status ? `<b class="ck-status ck-${status}">${escapeHtml(checkStatusLabels[status])}</b>` : ""}${note ? ` <span class="ck-note">${escapeHtml(note)}</span>` : ""}`;
}

function diagram(view: (typeof diagramViews)[number]["view"], label: string, out?: PrebookingInspection, back?: PrebookingInspection) {
  const pins = (inspection: PrebookingInspection | undefined, prefix: string, className: string) => (inspection?.photos.find((photo) => photo.diagram === view)?.marks ?? [])
    .map((mark, index) => `<span class="ck-pin ${className}" style="left:${mark.x}%;top:${mark.y}%" title="${escapeHtml(mark.type)}${mark.note ? ` – ${escapeHtml(mark.note)}` : ""}">${prefix}${index + 1}</span>`).join("");
  return `<figure class="ck-diagram"><div class="ck-diagram-image"><img src="${photoSrc({ id: "", name: "", dataUrl: "", diagram: view })}" alt="">${pins(out, "O", "is-out")}${pins(back, "I", "is-in")}</div><figcaption>${label}</figcaption></figure>`;
}

function markList(inspection: PrebookingInspection | undefined, prefix: string) {
  return (inspection?.photos ?? []).filter((photo) => photo.diagram).flatMap((photo) => {
    const view = diagramViews.find((item) => item.view === photo.diagram)?.label ?? "";
    return (photo.marks ?? []).map((mark, index) => `<li><b>${prefix}${index + 1}</b> ${escapeHtml(view)}: ${escapeHtml(mark.type)}${mark.note ? ` – ${escapeHtml(mark.note)}` : ""}</li>`);
  });
}

function signLine(label: string, name: string, signature?: string) {
  return `<div class="ck-sign"><span class="ck-sign-label">${label}</span><span class="ck-fill ck-fill-name">${escapeHtml(name) || "&nbsp;"}</span><span class="ck-sign-label">I.D.</span><span class="ck-fill ck-fill-id">&nbsp;</span><span class="ck-sign-label">Signature</span><span class="ck-fill ck-fill-sig">${signature ? `<img src="${signature}" alt="Signature">` : "&nbsp;"}</span></div>`;
}

export const checklistStyles = `
.ck-doc{color:#111;font:12px/1.45 Arial,Helvetica,sans-serif}
.ck-head{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px;margin-bottom:12px}
.ck-brand{display:flex;align-items:center;gap:10px}.ck-brand svg{width:46px;height:46px}
.ck-brand strong{display:block;font-size:16px;font-weight:800;letter-spacing:1.3px}.ck-brand small{display:block;color:#666;font-size:10px;font-weight:700;letter-spacing:2.4px}
.ck-title{padding:7px 18px;border-radius:999px;background:${BRAND.ink};color:#fff;font:800 15px Georgia,"Times New Roman",serif;letter-spacing:.8px;white-space:nowrap}
.ck-contact{text-align:right;font-size:11px;line-height:1.55}
.ck-panel{margin-bottom:10px;padding:10px 12px;border:1.5px solid #222;border-radius:12px}
.ck-row{display:flex;flex-wrap:wrap;align-items:flex-end;gap:6px 10px;margin:4px 0}
.ck-label{font-weight:800;font-size:11px;white-space:nowrap}
.ck-fill{flex:1 1 120px;min-width:90px;min-height:17px;padding:0 4px;border-bottom:1px dotted #333;font-weight:700}
.ck-km{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:6px}
.ck-km>div{display:flex;align-items:center;gap:8px;padding:5px 8px;border:1px solid #333}
.ck-fuel{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px}
.ck-fuel-group{display:flex;align-items:center;gap:6px}
.ck-fuel-step{display:inline-flex;align-items:center;gap:3px;font-weight:700}
.ck-box{display:inline-block;width:14px;height:14px;border:1.5px solid #222;vertical-align:middle;position:relative}
.ck-box.is-ticked::after{content:"✓";position:absolute;inset:-4px 0 0 1px;color:${BRAND.accent};font-size:15px;font-weight:900;font-style:normal}
.ck-table{width:100%;border-collapse:collapse;margin-bottom:10px}
.ck-table th,.ck-table td{padding:3px 6px;border:1px solid #444;text-align:left;vertical-align:top;font-size:11px}
.ck-table thead th{background:#f2f2ee;text-align:center;font-weight:800}
.ck-table td:first-child{width:46%;font-weight:700}
.ck-table th:nth-child(2),.ck-table th:nth-child(3){width:27%}
.ck-status{font-weight:800}.ck-ok{color:#1d6b42}.ck-attention{color:#b00020}.ck-na{color:#666}
.ck-note{color:#333}
.ck-bottom{display:grid;grid-template-columns:.9fr 1.1fr;gap:10px;margin-bottom:10px}
.ck-comments{padding:8px 10px;border:1.5px solid #222;border-radius:4px}
.ck-comments p{margin:0 0 4px;font-weight:800}.ck-comments div{min-height:16px;border-bottom:1px dotted #333;margin-bottom:6px}
.ck-comments ul{margin:4px 0 0;padding-left:16px}
.ck-diagrams{display:grid;grid-template-columns:.75fr 1.25fr;gap:6px;align-items:center}
.ck-diagram{margin:0}.ck-diagram-image{position:relative}.ck-diagram img{width:100%;display:block}
.ck-diagram figcaption{text-align:center;color:#666;font-size:9px}
.ck-pin{position:absolute;transform:translate(-50%,-50%);min-width:17px;height:17px;padding:0 3px;border:1.5px solid #fff;border-radius:9px;color:#fff;font-size:8.5px;font-weight:800;line-height:14px;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ck-pin.is-out{background:${BRAND.accent}}.ck-pin.is-in{background:#1f5fae}
.ck-legend{display:flex;gap:12px;margin-top:4px;font-size:10px;color:#444}
.ck-legend i{display:inline-block;width:9px;height:9px;margin-right:4px;border-radius:50%;vertical-align:middle}
.ck-sign-panel{padding:10px 12px;border:1.5px solid #222;border-radius:12px}
.ck-sign-panel>p{margin:0 0 8px;font-family:Georgia,"Times New Roman",serif;font-size:12.5px}
.ck-sign{display:grid;grid-template-columns:auto 1.5fr auto .9fr auto 1fr;align-items:end;gap:6px;margin:10px 0}
.ck-sign-label{font-weight:800;font-size:11px;white-space:nowrap}
.ck-fill-sig{min-height:30px}.ck-fill-sig img{height:30px;max-width:100%;object-fit:contain;display:block}
@media(max-width:640px){.ck-head{grid-template-columns:1fr}.ck-contact{text-align:left}.ck-bottom,.ck-km{grid-template-columns:1fr}.ck-sign{grid-template-columns:auto 1fr}}
`;

/** The checklist form as an HTML fragment (use inside a document that includes `checklistStyles`). */
export function buildChecklistSection({ booking, customer, vehicle, company, out, in: back }: ChecklistInput) {
  const details = brandedCompany(company);
  const fuelType = vehicle?.fuelType;
  const rows = checklistRows({ ...(out?.checklist ?? {}), ...(back?.checklist ?? {}) });
  const outMarks = markList(out, "O");
  const inMarks = markList(back, "I");
  const comments = [out?.notes ? `<li><b>Out:</b> ${escapeHtml(out.notes)}</li>` : "", back?.notes ? `<li><b>In:</b> ${escapeHtml(back.notes)}</li>` : "", ...outMarks, ...inMarks].filter(Boolean);
  const companyName = details.name;
  return `<section class="ck-doc">
<header class="ck-head">
  <div class="ck-brand">${BRAND_LOGO_SVG}<div><strong>${escapeHtml(companyName.toUpperCase())}</strong><small>CAR RENTAL</small></div></div>
  <div class="ck-title">VEHICLE CHECKLIST</div>
  <div class="ck-contact">${escapeHtml(details.address)}<br>${escapeHtml(details.phone)}<br>${details.emails.map((address) => escapeHtml(address)).join("<br>")}</div>
</header>
<div class="ck-panel">
  <div class="ck-row"><span class="ck-label">RENTER’S NAME:</span><span class="ck-fill">${escapeHtml(customer?.name ?? "")}</span><span class="ck-label">Rep:</span><span class="ck-fill">${escapeHtml(out?.repName ?? "")}</span><span class="ck-label">Cell:</span><span class="ck-fill">${escapeHtml(customer?.phone ?? "")}</span></div>
  <div class="ck-row"><span class="ck-label">CAR MODEL:</span><span class="ck-fill">${escapeHtml(vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "")}</span><span class="ck-label">COLOUR</span><span class="ck-fill">${escapeHtml(vehicle?.colour ?? "")}</span><span class="ck-label">Reg. No.</span><span class="ck-fill">${escapeHtml(vehicle?.registration ?? "")}</span></div>
  <div class="ck-row"><span class="ck-label">Date of Hire:</span><span class="ck-fill">${escapeHtml(shortDate(out?.inspectionDate ?? booking.startDate))}</span><span class="ck-label">Date of Return:</span><span class="ck-fill">${escapeHtml(shortDate(back?.inspectionDate ?? booking.endDate))}</span></div>
  <div class="ck-km"><div><span class="ck-label">Outgoing</span><span class="ck-label">Kms</span><span class="ck-fill">${out ? escapeHtml(out.odometerKm.toLocaleString()) : ""}</span></div><div><span class="ck-label">Incoming</span><span class="ck-label">Kms</span><span class="ck-fill">${back ? escapeHtml(back.odometerKm.toLocaleString()) : ""}</span></div></div>
</div>
<div class="ck-panel ck-fuel">
  <span class="ck-label">FUEL</span>
  <span class="ck-fuel-group">Diesel <i class="ck-box${fuelType === "Diesel" ? " is-ticked" : ""}"></i></span>
  <span class="ck-fuel-group">Petrol <i class="ck-box${fuelType === "Petrol" ? " is-ticked" : ""}"></i></span>
  ${fuelType && fuelType !== "Diesel" && fuelType !== "Petrol" ? `<span class="ck-fuel-group">${escapeHtml(fuelType)} <i class="ck-box is-ticked"></i></span>` : ""}
  <span class="ck-label">(FUEL LEVEL):</span>
  <span class="ck-fuel-group"><span class="ck-label">OUT</span>${fuelBoxes(out?.fuelPercent)}</span>
  <span class="ck-fuel-group"><span class="ck-label">IN</span>${fuelBoxes(back?.fuelPercent)}</span>
</div>
<table class="ck-table"><thead><tr><th>Item</th><th>OUT</th><th>IN</th></tr></thead><tbody>
${rows.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${cell(out, row.key)}</td><td>${cell(back, row.key)}</td></tr>`).join("")}
</tbody></table>
<div class="ck-bottom">
  <div class="ck-comments"><p>Additional Comments:</p>${comments.length ? `<ul>${comments.join("")}</ul>` : "<div></div><div></div><div></div><div></div>"}</div>
  <div><div class="ck-diagrams">${diagram("front", "Front", out, back)}${diagram("left", "Left side", out, back)}${diagram("rear", "Rear", out, back)}${diagram("right", "Right side", out, back)}</div>
  <div class="ck-legend"><span><i style="background:${BRAND.accent}"></i>O = marked at pickup</span><span><i style="background:#1f5fae"></i>I = marked at return</span></div></div>
</div>
<div class="ck-sign-panel">
  <p>${escapeHtml(checklistDeclaration)}</p>
  ${signLine("Renter’s Full Name Out:", out?.signatoryName ?? "", out?.signatureDataUrl)}
  ${signLine(`For ${escapeHtml(companyName)} Rent A Car:`, out?.repName ?? "", out?.repSignatureDataUrl)}
  ${signLine("Renter’s Full Name In:", back?.signatoryName ?? "", back?.signatureDataUrl)}
  ${signLine(`For ${escapeHtml(companyName)} Rent A Car:`, back?.repName ?? "", back?.repSignatureDataUrl)}
</div>
</section>`;
}

/** A standalone printable checklist document. */
export function buildChecklistHtml(input: ChecklistInput) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vehicle checklist ${escapeHtml(input.booking.reference)}</title>
<style>@page{size:A4;margin:10mm}*{box-sizing:border-box}body{margin:0;padding:20px;background:#fff}main{max-width:780px;margin:0 auto}
.toolbar{position:sticky;top:0;display:flex;justify-content:flex-end;margin:-20px -20px 14px;padding:10px 20px;background:#f3f6f4;border-bottom:1px solid #dfe6e1}
.toolbar button{height:38px;padding:0 16px;border:0;border-radius:8px;background:${BRAND.accent};color:#fff;font:700 13px Arial,sans-serif;cursor:pointer}
@media print{.toolbar{display:none}body{padding:0}}${checklistStyles}</style></head>
<body><main><div class="toolbar"><button type="button" onclick="window.print()">Save as PDF / Print</button></div>${buildChecklistSection(input)}</main></body></html>`;
}

export function exportVehicleChecklist(input: ChecklistInput) {
  const url = URL.createObjectURL(new Blob([buildChecklistHtml(input)], { type: "text/html" }));
  const opened = window.open(url, "_blank");
  if (!opened) {
    const link = document.createElement("a");
    link.href = url; link.download = `vehicle-checklist-${input.booking.reference}.html`;
    document.body.appendChild(link); link.click(); link.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
