"use client";
/* eslint-disable @next/next/no-img-element -- inspection photos and signatures are local data URLs; damage pins need the plain <img> box. */

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { AppShell, PageTopbar } from "@/components/app-shell";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { DrillLink } from "@/components/drilldown";
import { ClientSignature, InspectionChecklistFields, inspectionChecklistItems } from "@/components/inspection-inputs";
import { InspectionPhotoField, InspectionPhotoGallery, countDamageMarks, countRealPhotos, finalizePhotos } from "@/components/inspection-photos";
import { useRentalData, type InspectionChecklist, type InspectionPhoto, type PrebookingInspection } from "@/lib/rental-data";

function localDateValue() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function formatInspectionDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Harare" }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function inspectionTitle(item: PrebookingInspection, customerName: string, vehicleName: string) {
  return `${customerName} · ${vehicleName}`;
}

export function InspectionWorkspace() {
  const { inspections, customers, vehicles, bookings, addInspection, ready, currentUser, company } = useRentalData();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [photos, setPhotos] = useState<InspectionPhoto[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [checklist, setChecklist] = useState<InspectionChecklist>({});
  const [signature, setSignature] = useState("");
  const [signatoryName, setSignatoryName] = useState("");
  const [repName, setRepName] = useState(currentUser?.name ?? "");
  const [repSignature, setRepSignature] = useState("");

  const sorted = useMemo(() => [...inspections].sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate) || b.createdAt.localeCompare(a.createdAt)), [inspections]);
  const selected = sorted.find((item) => item.id === selectedId);
  const matchingBookings = bookings.filter((booking) => booking.customerId === customerId && booking.vehicleId === vehicleId);

  function resetForm() {
    setOpen(false); setCustomerId(""); setVehicleId(""); setBookingId(""); setPhotos([]); setError(""); setChecklist({}); setSignature(""); setSignatoryName(""); setRepSignature(""); setRepName(currentUser?.name ?? "");
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!countRealPhotos(photos)) { setError("Add at least one photo to complete the inspection."); return; }
    if (inspectionChecklistItems.some((item) => !checklist[item.key])) { setError("Complete every checklist item before saving the inspection."); return; }
    if (!signature || !signatoryName.trim()) { setError("Enter the client name and capture their signature."); return; }
    if (!repSignature || !repName.trim()) { setError(`Enter the ${company.name || "Classic Rides"} representative’s name and signature.`); return; }
    const form = new FormData(event.currentTarget);
    const created = addInspection({
      customerId: String(form.get("customerId")), vehicleId: String(form.get("vehicleId")),
      ...(bookingId ? { bookingId } : {}), stage: "Pre-booking", inspectionDate: String(form.get("inspectionDate")),
      odometerKm: Number(form.get("odometerKm")), fuelPercent: Number(form.get("fuelPercent")),
      condition: String(form.get("condition")) as PrebookingInspection["condition"],
      notes: String(form.get("notes")).trim(), photos: finalizePhotos(photos), checklist, signatoryName: signatoryName.trim(), signatureDataUrl: signature, signedAt: new Date().toISOString(), repName: repName.trim(), repSignatureDataUrl: repSignature,
    });
    setSelectedId(created.id);
    setSaved(true); window.setTimeout(() => setSaved(false), 3500); resetForm();
  }

  if (!ready) return <div className="loading-state"><span className="loading-spinner" />Loading workspace…</div>;
  return <AppShell active="Inspections">
    <PageTopbar title="Inspections" />
    <main className="module-wrap inspection-wrap">
      <section className="module-page-heading"><div><p className="eyebrow">VEHICLE CONDITION</p><h1>Pre-booking inspections</h1><p className="module-summary">Record condition and photos against the customer and vehicle before confirming a rental.</p></div><button className="button button-primary page-action" type="button" onClick={() => setOpen(true)}><span aria-hidden="true">＋</span>New inspection</button></section>
      {saved && <div className="inline-notice" role="status">Inspection added and linked to the selected customer and vehicle.</div>}
      {!customers.length || !vehicles.length ? <section className="data-empty"><span className="data-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 4.5h8a2 2 0 0 1 2 2V20H6V6.5a2 2 0 0 1 2-2Z"/><path d="M9 10h6m-6 3.5h6"/></svg></span><h2>Add a customer and vehicle first</h2><p>Each inspection needs a customer and a vehicle, so photos stay attached to both records.</p><div className="empty-actions"><Link className="button button-quiet" href="/customers">Add customer</Link><Link className="button button-primary" href="/fleet">Add vehicle</Link></div></section> : !sorted.length ? <section className="data-empty"><span className="data-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 4.5h8a2 2 0 0 1 2 2V20H6V6.5a2 2 0 0 1 2-2Z"/><path d="M9 10h6m-6 3.5h6"/></svg></span><h2>No inspections yet</h2><p>Create a pre-booking condition record, attach vehicle photos, and keep it connected to the renter and vehicle.</p><button className="button button-primary" type="button" onClick={() => setOpen(true)}>＋ Create first inspection</button></section> : <div className="inspection-layout">
        <section className="inspection-list panel"><div className="panel-heading"><div><p className="eyebrow">INSPECTION RECORDS</p><h2>{sorted.length} {sorted.length === 1 ? "inspection" : "inspections"}</h2></div></div>
          <div className="inspection-cards">{sorted.map((item) => {
            const customer = customers.find((record) => record.id === item.customerId);
            const vehicle = vehicles.find((record) => record.id === item.vehicleId);
            const carName = vehicle ? `${vehicle.make} ${vehicle.model}` : "Vehicle unavailable";
            const renterName = customer?.name ?? "Customer unavailable";
            return <button className={`inspection-record${selected?.id === item.id ? " is-selected" : ""}`} type="button" key={item.id} onClick={() => setSelectedId(item.id)} aria-pressed={selected?.id === item.id}>
              <span className="inspection-record-icon"><svg viewBox="0 0 24 24"><path d="M8 4.5h8a2 2 0 0 1 2 2V20H6V6.5a2 2 0 0 1 2-2Z"/><path d="M9 10h6m-6 3.5h6"/></svg></span>
              <span className="inspection-record-copy"><strong>{inspectionTitle(item, renterName, carName)}</strong><small>{formatInspectionDate(item.inspectionDate)}{item.bookingId ? ` · ${bookings.find((booking) => booking.id === item.bookingId)?.reference ?? "Linked booking"}` : " · Pre-booking"}</small></span>
              <span className="inspection-record-meta"><span className={`status-pill ${item.condition === "Needs attention" ? "status-cancelled" : item.condition === "Fair" ? "status-active" : "status-available"}`}>{item.condition}</span><small>{countRealPhotos(item.photos)} {countRealPhotos(item.photos) === 1 ? "photo" : "photos"}{countDamageMarks(item.photos) ? ` · ${countDamageMarks(item.photos)} marked` : ""}</small></span>
            </button>;
          })}</div>
        </section>
        {selected && <section className="inspection-detail panel"><div className="panel-heading"><div><p className="eyebrow">INSPECTION DETAIL</p><h2>{customers.find((item) => item.id === selected.customerId)?.name ?? "Customer"}</h2></div><span className="status-pill status-confirmed">{selected.condition}</span></div>
          <div className="inspection-linked-records"><div><span>CUSTOMER</span><strong><DrillLink kind="customer" id={customers.find((item) => item.id === selected.customerId)?.id}>{customers.find((item) => item.id === selected.customerId)?.name ?? "Customer unavailable"}</DrillLink></strong><small>{customers.find((item) => item.id === selected.customerId)?.phone ?? ""}</small></div><div><span>VEHICLE</span><strong><DrillLink kind="vehicle" id={vehicles.find((item) => item.id === selected.vehicleId)?.id}>{vehicles.find((item) => item.id === selected.vehicleId)?.registration ?? "Vehicle unavailable"}</DrillLink></strong><small>{(() => { const v = vehicles.find((item) => item.id === selected.vehicleId); return v ? `${v.make} ${v.model}` : ""; })()}</small></div></div>
          <div className="inspection-facts"><span><small>INSPECTION DATE</small><strong>{formatInspectionDate(selected.inspectionDate)}</strong></span><span><small>ODOMETER</small><strong>{selected.odometerKm.toLocaleString()} km</strong></span><span><small>FUEL</small><strong>{selected.fuelPercent}%</strong></span></div>
          {selected.checklist && <div className="inspection-saved-checklist"><span>VEHICLE CHECKLIST</span>{inspectionChecklistItems.map((entry) => <div key={entry.key}><span>{entry.label}</span><strong>{selected.checklist?.[entry.key] === "ok" ? "OK" : selected.checklist?.[entry.key] === "attention" ? "Issue" : "N/A"}</strong></div>)}</div>}
          {(selected.signatureDataUrl || selected.repSignatureDataUrl) && <div className="inspection-signatures">{selected.signatureDataUrl && <div className="inspection-saved-signature"><span>CLIENT · {selected.signatoryName || "CLIENT"}</span><img src={selected.signatureDataUrl} alt={`Signature from ${selected.signatoryName || "client"}`} /></div>}{selected.repSignatureDataUrl && <div className="inspection-saved-signature"><span>{(company.name || "Classic Rides").toUpperCase()} · {selected.repName || "REPRESENTATIVE"}</span><img src={selected.repSignatureDataUrl} alt={`Signature from ${selected.repName || "representative"}`} /></div>}</div>}
          <div className="inspection-notes"><span>CONDITION NOTES</span><p>{selected.notes || "No additional notes."}</p></div>
          {selected.bookingId && <p className="inspection-booking-link">Linked booking: <DrillLink kind="booking" id={bookings.find((booking) => booking.id === selected.bookingId)?.id}>{bookings.find((booking) => booking.id === selected.bookingId)?.reference ?? "Booking"}</DrillLink></p>}
          <InspectionPhotoGallery photos={selected.photos} />
        </section>}
      </div>}
    </main>
    {open && <WorkspaceDialog title="New vehicle inspection" eyebrow="PRE-BOOKING CHECK" className="inspection-modal" onClose={resetForm}>
      <form className="form-grid" onSubmit={save}>
        <label className="form-field form-field-wide"><span>Customer</span><select name="customerId" required value={customerId} onChange={(event) => { const selectedCustomerId = event.target.value; setCustomerId(selectedCustomerId); setSignatoryName(customers.find((customer) => customer.id === selectedCustomerId)?.name ?? ""); setBookingId(""); }}><option value="" disabled>Select renter</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}</select></label>
        <label className="form-field form-field-wide"><span>Vehicle</span><select name="vehicleId" required value={vehicleId} onChange={(event) => { setVehicleId(event.target.value); setBookingId(""); }}><option value="" disabled>Select vehicle</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration} · {vehicle.make} {vehicle.model}</option>)}</select></label>
        <label className="form-field form-field-wide"><span>Related booking <small>(optional)</small></span><select value={bookingId} onChange={(event) => setBookingId(event.target.value)} disabled={!matchingBookings.length}><option value="">No booking yet</option>{matchingBookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.reference} · {formatInspectionDate(booking.startDate)}</option>)}</select><input type="hidden" name="bookingId" value={bookingId} /></label>
        <label className="form-field"><span>Inspection date</span><input name="inspectionDate" type="date" defaultValue={localDateValue()} required /></label>
        <label className="form-field"><span>Odometer (km)</span><input name="odometerKm" type="number" min="0" step="1" placeholder="e.g. 48,250" required /></label>
        <label className="form-field"><span>Fuel level</span><select name="fuelPercent" defaultValue="100"><option value="100">Full · 100%</option><option value="75">¾ tank · 75%</option><option value="50">½ tank · 50%</option><option value="25">¼ tank · 25%</option><option value="0">Empty · 0%</option></select></label>
        <label className="form-field"><span>Overall condition</span><select name="condition" defaultValue="Good"><option>Good</option><option>Fair</option><option>Needs attention</option></select></label>
        <label className="form-field form-field-wide"><span>Condition notes</span><textarea name="notes" rows={3} placeholder="Describe existing damage, cleanliness, or other notes." /></label>
        <InspectionChecklistFields value={checklist} onChange={setChecklist} />
        <ClientSignature name={signatoryName} onNameChange={setSignatoryName} signature={signature} onSignatureChange={setSignature} initialName={customers.find((customer) => customer.id === customerId)?.name ?? ""} />
        <ClientSignature name={repName} onNameChange={setRepName} signature={repSignature} onSignatureChange={setRepSignature} initialName={currentUser?.name ?? ""} nameLabel={`${company.name || "Classic Rides"} representative`} title="REPRESENTATIVE SIGNATURE" inputName="repName" />
        <InspectionPhotoField photos={photos} onChange={setPhotos} required />
        {error && <p className="form-error form-field-wide" role="alert">{error}</p>}
        <p className="form-hint form-field-wide">This inspection stays attached to the selected customer and vehicle. Photos are saved with the workspace record.</p>
        <div className="form-field-wide"><div className="form-actions"><button className="button button-quiet" type="button" onClick={resetForm}>Cancel</button><button className="button button-primary" type="submit" >Save inspection</button></div></div>
      </form>
    </WorkspaceDialog>}
  </AppShell>;
}
