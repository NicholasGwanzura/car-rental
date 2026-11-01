"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { AppShell, PageTopbar } from "@/components/app-shell";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { useRentalData, type InspectionPhoto, type PrebookingInspection } from "@/lib/rental-data";

const PHOTO_LIMIT = 6;
const PHOTO_SIZE_LIMIT = 500_000;
const INPUT_SIZE_LIMIT = 20 * 1024 * 1024;

function localDateValue() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function formatInspectionDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Harare" }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function makePhotoId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function imageBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("This photo could not be prepared.")), "image/jpeg", quality));
}

function dataUrlFromBlob(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("This photo could not be read."));
    reader.onerror = () => reject(new Error("This photo could not be read."));
    reader.readAsDataURL(blob);
  });
}

async function compressPhoto(file: File): Promise<InspectionPhoto> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image.`);
  if (file.size > INPUT_SIZE_LIMIT) throw new Error(`${file.name} is larger than 20 MB.`);
  const bitmap = await createImageBitmap(file);
  try {
    const maxDimension = 1440;
    const ratio = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * ratio));
    let height = Math.max(1, Math.round(bitmap.height * ratio));
    const canvas = document.createElement("canvas");
    let blob: Blob;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Photo compression is unavailable in this browser.");
      context.drawImage(bitmap, 0, 0, width, height);
      blob = await imageBlob(canvas, [0.76, 0.66, 0.56, 0.50, 0.44][attempt]);
      if (blob.size <= PHOTO_SIZE_LIMIT) return { id: makePhotoId(), name: file.name, dataUrl: await dataUrlFromBlob(blob) };
      width = Math.round(width * 0.82); height = Math.round(height * 0.82);
    }
    throw new Error(`${file.name} could not be reduced below 500 KB. Try a smaller photo.`);
  } finally { bitmap.close(); }
}

function inspectionTitle(item: PrebookingInspection, customerName: string, vehicleName: string) {
  return `${customerName} · ${vehicleName}`;
}

function PhotoGrid({ photos }: { photos: InspectionPhoto[] }) {
  if (!photos.length) return <p className="inspection-no-photos">No photos attached.</p>;
  return <div className="inspection-photo-grid">{photos.map((photo, index) => <a className="inspection-photo" key={photo.id} href={photo.dataUrl} target="_blank" rel="noreferrer" aria-label={`Open inspection photo ${index + 1}: ${photo.name}`}><img src={photo.dataUrl} alt={`Inspection ${index + 1}: ${photo.name}`} /><span>{index + 1}</span></a>)}</div>;
}

export function InspectionWorkspace() {
  const { inspections, customers, vehicles, bookings, addInspection, ready } = useRentalData();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [photos, setPhotos] = useState<InspectionPhoto[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const sorted = useMemo(() => [...inspections].sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate) || b.createdAt.localeCompare(a.createdAt)), [inspections]);
  const selected = sorted.find((item) => item.id === selectedId);
  const matchingBookings = bookings.filter((booking) => booking.customerId === customerId && booking.vehicleId === vehicleId);

  function resetForm() {
    setOpen(false); setCustomerId(""); setVehicleId(""); setBookingId(""); setPhotos([]); setPhotoError(""); setError("");
  }

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    setPhotoError("");
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    const remaining = PHOTO_LIMIT - photos.length;
    if (files.length > remaining) { setPhotoError(`You can attach up to ${PHOTO_LIMIT} photos per inspection.`); return; }
    setBusy(true);
    try {
      const prepared = await Promise.all(files.map(compressPhoto));
      setPhotos((current) => [...current, ...prepared]);
    } catch (reason) { setPhotoError(reason instanceof Error ? reason.message : "Could not add these photos."); }
    finally { setBusy(false); }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!photos.length) { setError("Add at least one photo to complete the inspection."); return; }
    const form = new FormData(event.currentTarget);
    const created = addInspection({
      customerId: String(form.get("customerId")), vehicleId: String(form.get("vehicleId")),
      ...(bookingId ? { bookingId } : {}), inspectionDate: String(form.get("inspectionDate")),
      odometerKm: Number(form.get("odometerKm")), fuelPercent: Number(form.get("fuelPercent")),
      condition: String(form.get("condition")) as PrebookingInspection["condition"],
      notes: String(form.get("notes")).trim(), photos,
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
              <span className="inspection-record-meta"><span className={`status-pill ${item.condition === "Needs attention" ? "status-cancelled" : item.condition === "Fair" ? "status-active" : "status-available"}`}>{item.condition}</span><small>{item.photos.length} {item.photos.length === 1 ? "photo" : "photos"}</small></span>
            </button>;
          })}</div>
        </section>
        {selected && <section className="inspection-detail panel"><div className="panel-heading"><div><p className="eyebrow">INSPECTION DETAIL</p><h2>{customers.find((item) => item.id === selected.customerId)?.name ?? "Customer"}</h2></div><span className="status-pill status-confirmed">{selected.condition}</span></div>
          <div className="inspection-linked-records"><div><span>CUSTOMER</span><strong>{customers.find((item) => item.id === selected.customerId)?.name ?? "Customer unavailable"}</strong><small>{customers.find((item) => item.id === selected.customerId)?.phone ?? ""}</small></div><div><span>VEHICLE</span><strong>{vehicles.find((item) => item.id === selected.vehicleId)?.registration ?? "Vehicle unavailable"}</strong><small>{(() => { const v = vehicles.find((item) => item.id === selected.vehicleId); return v ? `${v.make} ${v.model}` : ""; })()}</small></div></div>
          <div className="inspection-facts"><span><small>INSPECTION DATE</small><strong>{formatInspectionDate(selected.inspectionDate)}</strong></span><span><small>ODOMETER</small><strong>{selected.odometerKm.toLocaleString()} km</strong></span><span><small>FUEL</small><strong>{selected.fuelPercent}%</strong></span></div>
          <div className="inspection-notes"><span>CONDITION NOTES</span><p>{selected.notes || "No additional notes."}</p></div>
          {selected.bookingId && <p className="inspection-booking-link">Linked booking: {bookings.find((booking) => booking.id === selected.bookingId)?.reference ?? "Booking"}</p>}
          <PhotoGrid photos={selected.photos} />
        </section>}
      </div>}
    </main>
    {open && <WorkspaceDialog title="New vehicle inspection" eyebrow="PRE-BOOKING CHECK" className="inspection-modal" onClose={resetForm}>
      <form className="form-grid" onSubmit={save}>
        <label className="form-field form-field-wide"><span>Customer</span><select name="customerId" required value={customerId} onChange={(event) => { setCustomerId(event.target.value); setBookingId(""); }}><option value="" disabled>Select renter</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}</select></label>
        <label className="form-field form-field-wide"><span>Vehicle</span><select name="vehicleId" required value={vehicleId} onChange={(event) => { setVehicleId(event.target.value); setBookingId(""); }}><option value="" disabled>Select vehicle</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration} · {vehicle.make} {vehicle.model}</option>)}</select></label>
        <label className="form-field form-field-wide"><span>Related booking <small>(optional)</small></span><select value={bookingId} onChange={(event) => setBookingId(event.target.value)} disabled={!matchingBookings.length}><option value="">No booking yet</option>{matchingBookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.reference} · {formatInspectionDate(booking.startDate)}</option>)}</select><input type="hidden" name="bookingId" value={bookingId} /></label>
        <label className="form-field"><span>Inspection date</span><input name="inspectionDate" type="date" defaultValue={localDateValue()} required /></label>
        <label className="form-field"><span>Odometer (km)</span><input name="odometerKm" type="number" min="0" step="1" placeholder="e.g. 48,250" required /></label>
        <label className="form-field"><span>Fuel level</span><select name="fuelPercent" defaultValue="100"><option value="100">Full · 100%</option><option value="75">¾ tank · 75%</option><option value="50">½ tank · 50%</option><option value="25">¼ tank · 25%</option><option value="0">Empty · 0%</option></select></label>
        <label className="form-field"><span>Overall condition</span><select name="condition" defaultValue="Good"><option>Good</option><option>Fair</option><option>Needs attention</option></select></label>
        <label className="form-field form-field-wide"><span>Condition notes</span><textarea name="notes" rows={3} placeholder="Describe existing damage, cleanliness, or other notes." /></label>
        <div className="form-field form-field-wide"><span>Vehicle photos <small>(required · up to {PHOTO_LIMIT}, compressed for storage)</small></span><label className="inspection-upload"><input type="file" accept="image/*" capture="environment" multiple onChange={(event) => void addPhotos(event)} disabled={busy || photos.length >= PHOTO_LIMIT} /><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10H4z"/><circle cx="12" cy="12" r="3"/></svg><strong>{busy ? "Preparing photos…" : "Take photos or choose from device"}</strong><small>JPEG images are resized and limited to about 500 KB each.</small></label>
          {photos.length > 0 && <div className="inspection-upload-previews">{photos.map((photo) => <div className="inspection-upload-preview" key={photo.id}><img src={photo.dataUrl} alt={photo.name} /><button type="button" onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))} aria-label={`Remove ${photo.name}`}>×</button></div>)}</div>}
          {photoError && <p className="form-error" role="alert">{photoError}</p>}
        </div>
        {error && <p className="form-error form-field-wide" role="alert">{error}</p>}
        <p className="form-hint form-field-wide">This inspection stays attached to the selected customer and vehicle. Photos are saved with the workspace record.</p>
        <div className="form-field-wide"><div className="form-actions"><button className="button button-quiet" type="button" onClick={resetForm}>Cancel</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Preparing photos…" : "Save inspection"}</button></div></div>
      </form>
    </WorkspaceDialog>}
  </AppShell>;
}
