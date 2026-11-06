"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { compressIdentityImage } from "@/lib/identity-image";
import { useRentalData, type Customer } from "@/lib/rental-data";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <WorkspaceDialog title={title} eyebrow="CUSTOMER" onClose={onClose}>{children}</WorkspaceDialog>;
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`form-field${wide ? " form-field-wide" : ""}`}><span>{label}</span>{children}</label>;
}

/** Add or edit a customer. ID and licence photos are required for new customers; editing keeps existing photos unless replaced. */
export function CustomerDialog({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const { addCustomer, updateCustomer } = useRentalData();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const editing = Boolean(customer);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true); const form = new FormData(event.currentTarget);
    try {
      const photo = async (name: string, existing: string | undefined, label: string) => {
        const file = form.get(name);
        if (file instanceof File && file.size) {
          if (!file.type.startsWith("image/")) throw new Error(`The ${label} must be a photo.`);
          return compressIdentityImage(file);
        }
        if (!existing && !editing) throw new Error(`Capture or choose a photo of the ${label} to continue.`);
        return existing;
      };
      const details = {
        name: String(form.get("name")).trim(), phone: String(form.get("phone")).trim(), email: String(form.get("email")).trim(), licence: String(form.get("licence")).trim(),
        nextOfKinName: String(form.get("nextOfKinName")).trim(), nextOfKinPhone: String(form.get("nextOfKinPhone")).trim(), idNumber: String(form.get("idNumber")).trim(), address: String(form.get("address") ?? "").trim(),
        idPhotoDataUrl: await photo("idPhoto", customer?.idPhotoDataUrl, "customer’s ID"),
        licencePhotoDataUrl: await photo("licencePhoto", customer?.licencePhotoDataUrl, "driver’s licence"),
      };
      if (customer) updateCustomer(customer.id, details);
      else addCustomer({ ...details, idPhotoName: (form.get("idPhoto") as File | null)?.name });
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save this customer."); }
    finally { setBusy(false); }
  }
  return <Modal title={editing ? `Edit ${customer?.name}` : "Add a customer"} onClose={onClose}><form className="form-grid" onSubmit={save}>
    <Field label="Full name" wide><input name="name" placeholder="Customer name" autoComplete="name" defaultValue={customer?.name ?? ""} required /></Field>
    <Field label="Phone"><input name="phone" type="tel" placeholder="+263 77 000 0000" autoComplete="tel" defaultValue={customer?.phone ?? ""} required /></Field>
    <Field label="Email"><input name="email" type="email" placeholder="name@example.com" autoComplete="email" defaultValue={customer?.email ?? ""} required={!editing} /></Field>
    <Field label="Driver licence number"><input name="licence" placeholder="Licence number" defaultValue={customer?.licence ?? ""} required /></Field>
    <Field label="ID number"><input name="idNumber" placeholder="National ID or passport" defaultValue={customer?.idNumber ?? ""} required={!editing} /></Field>
    <Field label="Residential address" wide><input name="address" placeholder="House number, street, suburb, city" autoComplete="street-address" defaultValue={customer?.address ?? ""} required={!editing} /></Field>
    <Field label="Next of kin full name"><input name="nextOfKinName" placeholder="Full name" defaultValue={customer?.nextOfKinName ?? ""} required={!editing} /></Field>
    <Field label="Next of kin phone"><input name="nextOfKinPhone" type="tel" placeholder="+263 77 000 0000" defaultValue={customer?.nextOfKinPhone ?? ""} required={!editing} /></Field>
    <Field label={editing && customer?.idPhotoDataUrl ? "Replace ID photo (optional)" : "Customer ID photo"} wide><input name="idPhoto" type="file" accept="image/*" capture="environment" required={!editing} /><small>{customer?.idPhotoDataUrl ? "An ID photo is on file. Choose a new one only to replace it." : "Capture or choose a clear photo of the customer’s ID. It’s compressed before saving."}</small></Field>
    <Field label={editing && customer?.licencePhotoDataUrl ? "Replace driver’s licence photo (optional)" : "Driver’s licence photo"} wide><input name="licencePhoto" type="file" accept="image/*" capture="environment" required={!editing} /><small>{customer?.licencePhotoDataUrl ? "A licence photo is on file. Choose a new one only to replace it." : editing ? "No licence photo yet. Add one so the number and expiry date are on record." : "Required. Photograph the front of the licence so the number and expiry date are readable."}</small></Field>
    {error && <p className="form-error form-field-wide" role="alert">{error}</p>}
    <div className="form-field-wide"><div className="form-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Save customer"}</button></div></div>
  </form></Modal>;
}
