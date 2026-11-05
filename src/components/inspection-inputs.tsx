"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import type { InspectionChecklist, InspectionCheckStatus } from "@/lib/rental-data";

export const inspectionChecklistItems = [
  { key: "tyres", label: "Tyres and spare wheel" },
  { key: "dents", label: "Dents on bodywork" },
  { key: "scratches", label: "Scratches on bodywork" },
  { key: "mirrors", label: "Wing and rear-view mirrors" },
  { key: "glass", label: "Windscreen and windows" },
  { key: "lights", label: "Lights and indicators" },
  { key: "wipers", label: "Wipers and washers" },
  { key: "brakes", label: "Brakes" },
  { key: "seatBelts", label: "Seat belts" },
  { key: "fireExtinguisher", label: "Fire extinguisher" },
  { key: "safetyKit", label: "Warning triangle, jack and wheel spanner" },
] as const;

export function InspectionChecklistFields({
  value,
  onChange,
}: {
  value: InspectionChecklist;
  onChange: (next: InspectionChecklist) => void;
}) {
  function setStatus(key: string, status: InspectionCheckStatus | "") {
    const next = { ...value };
    if (status) next[key] = status;
    else delete next[key];
    onChange(next);
  }

  return <fieldset className="inspection-checklist form-field-wide">
    <legend>Vehicle checklist</legend>
    <p>Record each item at handover and again when the vehicle is returned.</p>
    <div className="inspection-checklist-items">
      {inspectionChecklistItems.map((item) => <label className="inspection-check-item" key={item.key}>
        <span>{item.label}</span>
        <select aria-label={item.label} required value={value[item.key] ?? ""} onChange={(event) => setStatus(item.key, event.target.value as InspectionCheckStatus | "")}>
          <option value="" disabled>Choose</option>
          <option value="ok">OK / no damage</option>
          <option value="attention">Issue / damage</option>
          <option value="na">Not applicable</option>
        </select>
      </label>)}
    </div>
  </fieldset>;
}

export function ClientSignature({
  name,
  onNameChange,
  signature,
  onSignatureChange,
  initialName = "",
}: {
  name: string;
  onNameChange: (name: string) => void;
  signature: string;
  onSignatureChange: (signature: string) => void;
  initialName?: string;
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
    <label className="form-field"><span>Client signatory name</span><input name="signatoryName" autoComplete="name" value={name} onChange={(event) => onNameChange(event.target.value)} placeholder={initialName || "Name of person signing"} required /></label>
    <div className="signature-pad-wrap">
      <span className="signature-label">CLIENT SIGNATURE <small>Sign using a finger or stylus</small></span>
      <canvas ref={canvasRef} className="signature-pad" width={960} height={240} aria-label="Client signature area" onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={finishDrawing} onPointerCancel={finishDrawing} />
      <div className="signature-pad-footer"><span>Signature required</span><button type="button" className="text-action" onClick={clearSignature}>Clear signature</button></div>
    </div>
  </div>;
}
