"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type PublicVehicle = { id: string; make: string; model: string; year: number; vehicleType: string; dailyRate: number; depositAmount: number; mileageAllowanceKmPerDay: number; excessMileageRatePerKm: number; transmission: string; imageDataUrl?: string | null };
function money(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value); }
function localDate(offset = 0) { const date = new Date(); date.setDate(date.getDate() + offset); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); }
function nextDate(value: string) { if (!value) return localDate(1); const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + 1); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); }

export function PublicVehiclePage({ vehicleId }: { vehicleId: string }) {
  const [vehicle, setVehicle] = useState<PublicVehicle | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pickup, setPickup] = useState(localDate(1));
  const [returned, setReturned] = useState(localDate(2));
  useEffect(() => {
    let active = true;
    fetch(`/api/public-vehicles/${encodeURIComponent(vehicleId)}`, { cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "This vehicle could not be loaded.");
      if (active) setVehicle(result.vehicle as PublicVehicle);
    }).catch((reason: unknown) => { if (active) setLoadError(reason instanceof Error ? reason.message : "This vehicle could not be loaded."); });
    return () => { active = false; };
  }, [vehicleId]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(`/api/public-vehicles/${encodeURIComponent(vehicleId)}/prebook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName: form.get("customerName"), email: form.get("email"), phone: form.get("phone"), driverLicence: form.get("driverLicence"), startDate: pickup, endDate: returned, message: form.get("message") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not send your request.");
      setSuccess(`Request ${result.reference} received. Classic Rides will contact you to confirm availability.`);
      formElement.reset(); setPickup(localDate(1)); setReturned(localDate(2));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not send your request. Please try again."); }
    finally { setBusy(false); }
  }
  const days = pickup && returned && returned > pickup ? Math.max(1, Math.ceil((new Date(`${returned}T12:00:00`).getTime() - new Date(`${pickup}T12:00:00`).getTime()) / 86400000)) : 0;
  return <main className="public-rental-page">
    <header className="public-rental-header"><Link className="public-rental-brand" href="/"><span>C</span><strong>CLASSIC RIDES<small>CAR RENTAL</small></strong></Link><a href="mailto:sales@classicrides.online">sales@classicrides.online</a></header>
    {loadError ? <section className="public-vehicle-message"><span>CLASSIC RIDES</span><h1>Vehicle unavailable</h1><p>{loadError}</p><Link className="public-link-button" href="/">Visit Classic Rides</Link></section> : !vehicle ? <div className="public-vehicle-loading">Loading vehicle details…</div> : <>
      <section className="public-vehicle-hero"><div className="public-vehicle-copy"><span className="public-overline">{vehicle.vehicleType.toUpperCase()} · {vehicle.year}</span><h1>{vehicle.make} <em>{vehicle.model}</em></h1><p>Make your next trip easy. Send a pre-booking request and our team will help confirm your dates.</p><div className="public-vehicle-facts"><span>{vehicle.transmission}</span><span>{vehicle.mileageAllowanceKmPerDay} km included per day</span><span>{money(vehicle.excessMileageRatePerKm)} per extra km</span></div><div className="public-vehicle-rate"><strong>{money(vehicle.dailyRate)}</strong><span>per day</span></div></div><div className={`public-vehicle-photo${vehicle.imageDataUrl ? " vehicle-has-photo" : ""}`}><Image src={vehicle.imageDataUrl || "/classic-rides-fleet.png"} alt={vehicle.imageDataUrl ? `${vehicle.make} ${vehicle.model} for hire` : "Classic Rides fleet"} fill priority sizes="(max-width: 760px) 100vw, 55vw" unoptimized={Boolean(vehicle.imageDataUrl)} /></div></section>
      <section className="public-booking-section" id="prebook"><div className="public-booking-intro"><span className="public-overline">START YOUR BOOKING</span><h2>Pre-book this vehicle</h2><p>Your request is not a confirmed booking. We’ll check your dates and contact you to finalize the rental.</p><div className="public-deposit-note"><span>Refundable vehicle deposit</span><strong>{money(vehicle.depositAmount)}</strong></div></div>
        <form className="public-prebook-form" onSubmit={submit}>
          <label>Full name<input name="customerName" autoComplete="name" minLength={2} required placeholder="Your name" /></label>
          <label>Email<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
          <label>Phone<input name="phone" type="tel" autoComplete="tel" required placeholder="+263…" /></label>
          <label>Driver licence number<input name="driverLicence" required placeholder="Licence number" /></label>
          <label>Pickup date<input name="startDate" type="date" min={localDate()} value={pickup} onChange={(event) => { setPickup(event.target.value); if (returned <= event.target.value) setReturned(event.target.value ? new Date(new Date(`${event.target.value}T12:00:00`).getTime() + 86400000).toISOString().slice(0, 10) : ""); }} required /></label>
          <label>Return date<input name="endDate" type="date" min={nextDate(pickup)} value={returned} onChange={(event) => setReturned(event.target.value)} required /></label>
          <label className="public-form-wide">Anything we should know? <textarea name="message" rows={3} placeholder="Pickup location or questions (optional)" /></label>
          {days > 0 && <div className="public-estimate"><span>Estimated rental · {days} {days === 1 ? "day" : "days"}</span><strong>{money(days * vehicle.dailyRate)}</strong></div>}
          {error && <p className="public-form-error" role="alert">{error}</p>}
          {success && <p className="public-form-success" role="status">{success}</p>}
          <button className="public-submit" type="submit" disabled={busy}>{busy ? "Sending request…" : "Request this vehicle"}</button>
          <small className="public-privacy-note">By submitting, you agree Classic Rides may contact you about this rental request.</small>
        </form>
      </section>
    </>}
    <footer className="public-rental-footer"><span>CLASSIC RIDES · CAR RENTAL</span><a href="tel:+263772313286">+263 772 313 286</a><a href="tel:+263777879154">+263 777 879 154</a></footer>
  </main>;
}
