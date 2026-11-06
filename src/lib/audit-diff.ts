/**
 * Works out what changed between two versions of the workspace, as readable audit entries.
 * Runs on the server after every save, so entries reflect what was actually stored.
 */

export type AuditEntity = "vehicle" | "customer" | "booking" | "maintenance" | "inspection" | "expense" | "company";
export type AuditAction = "created" | "updated" | "deleted";
export type AuditChange = { field: string; from?: string; to?: string };
export type AuditEntry = { entity: AuditEntity; entityId: string; action: AuditAction; summary: string; changes: AuditChange[] };

type Doc = Record<string, unknown>;
type Item = Record<string, unknown>;

const collections: { key: string; entity: AuditEntity }[] = [
  { key: "vehicles", entity: "vehicle" },
  { key: "customers", entity: "customer" },
  { key: "bookings", entity: "booking" },
  { key: "maintenance", entity: "maintenance" },
  { key: "inspections", entity: "inspection" },
  { key: "expenses", entity: "expense" },
];

/** Readable field names; fields not listed are reported by their key. */
const fieldLabels: Record<string, string> = {
  status: "status", paymentStatus: "payment", depositStatus: "deposit", total: "total", startDate: "pickup date", endDate: "return date",
  dailyRate: "day rate", depositAmount: "deposit amount", registration: "registration", make: "make", model: "model", colour: "colour",
  phone: "phone", email: "email", name: "name", address: "address", licence: "licence number", idNumber: "ID number",
  checkoutOdometer: "pickup odometer", returnOdometer: "return odometer", odometerKm: "odometer", fuelPercent: "fuel", amount: "amount",
  category: "category", payee: "paid to", dueDate: "due date", cost: "cost", title: "title", condition: "condition",
  excessMileageCharge: "excess mileage charge", vehicleType: "type", transmission: "transmission", fuelType: "fuel type",
  idPhotoDataUrl: "ID photo", licencePhotoDataUrl: "licence photo", imageDataUrl: "vehicle photo", receiptDataUrl: "receipt", odometerPhotoDataUrl: "odometer photo",
  invoicePrefix: "invoice prefix", paymentInstructions: "payment instructions", contractTerms: "contract clauses", secondaryEmail: "second email",
};

/** Fields that are images or bulky blobs: report that they changed, not their contents. */
const opaqueFields = new Set(["idPhotoDataUrl", "licencePhotoDataUrl", "imageDataUrl", "receiptDataUrl", "odometerPhotoDataUrl", "photos", "signatureDataUrl", "repSignatureDataUrl", "contractTerms", "checklist", "checklistNotes"]);
const ignoredFields = new Set(["createdAt", "updatedAt"]);

function money(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? `$${number.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : String(value ?? "");
}

function display(field: string, value: unknown) {
  if (value === undefined || value === null || value === "") return "—";
  if (["total", "dailyRate", "depositAmount", "amount", "cost", "excessMileageCharge"].includes(field)) return money(value);
  if (["checkoutOdometer", "returnOdometer", "odometerKm"].includes(field)) return `${Number(value).toLocaleString("en-US")} km`;
  if (field === "fuelPercent") return `${value}%`;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}

function label(entity: AuditEntity, item: Item, doc: Doc) {
  const find = (key: string, id: unknown) => (Array.isArray(doc[key]) ? (doc[key] as Item[]) : []).find((record) => record.id === id);
  switch (entity) {
    case "vehicle": return `${item.make ?? ""} ${item.model ?? ""}${item.registration ? ` (${item.registration})` : ""}`.trim();
    case "customer": return String(item.name ?? "customer");
    case "booking": return String(item.reference ?? "booking");
    case "maintenance": { const vehicle = find("vehicles", item.vehicleId); return `${item.title ?? "service"}${vehicle ? ` on ${vehicle.registration ?? vehicle.model}` : ""}`; }
    case "inspection": { const booking = find("bookings", item.bookingId); const vehicle = find("vehicles", item.vehicleId); return `${item.stage ?? "vehicle"} inspection${booking ? ` for ${booking.reference}` : vehicle ? ` of ${vehicle.registration ?? vehicle.model}` : ""}`; }
    case "expense": return `${money(item.amount)} ${item.category ?? "expense"}${item.payee ? ` to ${item.payee}` : ""}`;
    default: return "company settings";
  }
}

const entityNoun: Record<AuditEntity, string> = { vehicle: "vehicle", customer: "customer", booking: "booking", maintenance: "service job", inspection: "", expense: "expense", company: "" };

function changedFields(before: Item, after: Item): AuditChange[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: AuditChange[] = [];
  for (const key of keys) {
    if (ignoredFields.has(key) || key === "id") continue;
    const a = JSON.stringify(before[key] ?? null);
    const b = JSON.stringify(after[key] ?? null);
    if (a === b) continue;
    const field = fieldLabels[key] ?? key;
    changes.push(opaqueFields.has(key) ? { field } : { field, from: display(key, before[key]), to: display(key, after[key]) });
  }
  return changes;
}

/** A specific phrase for the changes staff care about most, otherwise a generic "Updated …". */
function updateSummary(entity: AuditEntity, name: string, before: Item, after: Item, changes: AuditChange[]) {
  if (entity === "booking") {
    if (before.status !== after.status) {
      if (after.status === "Active") return `Started rental ${name}`;
      if (after.status === "Completed") return `Completed rental ${name}`;
      if (after.status === "Cancelled") return `Cancelled booking ${name}`;
    }
    if (before.paymentStatus !== after.paymentStatus) return after.paymentStatus === "Paid" ? `Marked ${name} paid` : `Marked ${name} unpaid`;
    if (before.depositStatus !== after.depositStatus && after.depositStatus === "Returned") return `Returned deposit for ${name}`;
  }
  if (entity === "maintenance" && before.status !== after.status) return after.status === "Completed" ? `Completed service ${name}` : `Started service ${name}`;
  if (entity === "vehicle" && before.status !== after.status) return `Marked ${name} ${String(after.status).toLowerCase()}`;
  const fields = changes.map((change) => change.field);
  return `Updated ${entityNoun[entity] ? `${entityNoun[entity]} ` : ""}${name}${fields.length ? ` (${fields.slice(0, 4).join(", ")}${fields.length > 4 ? "…" : ""})` : ""}`;
}

export function diffWorkspace(before: Doc, after: Doc): AuditEntry[] {
  const entries: AuditEntry[] = [];
  for (const { key, entity } of collections) {
    const oldItems = new Map((Array.isArray(before[key]) ? before[key] as Item[] : []).filter((item) => typeof item?.id === "string").map((item) => [item.id as string, item]));
    const newItems = new Map((Array.isArray(after[key]) ? after[key] as Item[] : []).filter((item) => typeof item?.id === "string").map((item) => [item.id as string, item]));
    for (const [id, item] of newItems) {
      const previous = oldItems.get(id);
      const name = label(entity, item, after);
      if (!previous) {
        const noun = entityNoun[entity];
        entries.push({ entity, entityId: id, action: "created", summary: entity === "inspection" ? `Recorded ${name}` : entity === "booking" ? `Created booking ${name}` : `Added ${noun ? `${noun} ` : ""}${name}`, changes: [] });
        continue;
      }
      const changes = changedFields(previous, item);
      if (changes.length) entries.push({ entity, entityId: id, action: "updated", summary: updateSummary(entity, name, previous, item, changes), changes });
    }
    for (const [id, item] of oldItems) {
      if (!newItems.has(id)) entries.push({ entity, entityId: id, action: "deleted", summary: `Deleted ${entityNoun[entity] ? `${entityNoun[entity]} ` : ""}${label(entity, item, before)}`, changes: [] });
    }
  }
  const companyChanges = changedFields((before.company ?? {}) as Item, (after.company ?? {}) as Item);
  if (companyChanges.length) entries.push({ entity: "company", entityId: "company", action: "updated", summary: `Updated company settings (${companyChanges.map((change) => change.field).slice(0, 4).join(", ")})`, changes: companyChanges });
  return entries;
}
