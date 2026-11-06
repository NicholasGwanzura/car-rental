import type { Booking, CompanyProfile, Customer, PrebookingInspection, Vehicle } from "@/lib/rental-data";
import { formatMoney, nightsBetween } from "@/lib/rental-data";
import { buildChecklistSection, checklistStyles } from "@/lib/vehicle-checklist";
import { BRAND, BRAND_LOGO_SVG, brandedCompany } from "@/lib/brand";
import { photoLabel, photoSrc } from "@/lib/vehicle-diagrams";
import { openHtmlDocument } from "@/lib/print-document";
import { deductionLabel, depositSummary, settlementText } from "@/lib/deposit";

/**
 * Clauses from "Classic_Ride Contract form_101021.docx". Editable in Company settings.
 * Lines starting with "CLAUSE" become headings and lines starting with "- " become bullets.
 * {{tokens}} are filled from the booking (customer, start, end, vehicle, registration, rate, deposit…).
 */
export const DEFAULT_CONTRACT_TERMS = `CLAUSE 1: SERVICE REQUIRED
Classic_Ride shall provide road vehicles for the use of: {{customer}}

CLAUSE 2: PAYMENT, HIRE PERIOD AND RETURN OF VEHICLE
Payment of the deposit and daily hire fees shall be made in advance before release of the vehicle.
In the event of extension of the hire period a new contract must be signed and payment made before expiry of the initial hire period. Using the vehicle beyond hire period without a new contract and payment is breach of contract.
Standard vehicle hire period is in multiples of one (1) day made up of 24 hours. Hired vehicles are strictly to be returned exactly within the agreed hire period and delays to return the vehicle without prior arrangement will attract penalties as follows:
- Delay of between 0 to 1 hour from expiry of hire period – no penalty
- Delay of between 1 to 12 hours from expiry of hire period – 60% of daily hire charge
- Delay of between 12 to 24 hours from expiry of hire period – 100% of daily hire charge

CLAUSE 3: VEHICLE SERVICING, MAINTENANCE AND USAGE
- The client shall be responsible for fueling the vehicle during hire period.
- In the event that a client hires out a car with fuel, the fuel must be at the same level when the vehicle is returned to Classic_Ride Car rental.
- It is the responsibility of the driver to check engine oil, brake fluid, transmission fluid and water levels during the time of rental. The driver shall be held liable for any damages incurred as a result of the factors mentioned above.
- In case of a mechanical breakdown, theft of the vehicle or an accident the renter should immediately notify Classic_Ride Car rental and ensure vehicle is secured.
- All damages to the exterior and interior of the car, tyres and rims shall be the responsibility of the Renter in order to repair and restore the vehicle original state.
- The vehicle will not be used to push or tow any other vehicle or trailer or any race, speed test or contest.
- In the event of a road accident or theft, a full police report and the full details of the other party must be obtained at the scene as this may be necessary if Insurance has to cover repairs or replace the vehicle. In the event of insurance claims not covering the cost of the damage incurred, the difference shall be borne by the renter.
- It is strictly prohibited to repair any accident damages without prior authorization by Classic_Ride.
- It is strictly prohibited to sub-hire the vehicle to a third party.
- Any penalties incurred while on hire, shall be borne by the renter. This includes road traffic penalties such as over-speeding, or failure to comply with the Road Traffic Act statutes, and local authority road traffic regulations.
- The renter shall return the vehicle in a clean state failure of which a fee to wash the car will be charged to ensure the vehicle is restored to its original state at point of hire.

CLAUSE 4: EFFECTIVE DATE OF AGREEMENT, PERIOD OF VALIDITY AND MODIFICATIONS
This Agreement shall become legally binding & effective from the date of signing. Any modifications of the terms herein laid out shall be in writing in the form of an addendum and signed by representatives of each party.

CLAUSE 5: TERMINATION
This Agreement may be terminated by either party providing a minimum of one day's notice in writing.`;

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function longDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Harare" }).format(new Date(value.length <= 10 ? `${value}T12:00:00` : value));
}

export type ContractInput = { booking: Booking; customer?: Customer; vehicle?: Vehicle; company: CompanyProfile; pickup?: PrebookingInspection };

export function fillContractTokens(terms: string, { booking, customer, vehicle, company }: ContractInput) {
  const tokens: Record<string, string> = {
    company: brandedCompany(company).name,
    customer: customer?.name ?? "the Renter",
    vehicle: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "the vehicle",
    registration: vehicle?.registration ?? "",
    reference: booking.reference,
    start: longDate(booking.startDate),
    end: longDate(booking.endDate),
    days: String(nightsBetween(booking.startDate, booking.endDate)),
    rate: formatMoney(vehicle?.dailyRate ?? 0),
    total: formatMoney(booking.total),
    deposit: formatMoney(booking.depositAmount ?? vehicle?.depositAmount ?? 0),
    mileage: `${booking.mileageAllowanceKmPerDay ?? vehicle?.mileageAllowanceKmPerDay ?? 0} km/day`,
    excessRate: `${formatMoney(booking.excessMileageRatePerKm ?? vehicle?.excessMileageRatePerKm ?? 0)}/km`,
  };
  return terms.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => tokens[key] ?? match);
}

function renderTerms(terms: string) {
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { out.push(`<ul>${list.join("")}</ul>`); list = []; } };
  for (const raw of terms.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (/^-\s+/.test(line)) { list.push(`<li>${escapeHtml(line.replace(/^-\s+/, ""))}</li>`); continue; }
    flush();
    out.push(/^CLAUSE\b/i.test(line) ? `<h3>${escapeHtml(line)}</h3>` : `<p>${escapeHtml(line)}</p>`);
  }
  flush();
  return out.join("");
}

function contractStyles() {
  return `@page{size:A4;margin:16mm}
*{box-sizing:border-box}
body{margin:0;padding:24px;background:#fff;color:#111;font:12.5px/1.55 "Times New Roman",Times,serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.brand-head{display:flex;justify-content:space-between;align-items:center;gap:20px;padding-bottom:12px}
.brand-mark{display:flex;align-items:center;gap:11px;font-family:Arial,Helvetica,sans-serif}
.brand-mark strong{display:block;color:${BRAND.ink};font-size:17px;font-weight:800;letter-spacing:1.4px}
.brand-mark small{display:block;color:${BRAND.muted};font-size:10px;font-weight:700;letter-spacing:2.6px}
.brand-contact{text-align:right;color:#333;font:10.5px/1.6 Arial,Helvetica,sans-serif}
.brand-contact a{color:inherit;text-decoration:none}
.brand-bar{height:4px;margin-bottom:14px;background:linear-gradient(90deg,${BRAND.ink} 0 72%,${BRAND.accent} 72% 100%)}
.doc-meta{display:flex;justify-content:space-between;gap:12px;margin-bottom:6px;color:#555;font:10.5px Arial,Helvetica,sans-serif}
.doc-meta strong{color:${BRAND.accent}}
.page-foot{margin-top:28px;padding-top:8px;border-top:2px solid ${BRAND.accent};display:flex;justify-content:space-between;gap:12px;color:#555;font:9.5px Arial,Helvetica,sans-serif}
main{max-width:760px;margin:0 auto}
h1{margin:6px 0 18px;text-align:center;color:${BRAND.ink};font:800 19px Arial,Helvetica,sans-serif;letter-spacing:1.6px}
h1::after{content:"";display:block;width:56px;height:3px;margin:8px auto 0;background:${BRAND.accent}}
h2{margin:26px 0 8px;color:${BRAND.ink};font:800 13px Arial,Helvetica,sans-serif;letter-spacing:.4px}
h3{margin:16px 0 4px;color:${BRAND.ink};font:800 11.5px Arial,Helvetica,sans-serif;letter-spacing:.5px}
h3::before{content:"";display:inline-block;width:8px;height:8px;margin-right:7px;border-radius:50%;background:${BRAND.accent}}
p{margin:6px 0}ul{margin:4px 0;padding-left:22px}li{margin:2px 0}
.fill{display:inline-block;min-width:160px;padding:0 4px;border-bottom:1px dotted #111;font-weight:700}
table{width:100%;border-collapse:collapse;margin:8px 0}th,td{padding:5px 7px;border:1px solid #333;text-align:left;vertical-align:top}th{background:${BRAND.ink};color:#fff;font-family:Arial,Helvetica,sans-serif;font-size:11px}.facts th{background:${BRAND.soft};color:#111}
.facts th{width:20%}.checklist td.issue{color:#a00;font-weight:700}
.signatures{display:grid;grid-template-columns:1fr 1fr;gap:34px;margin-top:22px;break-inside:avoid}
.sig .line{height:72px;border-bottom:1px solid #111;display:flex;align-items:flex-end}.sig img{max-height:70px;max-width:100%;object-fit:contain}
.sig small{display:block;margin-top:3px}
.custody{margin-top:18px;font-style:italic}
.appendix,.receipt{break-before:page}
.receipt{margin-top:40px;padding-top:28px;border-top:2px dashed #ccc}
.receipt-table th{width:46%;background:#f7f8f5;color:#111}
.receipt-table tr.subtotal td,.receipt-table tr.deposit td{background:#fff8f3}
.receipt-table tr.total th,.receipt-table tr.total td{background:#0b0b0b;color:#fff;font-size:14px}
.receipt-table tr.due td{color:#a00}
.receipt-table tr.refund td{color:#1d6b42}
.receipt-table tr.deduction td{color:#8f3832}
.receipt-table tr.net th,.receipt-table tr.net td{background:#f1f8f4;font-weight:700}
.receipt-note{margin-top:12px;padding:10px 12px;border-left:3px solid ${BRAND.accent};background:#fff8f3}
@media print{.receipt{margin-top:0;padding-top:0;border-top:0}}
.photos{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}figure{margin:0;break-inside:avoid}.photo{position:relative}.photo img{width:100%;display:block}
.photo.diagram{border:1px solid #ddd;border-radius:4px}.photo span{position:absolute;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:${BRAND.accent};color:#fff;border:2px solid #fff;font:700 10px/1 Arial,sans-serif;display:grid;place-items:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}
figcaption{font-size:10px;color:#555}
.toolbar{position:sticky;top:0;display:flex;justify-content:flex-end;margin:-24px -24px 16px;padding:10px 24px;background:#f3f6f4;border-bottom:1px solid #dfe6e1}
.toolbar button{height:38px;padding:0 16px;border:0;border-radius:8px;background:${BRAND.accent};color:#fff;font:700 13px Arial,sans-serif;cursor:pointer}
${checklistStyles}
@media print{.toolbar{display:none}body{padding:0 0 12mm}.page-foot{position:fixed;left:0;right:0;bottom:0;margin:0;background:#fff}}
@media(max-width:600px){.brand-head{flex-direction:column;align-items:flex-start}.brand-contact{text-align:left}body{padding:16px}.toolbar{margin:-16px -16px 14px;padding:10px 16px}.signatures{grid-template-columns:1fr}.photos{grid-template-columns:repeat(2,1fr)}.fill{min-width:110px}}`;
}

/**
 * The branded rental receipt: number of days, charges, the refundable deposit and what has been received.
 * Used as the last page of the contract and, on its own, as the receipt a customer can be given or sent.
 */
export function buildReceiptSection(input: ContractInput, issuedAt?: string) {
  const { booking, customer, vehicle, company, pickup } = input;
  const details = brandedCompany(company);
  const companyName = details.name;
  const renter = customer?.name ?? "";
  const fill = (value: unknown) => `<span class="fill">${escapeHtml(value) || "&nbsp;"}</span>`;
  const dailyRate = vehicle?.dailyRate ?? 0;
  const deposit = booking.depositAmount ?? vehicle?.depositAmount ?? 0;
  const signedDate = longDate(issuedAt ?? pickup?.signedAt ?? new Date().toISOString());
  const days = nightsBetween(booking.startDate, booking.endDate);
  const excess = booking.excessMileageCharge ?? 0;
  const rentalCharges = booking.total + excess;
  const rentalPaid = booking.paymentStatus === "Paid";
  const dep = depositSummary(booking, vehicle?.depositAmount ?? 0);
  const depositReceived = dep.state === "held" || dep.state === "settled";
  const depositSettled = dep.state === "settled";
  const totalReceived = (rentalPaid ? rentalCharges : 0) + (depositReceived ? deposit : 0);
  const outcomeText = dep.outcome === "full" ? "Returned to customer" : dep.outcome === "partial" ? "Partly returned" : "Kept to cover charges";
  const receiptRow = (label: string, value: string, className = "") => `<tr${className ? ` class="${className}"` : ""}><th>${label}</th><td>${value}</td></tr>`;
  return `<section class="receipt">
<header class="brand-head"><div class="brand-mark">${BRAND_LOGO_SVG}<div><strong>${escapeHtml(companyName.toUpperCase())}</strong><small>CAR RENTAL</small></div></div><div class="brand-contact">${escapeHtml(details.address)}<br>${escapeHtml(details.phone)}<br>${escapeHtml(details.emails.join(" · "))} · ${escapeHtml(details.website)}</div></header>
<div class="brand-bar"></div>
<div class="doc-meta"><span>Receipt no: <strong>RC-${escapeHtml(booking.reference.replace(/^BK-/, ""))}</strong></span><span>Date: ${escapeHtml(signedDate)}</span></div>
<h1>RENTAL RECEIPT</h1>
<p>Received from ${fill(renter)} for the hire of the vehicle below under contract ${escapeHtml(booking.reference)}.</p>
<table class="receipt-table">
${receiptRow("Vehicle", escapeHtml(vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.registration}` : "—"))}
${receiptRow("Rental period", `${escapeHtml(longDate(booking.startDate))} to ${escapeHtml(longDate(booking.endDate))}`)}
${receiptRow("Number of days", `<strong>${days} ${days === 1 ? "day" : "days"}</strong>`)}
${receiptRow("Daily rate", `${escapeHtml(formatMoney(dailyRate))} per day`)}
${receiptRow(`Rental charge (${days} × ${escapeHtml(formatMoney(dailyRate))})`, escapeHtml(formatMoney(booking.total)))}
${excess > 0 ? receiptRow(`Excess mileage (${escapeHtml(booking.excessMileageKm ?? 0)} km)`, escapeHtml(formatMoney(excess))) : ""}
${receiptRow("Rental charges", `<strong>${escapeHtml(formatMoney(rentalCharges))}</strong> · ${rentalPaid ? "Paid" : "Balance due"}`, "subtotal")}
${deposit > 0 ? receiptRow("Refundable deposit", `<strong>${escapeHtml(formatMoney(deposit))}</strong> · ${depositSettled ? outcomeText : depositReceived ? "Received" : "Not yet received"}`, "deposit") : receiptRow("Refundable deposit", "None")}
${receiptRow("Total received", `<strong>${escapeHtml(formatMoney(totalReceived))}</strong>`, "total")}
${depositSettled ? dep.deductions.map((item) => receiptRow(`Kept from deposit: ${escapeHtml(deductionLabel(item))}`, escapeHtml(formatMoney(item.amount)), "deduction")).join("") + (dep.refund > 0 ? receiptRow("Refunded to customer", `−${escapeHtml(formatMoney(dep.refund))}`, "refund") : "") + receiptRow("Net paid after refund", `<strong>${escapeHtml(formatMoney(totalReceived - dep.refund))}</strong>`, "net") : ""}
${!rentalPaid ? receiptRow("Balance due", `<strong>${escapeHtml(formatMoney(rentalCharges))}</strong>`, "due") : ""}
</table>
${deposit > 0 ? (depositSettled ? `<p class="receipt-note"><strong>Deposit settled${dep.settledAt ? ` on ${escapeHtml(longDate(dep.settledAt))}` : ""}.</strong> ${escapeHtml(settlementText(dep, formatMoney))}${dep.deductions.length ? `, to cover ${escapeHtml(dep.deductions.map(deductionLabel).join("; ").toLowerCase())}` : ""}.</p>` : `<p class="receipt-note"><strong>Deposit is refundable.</strong> The ${escapeHtml(formatMoney(deposit))} deposit is returned when the vehicle comes back on time and in the condition recorded at pickup, less any charges for damage, missing accessories, fuel, traffic fines or excess mileage.</p>`) : ""}
<div class="signatures">
<div class="sig"><strong>Received by, for ${escapeHtml(companyName)} Car Rental</strong><div class="line">${pickup?.repSignatureDataUrl ? `<img src="${pickup.repSignatureDataUrl}" alt="Representative signature">` : ""}</div><small>Signature &nbsp;·&nbsp; ${escapeHtml(signedDate)}</small><p>Name ${fill(pickup?.repName ?? "")}</p></div>
<div class="sig"><strong>Customer</strong><div class="line">${pickup?.signatureDataUrl ? `<img src="${pickup.signatureDataUrl}" alt="Customer signature">` : ""}</div><small>Signature &nbsp;·&nbsp; ${escapeHtml(signedDate)}</small><p>Name ${fill(pickup?.signatoryName || renter)}</p></div>
</div>
</section>`;
}

/** A standalone receipt for a booking, issued today: shows the deposit as received or returned as it now stands. */
export function buildReceiptHtml(input: ContractInput) {
  const details = brandedCompany(input.company);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rental receipt RC-${escapeHtml(input.booking.reference.replace(/^BK-/, ""))}</title>
<style>
${contractStyles()}
.receipt{break-before:auto;margin:0;padding:0;border:0}
</style></head><body><main>
<div class="toolbar"><button type="button" onclick="window.print()">Save as PDF / Print</button></div>
${buildReceiptSection(input, new Date().toISOString())}
<footer class="page-foot"><span>${escapeHtml(details.name)} Car Rental · ${escapeHtml(details.address)}</span><span>${escapeHtml(details.phone)} · ${escapeHtml(details.emails.join(" · "))} · ${escapeHtml(details.website)}</span></footer>
</main></body></html>`;
}

export function buildContractHtml(input: ContractInput) {
  const { booking, customer, vehicle, company, pickup } = input;
  const terms = fillContractTokens(company.contractTerms?.trim() || DEFAULT_CONTRACT_TERMS, input);
  const details = brandedCompany(company);
  const companyName = details.name;
  const renter = customer?.name ?? "";
  const fill = (value: unknown) => `<span class="fill">${escapeHtml(value) || "&nbsp;"}</span>`;
  const dailyRate = vehicle?.dailyRate ?? 0;
  const excessRate = booking.excessMileageRatePerKm ?? vehicle?.excessMileageRatePerKm ?? 0;
  const kmPerDay = booking.mileageAllowanceKmPerDay ?? vehicle?.mileageAllowanceKmPerDay ?? 0;
  const signedDate = longDate(pickup?.signedAt ?? new Date().toISOString());
  const receipt = buildReceiptSection(input, pickup?.signedAt);
  const realPhotos = (pickup?.photos ?? []).filter((photo) => !photo.diagram);
  const photoEvidence = realPhotos.length ? `<section class="appendix"><h2>Photo evidence at pickup</h2><div class="photos">${realPhotos.map((photo) => `<figure><div class="photo"><img src="${photoSrc(photo)}" alt="">${(photo.marks ?? []).map((mark, markIndex) => `<span style="left:${mark.x}%;top:${mark.y}%">${markIndex + 1}</span>`).join("")}</div><figcaption>${escapeHtml(photoLabel(photo, pickup?.photos ?? []))}${(photo.marks ?? []).length ? ` · ${(photo.marks ?? []).map((mark, index) => `${index + 1}. ${escapeHtml(mark.type)}${mark.note ? ` (${escapeHtml(mark.note)})` : ""}`).join(", ")}` : ""}</figcaption></figure>`).join("")}</div></section>` : "";
  const appendix = `<section class="appendix">${buildChecklistSection({ booking, customer, vehicle, company, out: pickup })}</section>${photoEvidence}`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vehicle rental contract ${escapeHtml(booking.reference)}</title>
<style>
${contractStyles()}
</style></head><body><main>
<div class="toolbar"><button type="button" onclick="window.print()">Save as PDF / Print</button></div>
<header class="brand-head"><div class="brand-mark">${BRAND_LOGO_SVG}<div><strong>${escapeHtml(companyName.toUpperCase())}</strong><small>CAR RENTAL</small></div></div>
<div class="brand-contact">${escapeHtml(details.address)}<br><a href="tel:${escapeHtml(details.phone.split(/[·,;|]/)[0].replace(/\s+/g, ""))}">${escapeHtml(details.phone)}</a><br>${details.emails.map((address) => `<a href="mailto:${escapeHtml(address)}">${escapeHtml(address)}</a>`).join(" · ")} · ${escapeHtml(details.website)}</div></header>
<div class="brand-bar"></div>
<div class="doc-meta"><span>Contract ref: <strong>${escapeHtml(booking.reference)}</strong></span><span>Date: ${escapeHtml(signedDate)}</span></div>
<h1>VEHICLE RENTAL CONTRACT</h1>
<p>This agreement, made between <strong>${escapeHtml(companyName.toUpperCase())} CAR RENTAL</strong> and ${fill(renter)} ID No. ${fill(customer?.idNumber)} Licence No. ${fill(customer?.licence)} (Thereafter referred to as renter and licensed driver) is entered into at Harare, Zimbabwe. (In the event of another person driving the vehicle, please submit name identity document and driver’s license to our office at time of signing this contract)</p>
<p>The purpose of this agreement is to establish the services of transportation, which the Transport Company has agreed to provide and, ${fill(renter)} has agreed to receive under the following terms and conditions.</p>
${renderTerms(terms)}
<h2>NB: This annex shows the agreed rates with effect from</h2>
<p>From: ${fill(longDate(booking.startDate))} &nbsp; To: ${fill(longDate(booking.endDate))}</p>
<p>Vehicles under the Vehicle Rental Agreement between ${escapeHtml(companyName)} Car Rental and the renter are as follows:</p>
<table><thead><tr><th>Make</th><th>Model</th><th>Registration</th><th>Daily Charge (US DOLLARS)</th></tr></thead><tbody><tr><td>${escapeHtml(vehicle?.make ?? "")}</td><td>${escapeHtml(vehicle?.model ?? "")}</td><td>${escapeHtml(vehicle?.registration ?? "")}</td><td>${escapeHtml(formatMoney(dailyRate))} per day · Excess ${escapeHtml(formatMoney(excessRate))} per km · ${escapeHtml(kmPerDay)} km per day</td></tr></tbody></table>
<p>${escapeHtml(companyName)} Car Rental and the renter agree to the list above and that this vehicle is covered under the general Agreement as signed by both parties and accept the terms above, and agree to be bound by them.</p>
<div class="signatures">
<div class="sig"><strong>For &amp; on behalf of ${escapeHtml(companyName)} Car Rental</strong><div class="line">${pickup?.repSignatureDataUrl ? `<img src="${pickup.repSignatureDataUrl}" alt="Representative signature">` : ""}</div><small>Signature/Stamp &nbsp;·&nbsp; ${pickup?.repSignatureDataUrl ? escapeHtml(signedDate) : "Date"}</small><p>Name ${fill(pickup?.repName ?? "")}</p></div>
<div class="sig"><strong>For &amp; on behalf of ${escapeHtml(renter || "the renter")}</strong><div class="line">${pickup?.signatureDataUrl ? `<img src="${pickup.signatureDataUrl}" alt="Renter signature">` : ""}</div><small>Signature &nbsp;·&nbsp; ${escapeHtml(signedDate)}</small><p>Name ${fill(pickup?.signatoryName || renter)}</p></div>
</div>
<p>Residential Address ${fill(customer?.address)}</p>
<p class="custody">After the signing of this contract, the client is taking custody of the vehicle and therefore the terms of this contract shall remain binding as long as the vehicle is in the custody of the client.</p>
${receipt}
${appendix}
<footer class="page-foot"><span>${escapeHtml(companyName)} Car Rental · ${escapeHtml(details.address)}</span><span>${escapeHtml(details.phone)} · ${escapeHtml(details.emails.join(" · "))} · ${escapeHtml(details.website)}</span></footer>
</main></body></html>`;
}

/** Opens the contract in a new tab with a print/save-as-PDF button; falls back to downloading the file. */
export function exportRentalContract(input: ContractInput) {
  const html = buildContractHtml(input);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank");
  if (!opened) {
    const link = document.createElement("a");
    link.href = url;
    link.download = `rental-contract-${input.booking.reference}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Opens the customer's receipt in a new tab with a Save as PDF / Print button. */
export function exportRentalReceipt(input: ContractInput) {
  openHtmlDocument(buildReceiptHtml(input), `rental-receipt-${input.booking.reference}.html`);
}
