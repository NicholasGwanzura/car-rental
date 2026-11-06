import { checkStatusLabels, checklistDeclaration, checklistRows } from "@/components/inspection-inputs";
import { buildDocument, dateTime, escapeHtml, km, longDate, openHtmlDocument } from "@/lib/print-document";
import type { Booking, CompanyProfile, Customer, InspectionCheckStatus, PrebookingInspection, Vehicle } from "@/lib/rental-data";
import { photoLabel, photoSrc } from "@/lib/vehicle-diagrams";

/**
 * A printable report for one vehicle inspection: the odometer reading and its photo, fuel, the full
 * checklist, photos and damage pins, signatures and (for a return) what changed since pickup.
 */

export type InspectionReportInput = {
  inspection: PrebookingInspection;
  customer?: Customer;
  vehicle?: Vehicle;
  booking?: Booking;
  company: CompanyProfile;
  /** The pickup inspection for the same booking, when this is a return. */
  pickup?: PrebookingInspection;
};

const pill = (status?: InspectionCheckStatus) => status ? `<span class="pill pill-${status === "ok" ? "ok" : status === "attention" ? "issue" : "na"}">${escapeHtml(checkStatusLabels[status])}</span>` : `<span class="muted">—</span>`;

function marksList(marks: { type: string; note?: string }[]) {
  return marks.length ? `<ol class="marks">${marks.map((mark, index) => `<li>${index + 1}. <strong>${escapeHtml(mark.type)}</strong>${mark.note ? ` – ${escapeHtml(mark.note)}` : ""}</li>`).join("")}</ol>` : "";
}

/** The pickup inspection that belongs with a return inspection (same booking, stage Pickup). */
export function pickupFor(inspection: PrebookingInspection, inspections: PrebookingInspection[]) {
  if (inspection.stage !== "Return" || !inspection.bookingId) return undefined;
  return inspections.filter((item) => item.bookingId === inspection.bookingId && item.stage === "Pickup").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function buildInspectionReportHtml({ inspection, customer, vehicle, booking, company, pickup }: InspectionReportInput) {
  const stage = inspection.stage ?? "Pre-booking";
  const rows = checklistRows(inspection.checklist);
  const statusOf = (key: string) => inspection.checklist?.[key];
  const issues = rows.filter((row) => statusOf(row.key) === "attention");
  const okCount = rows.filter((row) => statusOf(row.key) === "ok").length;
  const naCount = rows.filter((row) => statusOf(row.key) === "na").length;
  const vehicleName = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.registration}` : "Vehicle removed";
  const realPhotos = inspection.photos.filter((photo) => !photo.diagram);
  const diagrams = inspection.photos.filter((photo) => photo.diagram);
  const reference = booking?.reference ?? `INS-${inspection.id.slice(0, 6).toUpperCase()}`;
  const marked = inspection.photos.reduce((total, photo) => total + (photo.marks?.length ?? 0), 0);

  const facts = [
    ["Customer", escapeHtml(customer?.name ?? "Customer removed")],
    ["Vehicle", escapeHtml(vehicleName)],
    ["Booking", escapeHtml(booking?.reference ?? "Not linked to a booking")],
    ["Inspection", `${escapeHtml(stage)} · ${escapeHtml(longDate(inspection.inspectionDate))}`],
    ["Odometer", `<strong>${escapeHtml(km(inspection.odometerKm))}</strong>`],
    ["Fuel level", `${escapeHtml(inspection.fuelPercent)}%`],
    ["Overall condition", escapeHtml(inspection.condition)],
    ["Carried out for", escapeHtml(`${company.name || "Classic Rides"}${inspection.repName ? ` by ${inspection.repName}` : ""}`)],
  ];

  // Pickup vs return comparison.
  let comparison = "";
  if (pickup) {
    const changed = rows.filter((row) => (pickup.checklist?.[row.key] ?? undefined) !== statusOf(row.key));
    const newIssues = changed.filter((row) => statusOf(row.key) === "attention" && pickup.checklist?.[row.key] !== "attention");
    const driven = inspection.odometerKm - pickup.odometerKm;
    comparison = `<h2>Changes since pickup <small>${escapeHtml(longDate(pickup.inspectionDate))}</small></h2>
<div class="stats">
<div class="stat"><span>Distance driven</span><strong>${escapeHtml(km(Math.max(0, driven)))}</strong></div>
<div class="stat"><span>Fuel</span><strong>${escapeHtml(pickup.fuelPercent)}% → ${escapeHtml(inspection.fuelPercent)}%</strong></div>
<div class="stat ${newIssues.length ? "is-accent" : ""}"><span>New issues</span><strong>${newIssues.length}</strong></div>
</div>
${changed.length ? `<table><thead><tr><th>Item</th><th>At pickup</th><th>At return</th></tr></thead><tbody>${changed.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${pill(pickup.checklist?.[row.key])}</td><td>${pill(statusOf(row.key))}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">No checklist items changed between pickup and return.</p>`}`;
  }

  const photosHtml = realPhotos.length ? `<h2>Photos <small>${realPhotos.length} ${realPhotos.length === 1 ? "photo" : "photos"}${marked ? ` · ${marked} damage ${marked === 1 ? "mark" : "marks"}` : ""}</small></h2>
<div class="photos">${realPhotos.map((photo) => `<figure><div class="photo"><img src="${photoSrc(photo)}" alt="">${(photo.marks ?? []).map((mark, index) => `<span style="left:${mark.x}%;top:${mark.y}%">${index + 1}</span>`).join("")}</div><figcaption><strong>${escapeHtml(photoLabel(photo, inspection.photos))}</strong>${marksList(photo.marks ?? [])}</figcaption></figure>`).join("")}</div>` : "";

  const diagramsHtml = diagrams.length ? `<h2>Damage diagrams</h2>
<div class="photos">${diagrams.map((photo) => `<figure><div class="photo"><img src="${photoSrc(photo)}" alt="">${(photo.marks ?? []).map((mark, index) => `<span style="left:${mark.x}%;top:${mark.y}%">${index + 1}</span>`).join("")}</div><figcaption><strong>${escapeHtml(photoLabel(photo, inspection.photos))}</strong>${marksList(photo.marks ?? [])}</figcaption></figure>`).join("")}</div>` : "";

  const body = `<table class="facts"><tbody>${[0, 2, 4, 6].map((i) => `<tr><th>${facts[i][0]}</th><td>${facts[i][1]}</td><th>${facts[i + 1][0]}</th><td>${facts[i + 1][1]}</td></tr>`).join("")}</tbody></table>
<div class="stats">
<div class="stat"><span>Checklist OK</span><strong>${okCount}</strong></div>
<div class="stat ${issues.length ? "is-accent" : ""}"><span>Issues</span><strong>${issues.length}</strong></div>
<div class="stat"><span>Not applicable</span><strong>${naCount}</strong></div>
<div class="stat"><span>Damage marks</span><strong>${marked}</strong></div>
</div>
${inspection.notes ? `<div class="callout"><strong>Notes:</strong> ${escapeHtml(inspection.notes).replace(/\n/g, "<br>")}</div>` : ""}
${issues.length ? `<div class="callout is-issue"><strong>Issues recorded:</strong> ${issues.map((row) => `${escapeHtml(row.label)}${inspection.checklistNotes?.[row.key] ? ` (${escapeHtml(inspection.checklistNotes[row.key])})` : ""}`).join("; ")}.</div>` : ""}
${inspection.odometerPhotoDataUrl ? `<h2>Odometer reading</h2><figure class="odometer-photo"><div class="photo"><img src="${inspection.odometerPhotoDataUrl}" alt="Odometer"></div><figcaption>Dashboard photo taken at the inspection · recorded as <strong>${escapeHtml(km(inspection.odometerKm))}</strong></figcaption></figure>` : ""}
${comparison}
<h2>Vehicle checklist</h2>
<table><thead><tr><th>Item</th><th style="width:110px">Status</th><th>Details</th></tr></thead><tbody>
${rows.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${pill(statusOf(row.key))}</td><td>${escapeHtml(inspection.checklistNotes?.[row.key] ?? "")}</td></tr>`).join("")}
</tbody></table>
${photosHtml}
${diagramsHtml}
<p class="muted" style="margin-top:18px"><em>${escapeHtml(checklistDeclaration)}</em></p>
<div class="signatures">
<div class="sig"><strong>Customer</strong><div class="line">${inspection.signatureDataUrl ? `<img src="${inspection.signatureDataUrl}" alt="Customer signature">` : ""}</div><small>${escapeHtml(inspection.signatoryName ?? customer?.name ?? "")}${inspection.signedAt ? ` · ${escapeHtml(dateTime(inspection.signedAt))}` : ""}</small></div>
<div class="sig"><strong>For ${escapeHtml(company.name || "Classic Rides")} Car Rental</strong><div class="line">${inspection.repSignatureDataUrl ? `<img src="${inspection.repSignatureDataUrl}" alt="Representative signature">` : ""}</div><small>${escapeHtml(inspection.repName ?? "")}${inspection.signedAt ? ` · ${escapeHtml(dateTime(inspection.signedAt))}` : ""}</small></div>
</div>`;

  return buildDocument({
    title: `Inspection report ${reference} ${stage}`,
    company,
    heading: "VEHICLE INSPECTION REPORT",
    subtitle: `${stage} inspection · ${vehicleName} · ${longDate(inspection.inspectionDate)}`,
    reference,
    body,
    extraStyles: ".marks{margin:2px 0 0;padding-left:14px;color:#333}.marks li{list-style:none;margin-left:-14px}",
  });
}

export function exportInspectionReport(input: InspectionReportInput) {
  openHtmlDocument(buildInspectionReportHtml(input), `inspection-report-${input.booking?.reference ?? input.inspection.id.slice(0, 6)}-${(input.inspection.stage ?? "inspection").toLowerCase()}.html`);
}
