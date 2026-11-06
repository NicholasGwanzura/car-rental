"use client";
/* eslint-disable @next/next/no-img-element -- the odometer photo is a local data URL. */

import { useState, type ChangeEvent } from "react";
import { compressPhoto } from "@/components/inspection-photos";
import type { Booking, PrebookingInspection } from "@/lib/rental-data";

/** The highest odometer reading recorded for a vehicle, from inspections and booking readings. */
export function lastOdometerReading(vehicleId: string, inspections: PrebookingInspection[], bookings: Booking[]) {
  const readings = [
    ...inspections.filter((item) => item.vehicleId === vehicleId).map((item) => item.odometerKm),
    ...bookings.filter((booking) => booking.vehicleId === vehicleId).flatMap((booking) => [booking.checkoutOdometer, booking.returnOdometer]),
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return readings.length ? Math.max(...readings) : 0;
}

/** Checks an odometer reading and photo. Returns an error message, or "" when valid. */
export function validateOdometer(text: string, photo: string | undefined, minimum: number) {
  const trimmed = text.trim().replace(/[\s,]/g, "");
  if (!trimmed) return "Enter the odometer reading in km.";
  if (!/^\d+$/.test(trimmed)) return "Enter the odometer reading as a whole number of km, digits only.";
  const value = Number(trimmed);
  if (value <= 0) return "The odometer reading must be more than 0 km.";
  if (value < minimum) return `The odometer reading can’t be lower than the last recorded reading of ${minimum.toLocaleString()} km. Check the figure.`;
  if (!photo) return "Take a photo of the odometer showing the reading.";
  return "";
}

export function parseOdometer(text: string) {
  return Number(text.trim().replace(/[\s,]/g, ""));
}

export function OdometerField({ value, onChange, photo, onPhotoChange, minimum, minimumLabel, warnAboveKm = 5000 }: {
  value: string;
  onChange: (value: string) => void;
  photo?: string;
  onPhotoChange: (photo: string | undefined) => void;
  /** The lowest acceptable reading (the last one recorded). */
  minimum: number;
  minimumLabel?: string;
  /** Show a "check this" warning when the reading jumps by more than this. */
  warnAboveKm?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const numeric = parseOdometer(value);
  const jump = Number.isFinite(numeric) && value.trim() && minimum > 0 ? numeric - minimum : 0;

  async function capture(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setBusy(true); setError("");
    try { onPhotoChange((await compressPhoto(file)).dataUrl); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not use this photo."); }
    finally { setBusy(false); }
  }

  return <div className="odometer-field form-field-wide">
    <label className="form-field"><span>Odometer reading (km) <small>required</small></span>
      <input name="odometer" inputMode="numeric" pattern="[0-9 ,]*" autoComplete="off" placeholder={minimum ? `At least ${minimum.toLocaleString()}` : "e.g. 48250"} value={value} onChange={(event) => onChange(event.target.value)} required />
      <small>{minimum ? `${minimumLabel ?? "Last recorded reading"}: ${minimum.toLocaleString()} km.` : "Type the figure exactly as shown on the dashboard."}</small>
    </label>
    {jump > warnAboveKm && <p className="odometer-warning" role="status">That’s {jump.toLocaleString()} km more than the last reading. Double-check the figure before saving.</p>}
    <div className="odometer-photo">
      <span className="odometer-photo-label">Odometer photo <small>required · the reading must be readable</small></span>
      {photo ? <div className="odometer-photo-preview"><img src={photo} alt="Odometer reading" /><label className="button button-quiet">Retake<input type="file" accept="image/*" capture="environment" onChange={(event) => void capture(event)} /></label><button type="button" className="text-action text-action-muted" onClick={() => onPhotoChange(undefined)}>Remove</button></div>
        : <label className={`odometer-capture${busy ? " is-busy" : ""}`}><input type="file" accept="image/*" capture="environment" onChange={(event) => void capture(event)} disabled={busy} /><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10H4z"/><circle cx="12" cy="12" r="3"/></svg><strong>{busy ? "Preparing photo…" : "Photograph the odometer"}</strong></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  </div>;
}
