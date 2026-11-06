"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { InspectionChecklist, InspectionCheckStatus } from "@/lib/rental-data";

/**
 * The Classic Ride vehicle checklist, in the same order as the paper form.
 * `detail` items ask for written details (size, brand, number) as well as a status.
 */
export const inspectionChecklistItems = [
  { key: "interior", label: "Interior condition" },
  { key: "exterior", label: "Exterior condition" },
  { key: "tyreCondition", label: "Tyre condition; Pressure" },
  { key: "tyreBrand", label: "Tyre Size & Brand-name", detail: "Size and brand, e.g. 205/55 R16 Bridgestone" },
  { key: "wheelCaps", label: "Wheel caps" },
  { key: "wheelCovers", label: "Wheel Covers" },
  { key: "fluids", label: "Fluid levels" },
  { key: "battery", label: "Battery Number & Brand Name", detail: "Battery number and brand" },
  { key: "wipers", label: "Wipes" },
  { key: "horn", label: "Horn" },
  { key: "mirrors", label: "Rear view Mirrors" },
  { key: "spareWheel", label: "Spare wheel & Winder (Size & Brand Name)", detail: "Spare wheel size and brand" },
  { key: "locknut", label: "Locknut & Fuel Cap" },
  { key: "lights", label: "Lights: Headlights/brakes/indicators/tail/hazard/reverse" },
  { key: "jack", label: "Jack & wheel spanner" },
  { key: "windows", label: "Windows operation and windshields" },
  { key: "radio", label: "Radio: Cassette / CD (Brand Name)", detail: "Radio type and brand" },
  { key: "screens", label: "Front & Rear Screen" },
  { key: "aircon", label: "Aircon" },
  { key: "mats", label: "Mats" },
  { key: "fireExtinguisher", label: "Fire Extinguisher" },
  { key: "licences", label: "Licences: ZINARA/ZBC/Insurance" },
  { key: "reflectors", label: "Reflectors" },
  { key: "vestReflector", label: "Vest Reflector" },
  { key: "triangle", label: "Triangle" },
] as const satisfies readonly { key: string; label: string; detail?: string }[];

/** Items from earlier versions of the checklist, so older inspections still read correctly. */
const legacyLabels: Record<string, string> = {
  tyres: "Tyres and spare wheel", dents: "Dents on bodywork", scratches: "Scratches on bodywork", glass: "Windscreen and windows",
  brakes: "Brakes", seatBelts: "Seat belts", safetyKit: "Warning triangle, jack and wheel spanner", floorMats: "Rubber floor mats",
  modulator: "FM / Bluetooth modulator", charger: "Phone charger and USB cables", spareKey: "Spare key or remote", hubcaps: "Wheel caps and locking wheel nut",
  firstAid: "First aid kit", documents: "Vehicle documents (licence disc, insurance)",
};

export const checklistDeclaration = "I have checked the vehicle named above and agreed to its condition. I understand any differences may be charged on return.";

export const checkStatusLabels: Record<InspectionCheckStatus, string> = { ok: "OK", attention: "Issue", na: "N/A" };

/** Short label for a saved checklist status. */
export function checklistStatusLabel(_key: string, status: InspectionCheckStatus | undefined) {
  return status ? checkStatusLabels[status] : "—";
}

/** Rows to show for a saved checklist: the current items, plus any older items it recorded. */
export function checklistRows(checklist?: InspectionChecklist) {
  const current: { key: string; label: string }[] = inspectionChecklistItems.map((item) => ({ key: item.key, label: item.label }));
  const legacy = Object.keys(checklist ?? {}).filter((key) => !current.some((item) => item.key === key)).map((key) => ({ key, label: legacyLabels[key] ?? key }));
  return [...current, ...legacy];
}

export function InspectionChecklistFields({
  value,
  onChange,
  notes = {},
  onNotesChange,
  previous,
  previousLabel = "Out",
}: {
  value: InspectionChecklist;
  onChange: (next: InspectionChecklist) => void;
  notes?: Record<string, string>;
  onNotesChange?: (next: Record<string, string>) => void;
  /** The pickup checklist, shown next to each item when recording the return. */
  previous?: { checklist?: InspectionChecklist; notes?: Record<string, string> };
  previousLabel?: string;
}) {
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  function setStatus(key: string, status: InspectionCheckStatus | "") {
    const next = { ...value };
    if (status) next[key] = status;
    else delete next[key];
    onChange(next);
  }
  const done = inspectionChecklistItems.filter((item) => value[item.key]).length;

  return <fieldset className="inspection-checklist form-field-wide">
    <legend>Vehicle checklist</legend>
    <div className="inspection-checklist-group-head">
      <p>Tap a status for each item{previous ? `. The ${previousLabel.toLowerCase()} condition is shown for comparison` : ""}. Add details where the form asks for size or brand.</p>
      <span className="checklist-progress">{done}/{inspectionChecklistItems.length}</span>
      <button type="button" className="checklist-all-ok" onClick={() => onChange({ ...value, ...Object.fromEntries(inspectionChecklistItems.filter((item) => !value[item.key]).map((item) => [item.key, "ok"])) })} disabled={done === inspectionChecklistItems.length}>Mark the rest OK</button>
    </div>
    <div className="inspection-checklist-items">
      {inspectionChecklistItems.map((item) => {
        const detail = "detail" in item ? item.detail : undefined;
        const showNote = Boolean(detail) || openNotes[item.key] || Boolean(notes[item.key]);
        const before = previous?.checklist?.[item.key];
        const beforeNote = previous?.notes?.[item.key];
        return <div className={`inspection-check-item${value[item.key] ? "" : " is-pending"}`} key={item.key} role="radiogroup" aria-label={item.label}>
          <span className="check-item-label">{item.label}{previous && <small className={`check-previous${before === "attention" ? " is-issue" : ""}`}>{previousLabel}: {before ? checkStatusLabels[before] : "—"}{beforeNote ? ` · ${beforeNote}` : ""}</small>}</span>
          <div className="check-choices">{(["ok", "attention", "na"] as const).map((status) => <button type="button" key={status} role="radio" aria-checked={value[item.key] === status} className={`check-choice check-choice-${status}${value[item.key] === status ? " is-selected" : ""}`} onClick={() => setStatus(item.key, value[item.key] === status ? "" : status)}>{checkStatusLabels[status]}</button>)}</div>
          {onNotesChange && (showNote
            ? <input className="check-note" aria-label={`${item.label} details`} placeholder={detail ?? "Details (optional)"} value={notes[item.key] ?? ""} onChange={(event) => onNotesChange({ ...notes, [item.key]: event.target.value })} />
            : <button type="button" className="check-note-toggle" onClick={() => setOpenNotes((current) => ({ ...current, [item.key]: true }))}>＋ Add note</button>)}
        </div>;
      })}
    </div>
  </fieldset>;
}

export function ClientSignature({
  name,
  onNameChange,
  signature,
  onSignatureChange,
  initialName = "",
  nameLabel = "Client signatory name",
  title = "CLIENT SIGNATURE",
  inputName = "signatoryName",
}: {
  name: string;
  onNameChange: (name: string) => void;
  signature: string;
  onSignatureChange: (signature: string) => void;
  initialName?: string;
  nameLabel?: string;
  title?: string;
  inputName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const inkRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#243b30";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (!signature) { inkRef.current = false; return; }
    const image = new Image();
    image.onload = () => {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      inkRef.current = true;
    };
    image.src = signature;
  }, [signature]);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height,
    };
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const location = point(event);
    context.beginPath();
    context.moveTo(location.x, location.y);
    drawingRef.current = true;
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const location = point(event);
    context.lineTo(location.x, location.y);
    context.stroke();
    inkRef.current = true;
  }

  function finishDrawing(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (inkRef.current) onSignatureChange(event.currentTarget.toDataURL("image/png"));
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    drawingRef.current = false;
    inkRef.current = false;
    onSignatureChange("");
  }

  return <div className="client-signature form-field-wide">
    <label className="form-field"><span>{nameLabel}</span><input name={inputName} autoComplete="name" value={name} onChange={(event) => onNameChange(event.target.value)} placeholder={initialName || "Name of person signing"} required /></label>
    <div className="signature-pad-wrap">
      <span className="signature-label">{title} <small>Sign using a finger or stylus</small></span>
      <canvas ref={canvasRef} className="signature-pad" width={960} height={240} aria-label={`${title.toLowerCase()} area`} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={finishDrawing} onPointerCancel={finishDrawing} />
      <div className="signature-pad-footer"><span>Signature required</span><button type="button" className="text-action" onClick={clearSignature}>Clear signature</button></div>
    </div>
  </div>;
}
