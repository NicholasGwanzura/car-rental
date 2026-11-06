"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AppShell, PageTopbar } from "@/components/app-shell";
import { BillingWorkspace } from "@/components/billing-workspace";
import { CompanySettingsWorkspace } from "@/components/company-settings-workspace";
import { InspectionWorkspace } from "@/components/inspection-workspace";
import { ClientSignature, InspectionChecklistFields, inspectionChecklistItems } from "@/components/inspection-inputs";
import { InspectionPhotoField, countDamageMarks } from "@/components/inspection-photos";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { compressIdentityImage } from "@/lib/identity-image";
import { exportRentalContract } from "@/lib/rental-contract";
import { formatMoney, nightsBetween, useRentalData, type Booking, type Customer, type InspectionChecklist, type InspectionPhoto, type Vehicle } from "@/lib/rental-data";

const pageCopy: Record<string, { title: string; summary: string; action?: string }> = {
  bookings: { title: "Bookings", summary: "Plan pickups, manage active rentals, and keep every reservation moving.", action: "New booking" },
  fleet: { title: "Fleet", summary: "Keep vehicle details, rates, and readiness up to date.", action: "Add vehicle" },
  customers: { title: "Customers", summary: "Keep renter contact and licence details ready for their next trip.", action: "Add customer" },
  maintenance: { title: "Maintenance", summary: "Schedule service and keep vehicles safe and road-ready.", action: "Schedule service" },
  reports: { title: "Reports", summary: "A clear view of bookings, revenue, and how your fleet is being used." },
  billing: { title: "Billing", summary: "Review rental charges, record payment status, and prepare customer invoices." },
  settings: { title: "Company settings", summary: "Manage business details that appear on customer invoices." },
  inspections: { title: "Inspections", summary: "Record vehicle condition before a rental and keep photos with the customer and vehicle." },
  team: { title: "Team access", summary: "Invite managers and sales staff, and see who can access Classic Rides." },
};

function dateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** A week from today, for new maintenance jobs. */
function defaultServiceDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return dateInputValue(date);
}

function dayAfter(value: string) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + 1);
  return dateInputValue(date);
}

function dateLabel(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Harare" }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function vehicleName(vehicle?: Vehicle) { return vehicle ? `${vehicle.make} ${vehicle.model}` : "Vehicle removed"; }
function customerName(customer?: Customer) { return customer?.name ?? "Customer removed"; }
function slug(value: string) { return value.toLowerCase().replaceAll(" ", "-"); }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <WorkspaceDialog title={title} onClose={onClose}>{children}</WorkspaceDialog>;
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`form-field${wide ? " form-field-wide" : ""}`}><span>{label}</span>{children}</label>;
}

function DialogActions({ onCancel, submit = "Save" }: { onCancel: () => void; submit?: string }) {
  return <div className="form-actions"><button className="button button-quiet" type="button" onClick={onCancel}>Cancel</button><button className="button button-primary" type="submit">{submit}</button></div>;
}

function EmptyState({ icon = "＋", title, detail, action }: { icon?: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="data-empty"><span className="data-empty-icon" aria-hidden="true">{icon}</span><h2>{title}</h2><p>{detail}</p>{action}</div>;
}

function TableFrame({ children }: { children: ReactNode }) { return <div className="data-table-wrap"><table className="data-table">{children}</table></div>; }

function isOpenBooking(booking: Booking) { return booking.status === "Confirmed" || booking.status === "Active"; }

/** Confirmation for permanent deletes. When `blocked` is set, the delete is explained but not offered. */
function ConfirmDeleteDialog({ title, description, blocked, confirmLabel, onConfirm, onClose }: { title: string; description: ReactNode; blocked?: string; confirmLabel: string; onConfirm: () => void; onClose: () => void }) {
  return <WorkspaceDialog title={title} eyebrow="PERMANENT DELETE" onClose={onClose}>
    <p className="modal-description">{blocked ?? description}</p>
    <div className="form-actions"><button className="button button-quiet" type="button" data-dialog-initial-focus onClick={onClose}>{blocked ? "Close" : "Keep it"}</button>{!blocked && <button className="button button-danger" type="button" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>}</div>
  </WorkspaceDialog>;
}

function useContractExport() {
  const { bookings, customers, vehicles, inspections, company } = useRentalData();
  const pickupFor = (bookingId: string) => inspections.filter((item) => item.bookingId === bookingId && item.stage === "Pickup").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return {
    pickupFor,
    exportContract: (bookingId: string) => {
      const booking = bookings.find((item) => item.id === bookingId);
      if (!booking) return;
      exportRentalContract({ booking, company, pickup: pickupFor(bookingId), customer: customers.find((item) => item.id === booking.customerId), vehicle: vehicles.find((item) => item.id === booking.vehicleId) });
    },
  };
}

function FleetWorkspace() {
  const { vehicles, bookings, addVehicle, updateVehicle, deleteVehicle, canDelete, ready } = useRentalData();
  const [open, setOpen] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [query, setQuery] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [vehicleError, setVehicleError] = useState("");
  const [savingVehicle, setSavingVehicle] = useState(false);
  const filtered = vehicles.filter((vehicle) => `${vehicle.registration} ${vehicle.make} ${vehicle.model}`.toLowerCase().includes(query.toLowerCase()));
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setVehicleError(""); setSavingVehicle(true);
    const form = new FormData(event.currentTarget);
    try {
      const file = form.get("image");
      let imageDataUrl = form.get("removeImage") === "on" ? undefined : editingVehicle?.imageDataUrl;
      if (file instanceof File && file.size) {
        if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) throw new Error("Choose an image under 10 MB.");
        imageDataUrl = await compressIdentityImage(file);
      }
      const changes = { registration: String(form.get("registration")).trim().toUpperCase(), make: String(form.get("make")).trim(), model: String(form.get("model")).trim(), year: Number(form.get("year")), dailyRate: Number(form.get("dailyRate")), vehicleType: String(form.get("vehicleType")) as Vehicle["vehicleType"], depositAmount: Number(form.get("depositAmount")), mileageAllowanceKmPerDay: Number(form.get("mileageAllowanceKmPerDay")), excessMileageRatePerKm: Number(form.get("excessMileageRatePerKm")), transmission: String(form.get("transmission")), fuelConsumptionLPer100Km: String(form.get("fuelConsumptionLPer100Km") ?? "").trim() ? Number(form.get("fuelConsumptionLPer100Km")) : undefined, status: String(form.get("status")) as Vehicle["status"], imageDataUrl };
      if (editingVehicle) updateVehicle(editingVehicle.id, changes);
      else addVehicle(changes);
      setOpen(false); setEditingVehicle(null); setSavedMessage(editingVehicle ? "Vehicle details updated." : "Vehicle added to your fleet."); window.setTimeout(() => setSavedMessage(""), 3000);
    } catch (reason) { setVehicleError(reason instanceof Error ? reason.message : "Could not save the vehicle image."); }
    finally { setSavingVehicle(false); }
  }
  function closeVehicleDialog() { setOpen(false); setEditingVehicle(null); }
  async function copyShareLink(vehicleId: string) {
    const url = `https://classicrides.online/rent/${encodeURIComponent(vehicleId)}`;
    try { await navigator.clipboard.writeText(url); setCopiedId(vehicleId); window.setTimeout(() => setCopiedId(""), 2500); }
    catch { window.prompt("Copy this public vehicle link", url); }
  }
  if (!ready) return <LoadingState />;
  return <>
    {savedMessage && <div className="inline-notice" role="status">{savedMessage}</div>}
    <div className="list-toolbar"><label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search registration or model" aria-label="Search fleet" /></label><span className="result-count">{vehicles.length} {vehicles.length === 1 ? "vehicle" : "vehicles"}</span></div>
    {vehicles.length === 0 ? <EmptyState icon="▰" title="Your fleet starts here" detail="Add a vehicle to set its type, day rate, and required deposit." action={<button className="button button-primary" onClick={() => { setEditingVehicle(null); setOpen(true); }}>＋ Add your first vehicle</button>} /> : filtered.length === 0 ? <EmptyState icon="⌕" title="No matches" detail="Try a different registration, make, or model." /> : <TableFrame><thead><tr><th>VEHICLE</th><th>TYPE</th><th>REGISTRATION</th><th>DAY RATE</th><th>DEPOSIT</th><th>EXCESS RATE</th><th>STATUS</th><th>BOOKINGS</th><th>ACTIONS</th></tr></thead><tbody>{filtered.map((vehicle) => {
      const activeBookings = bookings.filter((booking) => booking.vehicleId === vehicle.id && ["Confirmed", "Active"].includes(booking.status)).length;
      return <tr key={vehicle.id}><td data-label="Vehicle"><div className="fleet-vehicle-identity">{vehicle.imageDataUrl && <Image className="fleet-vehicle-thumb" src={vehicle.imageDataUrl} alt="" width={64} height={48} unoptimized />}<div><div className="table-primary">{vehicle.make} {vehicle.model}</div><div className="table-secondary">{vehicle.year} · {vehicle.transmission} · {vehicle.mileageAllowanceKmPerDay} km/day{vehicle.fuelConsumptionLPer100Km ? ` · ${vehicle.fuelConsumptionLPer100Km} L/100 km` : ""}</div></div></div></td><td data-label="Type">{vehicle.vehicleType}</td><td data-label="Registration"><span className="registration-tag">{vehicle.registration}</span></td><td data-label="Day rate">{formatMoney(vehicle.dailyRate)} <span className="table-secondary">/ day</span></td><td data-label="Deposit">{vehicle.depositAmount > 0 ? formatMoney(vehicle.depositAmount) : <span className="table-secondary">Not set</span>}</td><td data-label="Excess rate">{formatMoney(vehicle.excessMileageRatePerKm)} / km</td><td data-label="Status"><span className={`status-pill status-${slug(vehicle.status)}`}>{vehicle.status}</span></td><td data-label="Bookings">{activeBookings}</td><td data-label="Actions"><div className="row-actions"><button className="text-action" type="button" onClick={() => { setEditingVehicle(vehicle); setOpen(true); }}>Edit</button><button className="text-action" type="button" onClick={() => void copyShareLink(vehicle.id)} title="Copy the public pre-booking link">{copiedId === vehicle.id ? "Link copied" : "Share link"}</button>{canDelete && <button className="text-action text-action-danger" type="button" onClick={() => setDeletingVehicle(vehicle)}>Delete</button>}</div></td></tr>;
    })}</tbody></TableFrame>}
    <PublicPrebookingInbox vehicles={vehicles} />
    {deletingVehicle && <ConfirmDeleteDialog title={`Delete ${deletingVehicle.make} ${deletingVehicle.model}?`} confirmLabel="Delete vehicle" onClose={() => setDeletingVehicle(null)}
      blocked={bookings.some((booking) => booking.vehicleId === deletingVehicle.id && isOpenBooking(booking)) ? `${deletingVehicle.registration} has a confirmed or active booking. Complete, cancel, or delete that booking before deleting the vehicle.` : undefined}
      description={<>{deletingVehicle.registration} and its maintenance jobs will be removed. Past bookings and inspections stay in your records and show the vehicle as removed. This can’t be undone.</>}
      onConfirm={() => { deleteVehicle(deletingVehicle.id); setSavedMessage("Vehicle deleted."); window.setTimeout(() => setSavedMessage(""), 3000); }} />}
    {open && <Modal title={editingVehicle ? "Edit vehicle" : "Add a vehicle"} onClose={closeVehicleDialog}><form className="form-grid" onSubmit={save}>
      <Field label="Registration"><input name="registration" placeholder="e.g. AAZ 1234" defaultValue={editingVehicle?.registration ?? ""} required maxLength={16} /></Field>
      <Field label="Make"><input name="make" placeholder="Toyota" defaultValue={editingVehicle?.make ?? ""} required /></Field>
      <Field label="Model"><input name="model" placeholder="Corolla Cross" defaultValue={editingVehicle?.model ?? ""} required /></Field>
      <Field label="Year"><input name="year" type="number" min="1980" max="2035" defaultValue={editingVehicle?.year ?? new Date().getFullYear()} required /></Field>
      <Field label="Vehicle type"><select name="vehicleType" defaultValue={editingVehicle?.vehicleType ?? "Budget"} required><option>Budget</option><option>Premium</option><option>SUV</option></select></Field>
      <Field label="Transmission"><select name="transmission" defaultValue={editingVehicle?.transmission ?? "Automatic"}><option>Automatic</option><option>Manual</option></select></Field>
      <Field label="Day rate (USD)"><input name="dailyRate" type="number" min="1" step="1" placeholder="65" defaultValue={editingVehicle?.dailyRate ?? ""} required /></Field>
      <Field label="Refundable deposit (USD)"><input name="depositAmount" type="number" min="0" step="1" placeholder="e.g. 100" defaultValue={editingVehicle?.depositAmount ?? ""} required /></Field>
      <Field label="Included mileage (km per day)"><input name="mileageAllowanceKmPerDay" type="number" min="0" step="1" placeholder="e.g. 200" defaultValue={editingVehicle?.mileageAllowanceKmPerDay ?? 0} required /></Field>
      <Field label="Excess mileage (USD per km)"><input name="excessMileageRatePerKm" type="number" min="0" step="0.01" placeholder="e.g. 0.25" defaultValue={editingVehicle?.excessMileageRatePerKm ?? 0} required /></Field>
      <Field label="Average fuel consumption (L/100 km)"><input name="fuelConsumptionLPer100Km" type="number" min="1" max="40" step="0.1" placeholder="e.g. 7.5" defaultValue={editingVehicle?.fuelConsumptionLPer100Km ?? ""} required /></Field>
      <Field label="Fleet status"><select name="status" defaultValue={editingVehicle?.status ?? "Available"}><option>Available</option><option>Unavailable</option></select></Field>
      <Field label="Vehicle photo" wide><input name="image" type="file" accept="image/*" capture="environment" /><small>Upload a clear photo. It will appear on the public pre-booking link.</small></Field>
      {editingVehicle?.imageDataUrl && <div className="form-field-wide fleet-image-current"><Image src={editingVehicle.imageDataUrl} alt={`${editingVehicle.make} ${editingVehicle.model}`} width={120} height={90} unoptimized /><label><input type="checkbox" name="removeImage" /> Remove current photo</label></div>}
      <p className="form-hint form-field-wide">Type, deposit, mileage allowance, and excess rate are copied to each new booking.</p>
      {vehicleError && <p className="form-error form-field-wide" role="alert">{vehicleError}</p>}
      <div className="form-field-wide"><div className="form-actions"><button className="button button-quiet" type="button" onClick={closeVehicleDialog}>Cancel</button><button className="button button-primary" type="submit" disabled={savingVehicle}>{savingVehicle ? "Saving…" : editingVehicle ? "Save changes" : "Add vehicle"}</button></div></div>
    </form></Modal>}
  </>;
}

function CustomerWorkspace() {
  const { customers, addCustomer, deleteCustomer, canDelete, bookings, ready } = useRentalData();
  const [open, setOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const [customerError, setCustomerError] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);
  const filtered = customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(query.toLowerCase()));
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCustomerError(""); setSavingCustomer(true); const form = new FormData(event.currentTarget);
    try {
      const idPhoto = form.get("idPhoto");
      if (!(idPhoto instanceof File) || !idPhoto.size) throw new Error("Capture or choose an ID image to continue.");
      addCustomer({ name: String(form.get("name")).trim(), phone: String(form.get("phone")).trim(), email: String(form.get("email")).trim(), licence: String(form.get("licence")).trim(), nextOfKinName: String(form.get("nextOfKinName")).trim(), nextOfKinPhone: String(form.get("nextOfKinPhone")).trim(), idNumber: String(form.get("idNumber")).trim(), address: String(form.get("address") ?? "").trim(), idPhotoDataUrl: await compressIdentityImage(idPhoto), idPhotoName: idPhoto.name }); setOpen(false);
    } catch (reason) { setCustomerError(reason instanceof Error ? reason.message : "Could not save this customer."); }
    finally { setSavingCustomer(false); }
  }
  if (!ready) return <LoadingState />;
  return <>
    <div className="list-toolbar"><label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers" aria-label="Search customers" /></label><span className="result-count">{customers.length} {customers.length === 1 ? "customer" : "customers"}</span></div>
    {customers.length === 0 ? <EmptyState icon="♙" title="No customers yet" detail="Save renter contact details once, then select them when you create a booking." action={<button className="button button-primary" onClick={() => setOpen(true)}>＋ Add a customer</button>} /> : filtered.length === 0 ? <EmptyState icon="⌕" title="No matches" detail="Try a different name, phone, or email." /> : <TableFrame><thead><tr><th>CUSTOMER</th><th>PHONE</th><th>DRIVER LICENCE</th><th>NEXT OF KIN</th><th>ID CAPTURE</th><th>BOOKINGS</th><th>ADDED</th>{canDelete && <th>ACTIONS</th>}</tr></thead><tbody>{filtered.map((customer) => <tr key={customer.id}><td data-label="Customer"><div className="table-primary">{customer.name}</div><div className="table-secondary">{customer.email || "No email added"}</div></td><td data-label="Phone">{customer.phone}</td><td data-label="Driver licence">{customer.licence || <span className="table-secondary">Not recorded</span>}<div className="table-secondary">ID {customer.idNumber || "not recorded"}</div></td><td data-label="Next of kin">{customer.nextOfKinName || "Not recorded"}<div className="table-secondary">{customer.nextOfKinPhone || ""}</div></td><td data-label="ID capture">{customer.idPhotoDataUrl ? "Captured" : "Missing"}</td><td data-label="Bookings">{bookings.filter((booking) => booking.customerId === customer.id).length}</td><td data-label="Added">{dateLabel(customer.createdAt.slice(0, 10))}</td>{canDelete && <td data-label="Actions"><div className="row-actions"><button className="text-action text-action-danger" type="button" onClick={() => setDeletingCustomer(customer)}>Delete</button></div></td>}</tr>)}</tbody></TableFrame>}
    {deletingCustomer && <ConfirmDeleteDialog title={`Delete ${deletingCustomer.name}?`} confirmLabel="Delete customer" onClose={() => setDeletingCustomer(null)}
      blocked={bookings.some((booking) => booking.customerId === deletingCustomer.id && isOpenBooking(booking)) ? `${deletingCustomer.name} has a confirmed or active booking. Complete, cancel, or delete that booking before deleting the customer.` : undefined}
      description={<>{deletingCustomer.name}’s contact details and ID photo will be removed. Past bookings and inspections stay in your records and show the customer as removed. This can’t be undone.</>}
      onConfirm={() => deleteCustomer(deletingCustomer.id)} />}
    {open && <Modal title="Add a customer" onClose={() => setOpen(false)}><form className="form-grid" onSubmit={save}>
      <Field label="Full name" wide><input name="name" placeholder="Customer name" autoComplete="name" required /></Field>
      <Field label="Phone"><input name="phone" type="tel" placeholder="+263 77 000 0000" autoComplete="tel" required /></Field>
      <Field label="Email"><input name="email" type="email" placeholder="name@example.com" autoComplete="email" required /></Field>
      <Field label="Driver licence number"><input name="licence" placeholder="Licence number" required /></Field>
      <Field label="ID number"><input name="idNumber" placeholder="National ID or passport" required /></Field>
      <Field label="Residential address" wide><input name="address" placeholder="House number, street, suburb, city" autoComplete="street-address" required /></Field>
    <Field label="Next of kin full name"><input name="nextOfKinName" placeholder="Full name" required /></Field>
      <Field label="Next of kin phone"><input name="nextOfKinPhone" type="tel" placeholder="+263 77 000 0000" required /></Field>
      <Field label="Customer ID photo" wide><input name="idPhoto" type="file" accept="image/*" capture="environment" required /><small>Capture or choose a clear photo of the customer’s ID. The image is compressed before secure workspace storage.</small></Field>
      {customerError && <p className="form-error form-field-wide" role="alert">{customerError}</p>}
      <div className="form-field-wide"><div className="form-actions"><button className="button button-quiet" type="button" onClick={() => setOpen(false)}>Cancel</button><button className="button button-primary" type="submit" disabled={savingCustomer}>{savingCustomer ? "Saving…" : "Save customer"}</button></div></div>
    </form></Modal>}
  </>;
}

function BookingLifecycleDialog({ booking, action, onClose, onStarted }: { booking: Booking; action: "checkout" | "return"; onClose: () => void; onStarted?: (bookingId: string) => void }) {
  const { customers, vehicles, addInspection, updateBooking } = useRentalData();
  const isCheckout = action === "checkout";
  const customer = customers.find((item) => item.id === booking.customerId);
  const vehicle = vehicles.find((item) => item.id === booking.vehicleId);
  const [checklist, setChecklist] = useState<InspectionChecklist>({});
  const [signature, setSignature] = useState("");
  const [signatoryName, setSignatoryName] = useState(customer?.name ?? "");
  const [error, setError] = useState("");
  const [odometerText, setOdometerText] = useState("");
  const [photos, setPhotos] = useState<InspectionPhoto[]>([]);
  const rentalDays = nightsBetween(booking.startDate, booking.endDate);
  const distanceKm = !isCheckout && odometerText !== "" ? Math.max(0, Number(odometerText) - (booking.checkoutOdometer ?? 0)) : 0;
  const includedKm = (booking.mileageAllowanceKmPerDay ?? vehicle?.mileageAllowanceKmPerDay ?? 0) * rentalDays;
  const excessKm = Math.max(0, distanceKm - includedKm);
  const mileageRate = booking.excessMileageRatePerKm ?? vehicle?.excessMileageRatePerKm ?? 0;
  const excessCharge = excessKm * mileageRate;
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (inspectionChecklistItems.some((item) => !checklist[item.key])) { setError("Complete every checklist item before continuing."); return; }
    if (!photos.length) { setError(`Add photo evidence of the vehicle at ${isCheckout ? "pickup" : "return"} before continuing.`); return; }
    if (!signature) { setError("Capture the client signature before continuing."); return; }
    const form = new FormData(event.currentTarget);
    const odometer = Number(form.get("odometer"));
    const fuel = Number(form.get("fuel"));
    const note = String(form.get("note")).trim();
    if (!isCheckout && odometer < (booking.checkoutOdometer ?? 0)) { setError("Return odometer must be at least the pickup reading."); return; }
    const depositAmount = booking.depositAmount ?? vehicle?.depositAmount ?? 0;
    if (isCheckout && depositAmount > 0 && form.get("depositReceived") !== "on") { setError(`Confirm collection of the ${formatMoney(depositAmount)} vehicle deposit to start this rental.`); return; }
    const condition = Object.values(checklist).includes("attention") ? "Needs attention" : countDamageMarks(photos) ? "Fair" : "Good";
    const cleanPhotos = photos.map((photo) => ({ ...photo, marks: (photo.marks ?? []).map((mark) => ({ ...mark, note: mark.note?.trim() || undefined })) }));
    const now = new Date();
    addInspection({ customerId: booking.customerId, vehicleId: booking.vehicleId, bookingId: booking.id, stage: isCheckout ? "Pickup" : "Return", inspectionDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`, odometerKm: odometer, fuelPercent: fuel, condition, notes: note, checklist, signatoryName: signatoryName.trim(), signatureDataUrl: signature, signedAt: now.toISOString(), photos: cleanPhotos });
    updateBooking(booking.id, isCheckout
      ? { status: "Active", checkoutOdometer: odometer, checkoutFuel: fuel, checkoutNote: note, depositStatus: depositAmount > 0 ? "Held" : "None" }
      : { status: "Completed", returnOdometer: odometer, returnFuel: fuel, returnNote: note, distanceKm, includedMileageKm: includedKm, excessMileageKm: excessKm, excessMileageCharge: excessCharge });
    onClose();
    if (isCheckout) onStarted?.(booking.id);
  }
  return <Modal title={isCheckout ? "Vehicle handover" : "Return inspection"} onClose={onClose}>
    <p className="modal-description">{isCheckout ? "Record the pickup readings, inspect the vehicle and collect the client’s signature." : "Complete the return inspection and client sign-off to mark this booking complete."}</p>
    <form className="form-grid" onSubmit={save}>
      <Field label="Odometer (km)"><input name="odometer" type="number" min={isCheckout ? 0 : booking.checkoutOdometer ?? 0} placeholder="e.g. 48,250" value={isCheckout ? undefined : odometerText} onChange={(event) => !isCheckout && setOdometerText(event.target.value)} defaultValue={isCheckout ? undefined : undefined} required /></Field>
      <Field label="Fuel level"><select name="fuel" defaultValue={isCheckout ? "100" : String(booking.checkoutFuel ?? 100)}><option value="100">Full</option><option value="75">¾ tank</option><option value="50">½ tank</option><option value="25">¼ tank</option><option value="0">Empty</option></select></Field>
      <Field label={`${isCheckout ? "Pickup" : "Return"} note (optional)`} wide><textarea name="note" rows={2} defaultValue={isCheckout ? booking.checkoutNote : booking.returnNote} placeholder="Note existing marks or customer comments" /></Field>
      {isCheckout && (booking.depositAmount ?? vehicle?.depositAmount ?? 0) > 0 && <label className="deposit-confirmation form-field-wide"><input type="checkbox" name="depositReceived" required /><span>Confirm the {formatMoney(booking.depositAmount ?? vehicle?.depositAmount ?? 0)} vehicle deposit has been collected.</span></label>}
      {!isCheckout && <div className="mileage-settlement form-field-wide" aria-live="polite"><div><span>Distance travelled</span><strong>{distanceKm.toLocaleString()} km</strong></div><div><span>Included · {rentalDays} {rentalDays === 1 ? "day" : "days"}</span><strong>{includedKm.toLocaleString()} km</strong></div><div><span>Excess mileage</span><strong>{excessKm.toLocaleString()} km × {formatMoney(mileageRate)}/km</strong></div><div className="mileage-fee"><span>Excess mileage charge</span><strong>{formatMoney(excessCharge)}</strong></div></div>}
      <InspectionChecklistFields value={checklist} onChange={setChecklist} />
      <InspectionPhotoField photos={photos} onChange={setPhotos} required label={isCheckout ? "Pickup photo evidence" : "Return photo evidence"} />
      <ClientSignature name={signatoryName} onNameChange={setSignatoryName} signature={signature} onSignatureChange={setSignature} initialName={customer?.name ?? ""} />
      {isCheckout && <p className="form-hint form-field-wide">The client’s signature is added to the rental contract, which you can export as soon as the handover is saved.</p>}
      {error && <p className="form-error form-field-wide" role="alert">{error}</p>}
      <div className="form-field-wide"><DialogActions onCancel={onClose} submit={isCheckout ? "Save handover & start" : "Save inspection & complete"} /></div>
    </form>
  </Modal>;
}

function BookingPriceSummary({ vehicle, startDate, endDate }: { vehicle?: Vehicle; startDate: string; endDate: string }) {
  if (!vehicle) return <div className="booking-price-summary" role="status">Choose a vehicle to see the estimated rental total.</div>;
  if (!startDate || !endDate || endDate <= startDate) return <div className="booking-price-summary" role="status">Choose a return date after pickup to see the total.</div>;
  const days = nightsBetween(startDate, endDate);
  return <div className="booking-price-summary" role="status" aria-live="polite">
    <span>RENTAL CHARGE</span>
    <strong>{formatMoney(vehicle.dailyRate * days)}</strong>
    <small>{days} {days === 1 ? "day" : "days"} × {formatMoney(vehicle.dailyRate)} per day · {vehicle.vehicleType}</small>
    <span className="booking-deposit-label">Deposit required at pickup <strong>{formatMoney(vehicle.depositAmount)}</strong></span>
  </div>;
}

type PrebookingRequestView = { id: string; vehicleId: string; customerName: string; email: string; phone: string; driverLicence: string; startDate: string; endDate: string; message: string; status: "New" | "Contacted" | "Accepted" | "Declined"; createdAt: string };

function PublicPrebookingInbox({ vehicles }: { vehicles: Vehicle[] }) {
  const [requests, setRequests] = useState<PrebookingRequestView[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    async function loadRequests() {
      try {
        const response = await fetch("/api/prebooking-requests", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load pre-booking requests.");
        if (active) { setRequests(result.requests as PrebookingRequestView[]); setError(""); }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load pre-booking requests.");
      } finally { if (active) setLoading(false); }
    }
    void loadRequests();
    const refresh = window.setInterval(() => void loadRequests(), 15_000);
    return () => { active = false; window.clearInterval(refresh); };
  }, []);
  async function setStatus(id: string, status: PrebookingRequestView["status"]) {
    setError("");
    try {
      const response = await fetch("/api/prebooking-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update request.");
      setRequests((current) => current.map((item) => item.id === id ? result.request as PrebookingRequestView : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update request."); }
  }
  return <section className="panel public-requests-panel"><div className="panel-heading"><div><p className="eyebrow">CUSTOMER ENQUIRIES</p><h2>Public pre-booking requests</h2></div><span className="result-count">{requests.filter((request) => request.status === "New").length} new</span></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading ? <p className="public-requests-empty">Loading requests…</p> : !requests.length && !error ? <p className="public-requests-empty">Vehicle requests submitted through shared links will appear here.</p> : <div className="public-request-list">{requests.map((request) => {
      const vehicle = vehicles.find((item) => item.id === request.vehicleId);
      return <article className="public-request-card" key={request.id}><div className="public-request-heading"><div><strong>{request.customerName}</strong><small>{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Vehicle"} · {dateLabel(request.startDate)} to {dateLabel(request.endDate)}</small></div><span className={`status-pill status-${slug(request.status)}`}>{request.status}</span></div><div className="public-request-contact"><a href={`mailto:${encodeURIComponent(request.email)}`}>{request.email}</a><a href={`tel:${request.phone.replaceAll(" ", "")}`}>{request.phone}</a><span>Licence: {request.driverLicence}</span></div>{request.message && <p>{request.message}</p>}<div className="public-request-actions"><a className="text-action" href={`https://classicrides.online/rent/${encodeURIComponent(request.vehicleId)}`} target="_blank" rel="noreferrer">Open shared listing</a><select aria-label={`Update status for ${request.customerName}`} value={request.status} onChange={(event) => void setStatus(request.id, event.target.value as PrebookingRequestView["status"])}><option>New</option><option>Contacted</option><option>Accepted</option><option>Declined</option></select></div></article>;
    })}</div>}
  </section>;
}

function BookingsWorkspace() {
  const { bookings, customers, vehicles, updateBooking, deleteBooking, canDelete, ready } = useRentalData();
  const { pickupFor, exportContract } = useContractExport();
  const [open, setOpen] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState<Booking | null>(null);
  const [startedBookingId, setStartedBookingId] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All bookings");
  const [flow, setFlow] = useState<{ booking: Booking; action: "checkout" | "return" } | null>(null);
  const [cancelPending, setCancelPending] = useState<Booking | null>(null);
  const filtered = bookings.filter((booking) => {
    const search = `${booking.reference} ${customerName(customers.find((c) => c.id === booking.customerId))} ${vehicleName(vehicles.find((v) => v.id === booking.vehicleId))}`.toLowerCase();
    return (filter === "All bookings" || booking.status === filter) && search.includes(query.toLowerCase());
  });
  if (!ready) return <LoadingState />;
  return <>
    <div className="list-toolbar booking-toolbar"><label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bookings" aria-label="Search bookings" /></label><select className="filter-select" aria-label="Filter booking status" value={filter} onChange={(event) => setFilter(event.target.value)}><option>All bookings</option><option>Confirmed</option><option>Active</option><option>Completed</option><option>Cancelled</option></select><span className="result-count">{filtered.length} {filtered.length === 1 ? "booking" : "bookings"}</span></div>
    {bookings.length === 0 ? <EmptyState icon="▤" title="Your first booking is a few steps away" detail="Add a vehicle and a customer, then create a booking with pickup and return dates." action={<div className="empty-actions"><Link href="/fleet" className="button button-quiet">Add vehicle</Link><Link href="/customers" className="button button-quiet">Add customer</Link><button className="button button-primary" onClick={() => setOpen(true)}>＋ New booking</button></div>} /> : filtered.length === 0 ? <EmptyState icon="⌕" title="No bookings found" detail="Change the status filter or search by booking reference." /> : <TableFrame><thead><tr><th>BOOKING</th><th>CUSTOMER</th><th>VEHICLE</th><th>DATES</th><th>TOTAL</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{filtered.map((booking) => <tr key={booking.id}><td data-label="Booking"><span className="table-primary">{booking.reference}</span>{booking.checkoutOdometer !== undefined && <div className="table-secondary">Pickup: {booking.checkoutOdometer.toLocaleString()} km · {booking.checkoutFuel ?? 0}% fuel</div>}{booking.checkoutNote && <div className="table-secondary">Pickup note: {booking.checkoutNote}</div>}{booking.returnOdometer !== undefined && <div className="table-secondary">Return: {booking.returnOdometer.toLocaleString()} km · {booking.returnFuel ?? 0}% fuel</div>}{booking.returnNote && <div className="table-secondary">Return note: {booking.returnNote}</div>}{booking.distanceKm !== undefined && <div className="table-secondary">Distance: {booking.distanceKm.toLocaleString()} km · included {booking.includedMileageKm?.toLocaleString()} km</div>}{(booking.excessMileageCharge ?? 0) > 0 && <div className="table-secondary">Excess mileage: {formatMoney(booking.excessMileageCharge ?? 0)}</div>}{(booking.depositAmount ?? 0) > 0 && <div className="table-secondary">Deposit: {formatMoney(booking.depositAmount ?? 0)}</div>}</td><td data-label="Customer">{customerName(customers.find((item) => item.id === booking.customerId))}</td><td data-label="Vehicle">{vehicleName(vehicles.find((item) => item.id === booking.vehicleId))}</td><td data-label="Dates"><span>{dateLabel(booking.startDate)}</span><div className="table-secondary">to {dateLabel(booking.endDate)}</div></td><td data-label="Total">{formatMoney(booking.total + (booking.excessMileageCharge ?? 0))}</td><td data-label="Status"><span className={`status-pill status-${slug(booking.status)}`}>{booking.status}</span></td><td data-label="Action"><div className="row-actions">{booking.status === "Confirmed" && <button className="text-action" onClick={() => setFlow({ booking, action: "checkout" })}>Start rental</button>}{booking.status === "Active" && <button className="text-action" onClick={() => setFlow({ booking, action: "return" })}>Inspect & complete</button>}{booking.status !== "Confirmed" && pickupFor(booking.id) && <button className="text-action" onClick={() => exportContract(booking.id)}>Contract</button>}{booking.status === "Confirmed" && <button className="text-action text-action-muted" onClick={() => setCancelPending(booking)}>Cancel</button>}{canDelete && <button className="text-action text-action-danger" onClick={() => setDeletingBooking(booking)}>Delete</button>}</div></td></tr>)}</tbody></TableFrame>}
    <PublicPrebookingInbox vehicles={vehicles} />
    {open && <BookingsCreateOnly onClose={() => setOpen(false)} />}
    {flow && <BookingLifecycleDialog booking={flow.booking} action={flow.action} onClose={() => setFlow(null)} onStarted={setStartedBookingId} />}
    {startedBookingId && <WorkspaceDialog title="Rental started" eyebrow="RENTAL CONTRACT" onClose={() => setStartedBookingId("")}><p className="modal-description">The handover is saved and booking {bookings.find((item) => item.id === startedBookingId)?.reference} is now active. Export the rental contract with the client’s signature, then save it as a PDF or print it. You can export it again later from the booking’s Contract action.</p><div className="form-actions"><button className="button button-quiet" type="button" onClick={() => setStartedBookingId("")}>Later</button><button className="button button-primary" type="button" data-dialog-initial-focus onClick={() => { exportContract(startedBookingId); setStartedBookingId(""); }}>Export contract</button></div></WorkspaceDialog>}
    {deletingBooking && <ConfirmDeleteDialog title={`Delete booking ${deletingBooking.reference}?`} confirmLabel="Delete booking" onClose={() => setDeletingBooking(null)}
      description={<>{deletingBooking.status === "Active" ? "This rental is still active. " : ""}The booking and its billing record will be removed permanently. Its inspections stay with the customer and vehicle. This can’t be undone.</>}
      onConfirm={() => deleteBooking(deletingBooking.id)} />}
    {cancelPending && <WorkspaceDialog title="Cancel this booking?" eyebrow="BOOKING CHANGE" onClose={() => setCancelPending(null)}><p className="modal-description">Booking {cancelPending.reference} will be marked cancelled and removed from outstanding payment totals. The record will remain available for reference.</p><div className="form-actions"><button className="button button-quiet" type="button" data-dialog-initial-focus onClick={() => setCancelPending(null)}>Keep booking</button><button className="button button-danger" type="button" onClick={() => { updateBooking(cancelPending.id, { status: "Cancelled" }); setCancelPending(null); }}>Cancel booking</button></div></WorkspaceDialog>}
  </>;
}

function MaintenanceWorkspace() {
  const { vehicles, maintenance, addMaintenance, updateMaintenance, ready } = useRentalData();
  const [open, setOpen] = useState(false);
  const activeJobs = maintenance.filter((job) => job.status !== "Completed");
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    addMaintenance({ vehicleId: String(form.get("vehicleId")), title: String(form.get("title")).trim(), dueDate: String(form.get("dueDate")), cost: Number(form.get("cost") || 0), status: "Scheduled", note: String(form.get("note")).trim() }); setOpen(false);
  }
  if (!ready) return <LoadingState />;
  return <>
    <div className="maintenance-summary"><div><span className="eyebrow">OPEN WORK</span><strong>{activeJobs.length}</strong><small>jobs still to complete</small></div><div><span className="eyebrow">FLEET AVAILABLE</span><strong>{vehicles.length}</strong><small>vehicles tracked</small></div><div><span className="eyebrow">COMPLETED</span><strong>{maintenance.length - activeJobs.length}</strong><small>jobs closed</small></div></div>
    {maintenance.length === 0 ? <EmptyState icon="⚙" title="No service jobs scheduled" detail="Record upcoming maintenance to keep each vehicle road-ready." action={<button className="button button-primary" onClick={() => setOpen(true)}>＋ Schedule service</button>} /> : <TableFrame><thead><tr><th>SERVICE</th><th>VEHICLE</th><th>DUE DATE</th><th>ESTIMATED COST</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{maintenance.map((job) => <tr key={job.id}><td data-label="Service"><span className="table-primary">{job.title}</span>{job.note && <div className="table-secondary">{job.note}</div>}</td><td data-label="Vehicle">{vehicleName(vehicles.find((item) => item.id === job.vehicleId))}</td><td data-label="Due date">{dateLabel(job.dueDate)}</td><td data-label="Estimated cost">{job.cost ? formatMoney(job.cost) : "—"}</td><td data-label="Status"><span className={`status-pill status-${slug(job.status)}`}>{job.status}</span></td><td data-label="Action">{job.status !== "Completed" && <button className="text-action" onClick={() => updateMaintenance(job.id, { status: job.status === "Scheduled" ? "In progress" : "Completed" })}>{job.status === "Scheduled" ? "Start job" : "Mark complete"}</button>}</td></tr>)}</tbody></TableFrame>}
    {open && <Modal title="Schedule maintenance" onClose={() => setOpen(false)}>{vehicles.length === 0 ? <div className="setup-needed"><p>Add a vehicle before scheduling service.</p><Link className="button button-primary" href="/fleet">Go to fleet</Link></div> : <form className="form-grid" onSubmit={save}>
      <Field label="Vehicle" wide><select name="vehicleId" required defaultValue="">{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration} · {vehicle.make} {vehicle.model}</option>)}</select></Field>
      <Field label="Service"><input name="title" placeholder="Oil change" required /></Field>
      <Field label="Due date"><input name="dueDate" type="date" defaultValue={defaultServiceDate()} required /></Field>
      <Field label="Estimated cost (USD)"><input name="cost" type="number" min="0" step="1" placeholder="0" /></Field>
      <Field label="Note (optional)" wide><textarea name="note" rows={2} placeholder="Workshop or work details" /></Field>
      <div className="form-field-wide"><DialogActions onCancel={() => setOpen(false)} submit="Schedule job" /></div>
    </form>}</Modal>}
  </>;
}

function ReportsWorkspace() {
  const { bookings, customers, vehicles, maintenance, ready } = useRentalData();
  if (!ready) return <LoadingState />;
  const completed = bookings.filter((booking) => booking.status === "Completed");
  const revenue = completed.reduce((sum, booking) => sum + booking.total + (booking.excessMileageCharge ?? 0), 0);
  const openJobs = maintenance.filter((job) => job.status !== "Completed").length;
  const committedVehicleCount = new Set(bookings.filter((booking) => ["Active", "Confirmed"].includes(booking.status)).map((booking) => booking.vehicleId)).size;
  const fleetCommitment = vehicles.length ? Math.round((committedVehicleCount / vehicles.length) * 100) : 0;
  function downloadCsv() {
    const rows = [["Reference", "Customer", "Vehicle", "Pickup", "Return", "Distance km", "Excess mileage charge USD", "Status", "Total USD"], ...bookings.map((booking) => [booking.reference, customerName(customers.find((item) => item.id === booking.customerId)), vehicleName(vehicles.find((item) => item.id === booking.vehicleId)), booking.startDate, booking.endDate, booking.distanceKm === undefined ? "" : String(booking.distanceKm), String(booking.excessMileageCharge ?? 0), booking.status, String(booking.total + (booking.excessMileageCharge ?? 0))])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "classic-rides-bookings.csv"; link.click(); URL.revokeObjectURL(url);
  }
  return <>
    <div className="report-actions"><p>Live totals from records in this workspace.</p><button className="button button-quiet" onClick={downloadCsv} disabled={bookings.length === 0}>↓ Export bookings CSV</button></div>
    <section className="report-grid"><article className="report-card"><span className="eyebrow">COMPLETED RENTALS</span><strong>{completed.length}</strong><small>closed bookings</small></article><article className="report-card"><span className="eyebrow">REVENUE RECORDED</span><strong>{formatMoney(revenue)}</strong><small>completed booking totals</small></article><article className="report-card"><span className="eyebrow">FLEET COMMITTED</span><strong>{fleetCommitment}%</strong><small>{committedVehicleCount} of {vehicles.length} vehicles with an active or upcoming booking</small><div className="report-progress"><i style={{ width: `${fleetCommitment}%` }} /></div></article><article className="report-card"><span className="eyebrow">OPEN MAINTENANCE</span><strong>{openJobs}</strong><small>jobs requiring attention</small></article></section>
    {bookings.length === 0 ? <EmptyState icon="▥" title="Your reports are ready" detail="Once your first booking is created, this view will summarize completed rentals, revenue, and fleet activity." action={<Link className="button button-primary" href="/bookings">Go to bookings</Link>} /> : <section className="panel report-table-panel"><div className="panel-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Latest bookings</h2></div><Link className="text-link" href="/bookings">All bookings →</Link></div><TableFrame><thead><tr><th>REFERENCE</th><th>CUSTOMER</th><th>VEHICLE</th><th>DATES</th><th>STATUS</th><th>TOTAL</th></tr></thead><tbody>{bookings.slice(0, 8).map((booking) => <tr key={booking.id}><td data-label="Reference"><span className="table-primary">{booking.reference}</span></td><td data-label="Customer">{customerName(customers.find((item) => item.id === booking.customerId))}</td><td data-label="Vehicle">{vehicleName(vehicles.find((item) => item.id === booking.vehicleId))}</td><td data-label="Dates">{dateLabel(booking.startDate)} – {dateLabel(booking.endDate)}</td><td data-label="Status"><span className={`status-pill status-${slug(booking.status)}`}>{booking.status}</span></td><td data-label="Total">{formatMoney(booking.total + (booking.excessMileageCharge ?? 0))}</td></tr>)}</tbody></TableFrame></section>}
  </>;
}

type TeamUserView = { id: string; email: string; name: string; role: string; active: boolean; createdAt: string };
type TeamInviteView = { id: string; email: string; role: string; expiresAt: string; createdAt: string };

function TeamWorkspace() {
  const { currentUser } = useRentalData();
  const [users, setUsers] = useState<TeamUserView[]>([]);
  const [invites, setInvites] = useState<TeamInviteView[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"manager" | "sales">("sales");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/team", { cache: "no-store" }).then(async (response) => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not load the team.");
      setUsers(data.users as TeamUserView[]); setInvites(data.invites as TeamInviteView[]);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load the team."));
  }, []);
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice(""); setInviteUrl("");
    try {
      const response = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Could not create invitation.");
      setInviteUrl(result.invitationUrl); setNotice(result.message); setEmail("");
      const list = await fetch("/api/team", { cache: "no-store" }).then((item) => item.json());
      if (list.users) { setUsers(list.users as TeamUserView[]); setInvites(list.invites as TeamInviteView[]); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create invitation."); }
    finally { setBusy(false); }
  }
  async function copyInvite() {
    try { await navigator.clipboard.writeText(inviteUrl); setNotice("Invitation link copied."); }
    catch { window.prompt("Copy this invitation link", inviteUrl); }
  }
  const mayInviteManager = currentUser?.role === "super_admin";
  return <div className="team-access-layout">
    <section className="panel team-invite-panel"><div className="panel-heading"><div><p className="eyebrow">INVITE STAFF</p><h2>Give your team access</h2></div></div><p className="team-access-help">Invite a manager or sales colleague. Invitations expire after seven days.</p>
      <form className="team-invite-form" onSubmit={invite}><label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@example.com" /></label><label>Role<select value={role} onChange={(event) => setRole(event.target.value as "manager" | "sales")}><option value="sales">Sales</option>{mayInviteManager && <option value="manager">Manager</option>}</select></label><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Creating…" : "Send invitation"}</button></form>
      {error && <p className="form-error team-notice" role="alert">{error}</p>}{notice && <p className="team-notice" role="status">{notice}</p>}{inviteUrl && <div className="invite-link-box"><input aria-label="Invitation link" readOnly value={inviteUrl} /><button type="button" className="button button-quiet" onClick={() => void copyInvite()}>Copy link</button></div>}
      {currentUser?.role === "manager" && <p className="form-hint">Managers can invite sales staff. Only the super admin can invite another manager or change company settings.</p>}
    </section>
    <section className="panel team-directory-panel"><div className="panel-heading"><div><p className="eyebrow">WORKSPACE MEMBERS</p><h2>People with access</h2></div><span className="result-count">{users.length} active</span></div>{users.length === 0 ? <p className="team-access-help">No workspace users yet.</p> : <div className="team-member-list">{users.map((user) => <article className="team-member-row" key={user.id}><span className="team-member-avatar">{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><span className="status-pill status-available">{user.role.replace("_", " ")}</span></article>)}</div>}
      {invites.length > 0 && <><p className="eyebrow team-pending-title">PENDING INVITATIONS</p><div className="team-member-list">{invites.map((invite) => <article className="team-member-row" key={invite.id}><span className="team-member-avatar team-invite-avatar">✉</span><div><strong>{invite.email}</strong><small>{invite.role} · expires {dateLabel(invite.expiresAt)}</small></div><span className="status-pill status-confirmed">Invited</span></article>)}</div></>}
    </section>
  </div>;
}

function LoadingState() { return <div className="loading-state"><span className="loading-spinner" />Loading workspace…</div>; }

export function ModuleWorkspace({ module }: { module: string }) {
  const page = pageCopy[module]; const [open, setOpen] = useState(false);
  if (module === "billing") return <BillingWorkspace />;
  if (module === "settings") return <CompanySettingsWorkspace />;
  if (module === "inspections") return <InspectionWorkspace />;
  if (!page) return <AppShell><PageTopbar title="Page not found" /><main className="module-wrap"><h1>Page not found</h1><Link href="/">Return to overview</Link></main></AppShell>;
  const Action = module === "reports" || module === "team" ? null : <button className="button button-primary page-action" onClick={() => setOpen(true)}><span aria-hidden="true">＋</span>{page.action}</button>;
  return <AppShell active={page.title}>
    <PageTopbar title={page.title} />
    <main className="module-wrap">
      <section className="module-page-heading"><div><p className="eyebrow">WORKSPACE</p><h1>{page.title}</h1><p className="module-summary">{page.summary}</p></div>{Action}</section>
      {module === "fleet" && <FleetWorkspace />}
      {module === "customers" && <CustomerWorkspace />}
      {module === "bookings" && <BookingsWorkspace key={open ? "booking-open" : "booking-closed"} />}
      {module === "maintenance" && <MaintenanceWorkspace />}
      {module === "reports" && <ReportsWorkspace />}
      {module === "team" && <TeamWorkspace />}
    </main>
    {open && module === "bookings" && <BookingModalBridge onClose={() => setOpen(false)} />}
    {open && module === "fleet" && <CreateVehicleBridge onClose={() => setOpen(false)} />}
    {open && module === "customers" && <CreateCustomerBridge onClose={() => setOpen(false)} />}
    {open && module === "maintenance" && <CreateMaintenanceBridge onClose={() => setOpen(false)} />}
  </AppShell>;
}

// Page-level actions open the same forms from the empty state and the toolbar.
function BookingModalBridge({ onClose }: { onClose: () => void }) { return <BookingsCreateOnly onClose={onClose} />; }
function BookingsCreateOnly({ onClose }: { onClose: () => void }) {
  const { customers, vehicles, bookings, addBooking } = useRentalData();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [startDate, setStartDate] = useState(() => dateInputValue(new Date(Date.now() + 86_400_000)));
  const [endDate, setEndDate] = useState(() => dateInputValue(new Date(Date.now() + 2 * 86_400_000)));
  const [note, setNote] = useState("");
  const today = dateInputValue(new Date());
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
  const selectedCustomer = customers.find((customer) => customer.id === customerId);

  function next() {
    setError("");
    if (step === 1 && (!selectedCustomer || !selectedVehicle)) { setError("Choose a customer and an available vehicle."); return; }
    if (step === 2) {
      if (!startDate || startDate < today || !endDate || endDate <= startDate) { setError("Choose valid pickup and return dates."); return; }
      if (bookings.some((booking) => booking.vehicleId === vehicleId && ["Confirmed", "Active"].includes(booking.status) && startDate < booking.endDate && endDate > booking.startDate)) { setError("This vehicle already has a booking for part of those dates."); return; }
    }
    setStep(step + 1);
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCustomer || !selectedVehicle || !startDate || !endDate || endDate <= startDate) { setError("Complete all booking details."); return; }
    if (bookings.some((booking) => booking.vehicleId === vehicleId && ["Confirmed", "Active"].includes(booking.status) && startDate < booking.endDate && endDate > booking.startDate)) { setStep(2); setError("This vehicle is no longer available for those dates."); return; }
    addBooking({ customerId, vehicleId, startDate, endDate, total: selectedVehicle.dailyRate * nightsBetween(startDate, endDate), depositAmount: selectedVehicle.depositAmount, mileageAllowanceKmPerDay: selectedVehicle.mileageAllowanceKmPerDay, excessMileageRatePerKm: selectedVehicle.excessMileageRatePerKm, note: note.trim() });
    onClose();
  }
  return <Modal title="Create a booking" onClose={onClose}>
    {customers.length === 0 || vehicles.length === 0 ? <div className="setup-needed"><p>Add a renter and an available vehicle before creating a booking.</p><div className="empty-actions">{vehicles.length === 0 && <Link className="button button-quiet" href="/fleet">Add vehicle</Link>}{customers.length === 0 && <Link className="button button-quiet" href="/customers">Add customer</Link>}</div></div> : <form className="form-grid" onSubmit={save}>
      <div className="booking-steps" aria-label={`Booking step ${step} of 3`}>{["1. Renter & car", "2. Dates", "3. Review"].map((label, index) => <span className={step === index + 1 ? "active" : ""} key={label}>{label}</span>)}</div>
      <h3 className="booking-step-title">{step === 1 ? "Who and which car?" : step === 2 ? "When is the rental?" : "Review your booking"}</h3>
      {step === 1 && <><Field label="Customer" wide><select value={customerId} onChange={(event) => setCustomerId(event.target.value)} required><option value="" disabled>Choose a customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}</select></Field><Field label="Vehicle" wide><select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} required><option value="" disabled>Choose a vehicle</option>{vehicles.filter((vehicle) => vehicle.status === "Available").map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration} · {vehicle.vehicleType} · {vehicle.make} {vehicle.model} · {formatMoney(vehicle.dailyRate)}/day</option>)}</select></Field></>}
      {step === 2 && <><Field label="Pickup date"><input type="date" min={today} value={startDate} onChange={(event) => { const nextDate = event.target.value; setStartDate(nextDate); if (endDate <= nextDate) setEndDate(dayAfter(nextDate)); }} required /></Field><Field label="Return date"><input type="date" min={dayAfter(startDate || today)} value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></Field></>}
      {step === 3 && <><p className="form-hint form-field-wide">{selectedCustomer?.name} · {vehicleName(selectedVehicle)}<br />{dateLabel(startDate)} to {dateLabel(endDate)}</p><div className="form-field-wide"><BookingPriceSummary vehicle={selectedVehicle} startDate={startDate} endDate={endDate} /></div><Field label="Booking note (optional)" wide><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="Pickup location or special request" /></Field></>}
      {error && <p className="form-error form-field-wide" role="alert">{error}</p>}
      <div className="form-field-wide"><div className="form-actions"><button className="button button-quiet" type="button" onClick={() => { setError(""); if (step > 1) setStep(step - 1); else onClose(); }}>{step === 1 ? "Cancel" : "Back"}</button>{step < 3 ? <button className="button button-primary" type="button" onClick={next}>Continue</button> : <button className="button button-primary" type="submit">Confirm booking</button>}</div></div>
    </form>}
  </Modal>;
}

function CreateVehicleBridge({ onClose }: { onClose: () => void }) {
  const { addVehicle } = useRentalData();
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    addVehicle({ registration: String(form.get("registration")).trim().toUpperCase(), make: String(form.get("make")).trim(), model: String(form.get("model")).trim(), year: Number(form.get("year")), dailyRate: Number(form.get("dailyRate")), vehicleType: String(form.get("vehicleType")) as Vehicle["vehicleType"], depositAmount: Number(form.get("depositAmount")), mileageAllowanceKmPerDay: Number(form.get("mileageAllowanceKmPerDay")), excessMileageRatePerKm: Number(form.get("excessMileageRatePerKm")), transmission: String(form.get("transmission")), fuelConsumptionLPer100Km: String(form.get("fuelConsumptionLPer100Km") ?? "").trim() ? Number(form.get("fuelConsumptionLPer100Km")) : undefined, status: "Available" });
    onClose();
  }
  return <Modal title="Add a vehicle" onClose={onClose}><form className="form-grid" onSubmit={save}>
    <Field label="Registration"><input name="registration" placeholder="e.g. AAZ 1234" required maxLength={16} /></Field>
    <Field label="Make"><input name="make" placeholder="Toyota" required /></Field>
    <Field label="Model"><input name="model" placeholder="Corolla Cross" required /></Field>
    <Field label="Year"><input name="year" type="number" min="1980" max="2035" defaultValue={new Date().getFullYear()} required /></Field>
    <Field label="Vehicle type"><select name="vehicleType" defaultValue="Budget" required><option>Budget</option><option>Premium</option><option>SUV</option></select></Field>
    <Field label="Transmission"><select name="transmission" defaultValue="Automatic"><option>Automatic</option><option>Manual</option></select></Field>
    <Field label="Day rate (USD)"><input name="dailyRate" type="number" min="1" step="1" placeholder="65" required /></Field>
    <Field label="Refundable deposit (USD)"><input name="depositAmount" type="number" min="1" step="1" placeholder="e.g. 100" required /></Field>
    <Field label="Included mileage (km per day)"><input name="mileageAllowanceKmPerDay" type="number" min="0" step="1" placeholder="e.g. 200" required /></Field>
    <Field label="Excess mileage (USD per km)"><input name="excessMileageRatePerKm" type="number" min="0.01" step="0.01" placeholder="e.g. 0.25" required /></Field>
    <Field label="Average fuel consumption (L/100 km)"><input name="fuelConsumptionLPer100Km" type="number" min="1" max="40" step="0.1" placeholder="e.g. 7.5" required /></Field>
    <p className="form-hint form-field-wide">Type, deposit, mileage allowance, and excess rate will be copied to each new booking.</p>
    <div className="form-field-wide"><DialogActions onCancel={onClose} submit="Add vehicle" /></div>
  </form></Modal>;
}
function CreateCustomerBridge({ onClose }: { onClose: () => void }) {
  const { addCustomer } = useRentalData();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true); const form = new FormData(event.currentTarget);
    try {
      const idPhoto = form.get("idPhoto");
      if (!(idPhoto instanceof File) || !idPhoto.size) throw new Error("Capture or choose an ID image to continue.");
      addCustomer({ name: String(form.get("name")).trim(), phone: String(form.get("phone")).trim(), email: String(form.get("email")).trim(), licence: String(form.get("licence")).trim(), nextOfKinName: String(form.get("nextOfKinName")).trim(), nextOfKinPhone: String(form.get("nextOfKinPhone")).trim(), idNumber: String(form.get("idNumber")).trim(), address: String(form.get("address") ?? "").trim(), idPhotoDataUrl: await compressIdentityImage(idPhoto), idPhotoName: idPhoto.name }); onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save this customer."); }
    finally { setBusy(false); }
  }
  return <Modal title="Add a customer" onClose={onClose}><form className="form-grid" onSubmit={save}>
    <Field label="Full name" wide><input name="name" placeholder="Customer name" required /></Field>
    <Field label="Phone"><input name="phone" type="tel" placeholder="+263 77 000 0000" required /></Field>
    <Field label="Email"><input name="email" type="email" placeholder="name@example.com" required /></Field>
    <Field label="Driver licence number"><input name="licence" placeholder="Licence number" required /></Field>
    <Field label="ID number"><input name="idNumber" placeholder="National ID or passport" required /></Field>
    <Field label="Residential address" wide><input name="address" placeholder="House number, street, suburb, city" autoComplete="street-address" required /></Field>
    <Field label="Next of kin full name"><input name="nextOfKinName" placeholder="Full name" required /></Field>
    <Field label="Next of kin phone"><input name="nextOfKinPhone" type="tel" placeholder="+263 77 000 0000" required /></Field>
    <Field label="Customer ID photo" wide><input name="idPhoto" type="file" accept="image/*" capture="environment" required /><small>Capture or choose a clear photo of the customer’s ID. The image is compressed before secure workspace storage.</small></Field>
    {error && <p className="form-error form-field-wide" role="alert">{error}</p>}
    <div className="form-field-wide"><div className="form-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save customer"}</button></div></div>
  </form></Modal>;
}
function CreateMaintenanceBridge({ onClose }: { onClose: () => void }) {
  const { vehicles, addMaintenance } = useRentalData(); function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); addMaintenance({ vehicleId: String(form.get("vehicleId")), title: String(form.get("title")).trim(), dueDate: String(form.get("dueDate")), cost: Number(form.get("cost") || 0), status: "Scheduled", note: String(form.get("note")).trim() }); onClose(); }
  return <Modal title="Schedule maintenance" onClose={onClose}>{vehicles.length === 0 ? <div className="setup-needed"><p>Add a vehicle before scheduling service.</p><Link className="button button-primary" href="/fleet">Go to fleet</Link></div> : <form className="form-grid" onSubmit={save}><Field label="Vehicle" wide><select name="vehicleId" required>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration} · {vehicle.make} {vehicle.model}</option>)}</select></Field><Field label="Service"><input name="title" placeholder="Oil change" required /></Field><Field label="Due date"><input name="dueDate" type="date" defaultValue={defaultServiceDate()} required /></Field><Field label="Estimated cost (USD)"><input name="cost" type="number" min="0" placeholder="0" /></Field><Field label="Note (optional)" wide><textarea name="note" rows={2} placeholder="Workshop or work details" /></Field><div className="form-field-wide"><DialogActions onCancel={onClose} submit="Schedule job" /></div></form>}</Modal>;
}

