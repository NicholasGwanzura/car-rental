"use client";

import { useState, type FormEvent } from "react";
import { AppShell, PageTopbar } from "@/components/app-shell";
import { useRentalData, type CompanyProfile } from "@/lib/rental-data";

export function CompanySettingsWorkspace() {
  const { company, updateCompany } = useRentalData();
  const [saved, setSaved] = useState(false);
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const profile: CompanyProfile = {
      name: String(form.get("name")).trim(), email: String(form.get("email")).trim(),
      phone: String(form.get("phone")).trim(), address: String(form.get("address")).trim(),
      invoicePrefix: String(form.get("invoicePrefix")).trim().toUpperCase() || "INV",
      paymentInstructions: String(form.get("paymentInstructions")).trim(),
    };
    updateCompany(profile); setSaved(true); window.setTimeout(() => setSaved(false), 3500);
  }
  return <AppShell active="Company settings">
    <PageTopbar title="Company settings" />
    <main className="module-wrap settings-wrap">
      <section className="module-page-heading"><div><p className="eyebrow">WORKSPACE</p><h1>Company settings</h1><p className="module-summary">Add your business details once. They’ll appear on invoices and PDF exports.</p></div></section>
      {saved && <div className="inline-notice" role="status">Company details updated.</div>}
      <form className="settings-card" onSubmit={save}>
        <div className="settings-section-heading"><span className="settings-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V6.5L12 3l8 3.5V20M8 20v-5h8v5M8 9h.01M12 9h.01M16 9h.01"/></svg></span><div><h2>Business identity</h2><p>Shown as the sender on customer invoices.</p></div></div>
        <div className="settings-form-grid">
          <label className="form-field"><span>Company name</span><input name="name" defaultValue={company.name} required autoComplete="organization" placeholder="Spiritus Car Rental" /></label>
          <label className="form-field"><span>Invoice number prefix</span><input name="invoicePrefix" defaultValue={company.invoicePrefix} maxLength={10} placeholder="INV" /></label>
          <label className="form-field"><span>Business email</span><input name="email" type="email" defaultValue={company.email} autoComplete="email" placeholder="hello@example.com" /></label>
          <label className="form-field"><span>Business phone</span><input name="phone" type="tel" defaultValue={company.phone} autoComplete="tel" placeholder="+263 77 000 0000" /></label>
          <label className="form-field settings-wide"><span>Business address</span><textarea name="address" rows={3} defaultValue={company.address} autoComplete="street-address" placeholder="Street, city, country" /></label>
          <label className="form-field settings-wide"><span>Payment instructions</span><textarea name="paymentInstructions" rows={3} defaultValue={company.paymentInstructions} placeholder="Bank transfer details or payment reference" /></label>
        </div>
        <div className="settings-footer"><span>These details are stored with your workspace.</span><button className="button button-primary" type="submit">Save changes</button></div>
      </form>
    </main>
  </AppShell>;
}
