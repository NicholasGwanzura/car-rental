"use client";

import { useState, type ChangeEvent, type MouseEvent } from "react";
import { inspectionDamageTypes, type InspectionDamageMark, type InspectionDamageType, type InspectionPhoto } from "@/lib/rental-data";

export const PHOTO_LIMIT = 6;
const PHOTO_SIZE_LIMIT = 500_000;
const INPUT_SIZE_LIMIT = 20 * 1024 * 1024;

function makeId() {
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

export async function compressPhoto(file: File): Promise<InspectionPhoto> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image.`);
  if (file.size > INPUT_SIZE_LIMIT) throw new Error(`${file.name} is larger than 20 MB.`);
  const bitmap = await createImageBitmap(file);
  try {
    const maxDimension = 1440;
    const ratio = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * ratio));
    let height = Math.max(1, Math.round(bitmap.height * ratio));
    const canvas = document.createElement("canvas");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Photo compression is unavailable in this browser.");
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await imageBlob(canvas, [0.76, 0.66, 0.56, 0.50, 0.44][attempt]);
      if (blob.size <= PHOTO_SIZE_LIMIT) return { id: makeId(), name: file.name, dataUrl: await dataUrlFromBlob(blob), marks: [] };
      width = Math.round(width * 0.82); height = Math.round(height * 0.82);
    }
    throw new Error(`${file.name} could not be reduced below 500 KB. Try a smaller photo.`);
  } finally { bitmap.close(); }
}

export function damageClass(type: InspectionDamageType) {
  return `damage-${type.toLowerCase().replace(/\s+/g, "-")}`;
}

/** Numbered pins drawn over a photo; positions are stored as percentages so they survive resizing. */
export function DamagePins({ marks }: { marks?: InspectionDamageMark[] }) {
  return <>{(marks ?? []).map((mark, index) => <span key={mark.id} className={`damage-pin ${damageClass(mark.type)}`} style={{ left: `${mark.x}%`, top: `${mark.y}%` }} title={`${index + 1}. ${mark.type}${mark.note ? ` – ${mark.note}` : ""}`}>{index + 1}</span>)}</>;
}

export function DamageList({ marks }: { marks?: InspectionDamageMark[] }) {
  if (!marks?.length) return null;
  return <ol className="damage-list">{marks.map((mark, index) => <li key={mark.id}><span className={`damage-pin damage-pin-static ${damageClass(mark.type)}`}>{index + 1}</span><strong>{mark.type}</strong>{mark.note && <span>{mark.note}</span>}</li>)}</ol>;
}

/** Photo capture with tap-to-mark damage (dents, scratches, cracks…). */
export function InspectionPhotoField({
  photos,
  onChange,
  required = false,
  label = "Vehicle photos",
}: {
  photos: InspectionPhoto[];
  onChange: (photos: InspectionPhoto[]) => void;
  required?: boolean;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState("");
  const [damageType, setDamageType] = useState<InspectionDamageType>("Dent");
  const active = photos.find((photo) => photo.id === activeId);

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length > PHOTO_LIMIT - photos.length) { setError(`You can attach up to ${PHOTO_LIMIT} photos per inspection.`); return; }
    setBusy(true);
    try {
      const prepared = await Promise.all(files.map(compressPhoto));
      onChange([...photos, ...prepared]);
      if (!activeId && prepared[0]) setActiveId(prepared[0].id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add these photos."); }
    finally { setBusy(false); }
  }

  function updateMarks(photoId: string, update: (marks: InspectionDamageMark[]) => InspectionDamageMark[]) {
    onChange(photos.map((photo) => photo.id === photoId ? { ...photo, marks: update(photo.marks ?? []) } : photo));
  }

  function placeMark(event: MouseEvent<HTMLDivElement>) {
    if (!active) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    updateMarks(active.id, (marks) => [...marks, { id: makeId(), x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, type: damageType }]);
  }

  function removePhoto(id: string) {
    onChange(photos.filter((photo) => photo.id !== id));
    if (activeId === id) setActiveId("");
  }

  return <div className="form-field form-field-wide">
    <span>{label} <small>({required ? "required" : "optional"} · up to {PHOTO_LIMIT} · tap a photo to mark damage)</small></span>
    <label className="inspection-upload"><input type="file" accept="image/*" capture="environment" multiple onChange={(event) => void addPhotos(event)} disabled={busy || photos.length >= PHOTO_LIMIT} /><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10H4z"/><circle cx="12" cy="12" r="3"/></svg><strong>{busy ? "Preparing photos…" : "Take photos or choose from device"}</strong><small>JPEG images are resized and limited to about 500 KB each.</small></label>
    {photos.length > 0 && <div className="inspection-upload-previews">{photos.map((photo) => <div className={`inspection-upload-preview${photo.id === activeId ? " is-active" : ""}`} key={photo.id}>
      <button type="button" className="inspection-preview-select" onClick={() => setActiveId(photo.id === activeId ? "" : photo.id)} aria-pressed={photo.id === activeId} aria-label={`Mark damage on ${photo.name}`}><img src={photo.dataUrl} alt={photo.name} />{(photo.marks?.length ?? 0) > 0 && <span className="inspection-preview-count">{photo.marks?.length}</span>}</button>
      <button type="button" className="inspection-preview-remove" onClick={() => removePhoto(photo.id)} aria-label={`Remove ${photo.name}`}>×</button>
    </div>)}</div>}
    {active && <div className="damage-editor">
      <div className="damage-type-picker" role="radiogroup" aria-label="Damage type">{inspectionDamageTypes.map((type) => <button key={type} type="button" role="radio" aria-checked={damageType === type} className={`damage-type-chip ${damageClass(type)}${damageType === type ? " is-selected" : ""}`} onClick={() => setDamageType(type)}>{type}</button>)}</div>
      <p className="damage-editor-hint">Choose a damage type, then tap the photo where it is.</p>
      <div className="damage-canvas" onClick={placeMark} role="presentation"><img src={active.dataUrl} alt={`Mark damage on ${active.name}`} draggable={false} /><DamagePins marks={active.marks} /></div>
      {(active.marks?.length ?? 0) > 0 && <ol className="damage-list damage-list-edit">{active.marks?.map((mark, index) => <li key={mark.id}>
        <span className={`damage-pin damage-pin-static ${damageClass(mark.type)}`}>{index + 1}</span>
        <select aria-label={`Damage ${index + 1} type`} value={mark.type} onChange={(event) => updateMarks(active.id, (marks) => marks.map((item) => item.id === mark.id ? { ...item, type: event.target.value as InspectionDamageType } : item))}>{inspectionDamageTypes.map((type) => <option key={type}>{type}</option>)}</select>
        <input aria-label={`Damage ${index + 1} note`} placeholder="Note (e.g. rear bumper, 3 cm)" value={mark.note ?? ""} onChange={(event) => updateMarks(active.id, (marks) => marks.map((item) => item.id === mark.id ? { ...item, note: event.target.value } : item))} />
        <button type="button" className="text-action text-action-muted" onClick={() => updateMarks(active.id, (marks) => marks.filter((item) => item.id !== mark.id))}>Remove</button>
      </li>)}</ol>}
    </div>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}

export function countDamageMarks(photos: InspectionPhoto[]) {
  return photos.reduce((total, photo) => total + (photo.marks?.length ?? 0), 0);
}
