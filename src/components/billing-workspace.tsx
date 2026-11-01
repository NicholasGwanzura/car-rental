"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell, PageTopbar } from "@/components/app-shell";
import { formatMoney, useRentalData } from "@/lib/rental-data";

function printableDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Harare" }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

export function BillingWorkspace() {
  const { bookings, customers, vehicles, company, updateBooking, ready } = useRentalData();
  const [selectedId, setSelectedId] = useState("");
  const sorted = useMemo(() => [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [bookings]);
  const selected = sorted.find((booking) => booking.id === selectedId) ?? sorted[0];
  const customer = selected && customers.find((item) => item.id === selected.customerId);
  const vehicle = selected && vehicles.find((item) => item.id === selected.vehicleId);
  const paidTotal = bookings.filter((booking) => booking.paymentStatus === "Paid").reduce((sum, booking) => sum + booking.total, 0);
  const dueTotal = bookings.filter((booking) => booking.paymentStatus !== "Paid").reduce((sum, booking) => sum + booking.total, 0);
  if (!ready) return <div className="loading-state"><span className="loading-spinner" />Loading workspace…</div>;
  return <AppShell active="Billing">
    <PageTopbar title="Billing" />
    <main className="module-wrap billing-wrap">
      <section className="module-page-heading"><div><p className="eyebrow">WORKSPACE</p><h1>Billing</h1><p className="module-summary">Review rental charges, record payment status, and prepare customer invoices.</p></div></section>
      <section className="billing-stats" aria-label="Billing totals">
        <article className="billing-stat"><span>INVOICES</span><strong>{bookings.length}</strong><small>one invoice per booking</small></article>
        <article className="billing-stat"><span>PAID</span><strong>{formatMoney(paidTotal)}</strong><small>{bookings.filter((booking) => booking.paymentStatus === "Paid").length} marked paid</small></article>
        <article className="billing-stat"><span>AWAITING PAYMENT</span><strong>{formatMoney(dueTotal)}</strong><small>{bookings.filter((booking) => booking.paymentStatus !== "Paid").length} outstanding</small></article>
      </section>
      {!bookings.length ? <section className="data-empty billing-empty"><span className="data-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M3.5 9.5h17M7 14h4m2.5 0H17"/></svg></span><h2>Invoices appear with your bookings</h2><p>Create a booking to prepare its invoice and track payment from this page.</p><Link className="button button-primary" href="/bookings">Go to bookings</Link></section> : <div className="billing-layout">
        <section className="panel invoice-list-panel"><div className="panel-heading"><div><p className="eyebrow">RENTAL CHARGES</p><h2>Invoices</h2></div><span className="result-count">{bookings.length} total</span></div>
          <div className="invoice-list">{sorted.map((booking) => {
            const renter = customers.find((item) => item.id === booking.customerId);
            const isPaid = booking.paymentStatus === "Paid";
            return <article className={`invoice-list-row${selected?.id === booking.id ? " is-selected" : ""}`} key={booking.id}>
              <button type="button" className="invoice-select" onClick={() => setSelectedId(booking.id)} aria-pressed={selected?.id === booking.id}>
                <span className="invoice-list-main"><strong>{booking.reference}</strong><small>{renter?.name ?? "Customer"} · {printableDate(booking.startDate)}</small></span>
                <span className="invoice-list-side"><strong>{formatMoney(booking.total)}</strong><span className={`status-pill ${isPaid ? "status-available" : "status-active"}`}>{isPaid ? "Paid" : "Due"}</span></span>
              </button>
              <button className="payment-toggle" type="button" onClick={() => updateBooking(booking.id, { paymentStatus: isPaid ? "Unpaid" : "Paid" })}>{isPaid ? "Mark unpaid" : "Mark paid"}</button>
            </article>;
          })}</div>
        </section>
        {selected && <section className="invoice-preview-panel">
          <div className="invoice-toolbar"><div><strong>Invoice preview</strong><small>Use Print to save a PDF copy.</small></div><button type="button" className="button button-primary" onClick={() => window.print()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V4h10v4M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v6H7z"/><path d="M17 11h.01"/></svg>Save invoice as PDF</button></div>
          <article className="invoice-document">
            <header className="invoice-heading"><div><p className="eyebrow">INVOICE</p><h2>{company.name || "Your rental company"}</h2>{company.address && <p>{company.address}</p>}{(company.email || company.phone) && <p>{[company.email, company.phone].filter(Boolean).join(" · ")}</p>}</div><div className="invoice-number"><span>INVOICE</span><strong>{company.invoicePrefix || "INV"}-{selected.reference.replace(/^BK-/, "")}</strong><small>Issued {printableDate(selected.createdAt)}</small></div></header>
            <div className="invoice-rule" />
            <section className="invoice-parties"><div><span>BILL TO</span><strong>{customer?.name ?? "Customer"}</strong><small>{customer?.email || ""}</small><small>{customer?.phone || ""}</small></div><div><span>RENTAL DETAILS</span><strong>{vehicle ? `${vehicle.make} ${vehicle.model}` : "Rental vehicle"}</strong><small>{vehicle?.registration || ""}</small><small>{printableDate(selected.startDate)} — {printableDate(selected.endDate)}</small></div></section>
            <table className="invoice-lines"><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody><tr><td>Vehicle rental {selected.note ? `· ${selected.note}` : ""}</td><td>{formatMoney(selected.total)}</td></tr></tbody></table>
            <div className="invoice-total"><span>Total due</span><strong>{formatMoney(selected.total)}</strong></div>
            <div className="invoice-payment"><span className={`status-pill ${selected.paymentStatus === "Paid" ? "status-available" : "status-active"}`}>{selected.paymentStatus === "Paid" ? "Paid" : "Payment due"}</span>{company.paymentInstructions && <p><strong>Payment instructions</strong><br />{company.paymentInstructions}</p>}</div>
            <footer className="invoice-footer">Thank you for choosing {company.name || "our rental company"}.</footer>
          </article>
        </section>}
      </div>}
    </main>
  </AppShell>;
}
