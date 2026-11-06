"use client";

import Image from "next/image";
import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { InspectionPhotoGallery, countDamageMarks, countRealPhotos } from "@/components/inspection-photos";
import { checklistRows } from "@/components/inspection-inputs";
import { exportRentalContract } from "@/lib/rental-contract";
import { exportVehicleChecklist } from "@/lib/vehicle-checklist";
import { CustomerDialog } from "@/components/customer-dialog";
import { whatsappDigits } from "@/lib/brand";
import { formatMoney, nightsBetween, useRentalData, type Booking, type Customer, type Vehicle } from "@/lib/rental-data";

/**
 * Drill-downs: any vehicle, customer, booking or inspection can be opened in a detail
 * dialog from anywhere in the workspace. Links inside a dialog push onto a stack, so
 * "Back" returns to where you came from.
 */
export type DrillTarget =
  | { kind: "vehicle" | "customer" | "booking" | "inspection"; id: string }
  | { kind: "custom"; title: string; eyebrow?: string; content: ReactNode };

type DrillContext = { open: (target: DrillTarget) => void };
const Context = createContext<DrillContext | null>(null);

export function useDrilldown() {
  return useContext(Context) ?? { open: () => undefined };
}

export function DrillLink({ kind, id, children, className = "" }: { kind: "vehicle" | "customer" | "booking" | "inspection"; id?: string; children: ReactNode; className?: string }) {
  const { open } = useDrilldown();
  if (!id) return <>{children}</>;
  return <button type="button" className={`drill-link ${className}`.trim()} onClick={(event) => { event.stopPropagation(); open({ kind, id }); }}>{children}</button>;
}

function longDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Harare" }).format(new Date(value.length <= 10 ? `${value}T12:00:00` : value));
}

function statusClass(status: string) { return `status-pill status-${status.toLowerCase().replaceAll(" ", "-")}`; }

function Facts({ items }: { items: [string, ReactNode][] }) {
  return <dl className="drill-facts">{items.filter(([, value]) => value !== undefined && value !== null && value !== "").map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function Stats({ items }: { items: [string, string][] }) {
  return <div className="drill-stats">{items.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return <section className="drill-section"><h3>{title}{count !== undefined && <span>{count}</span>}</h3>{children}</section>;
}

function Empty({ children }: { children: ReactNode }) { return <p className="drill-empty">{children}</p>; }

export function BookingRows({ bookings }: { bookings: Booking[] }) {
  const { customers, vehicles } = useRentalData();
  const { open } = useDrilldown();
  if (!bookings.length) return <Empty>No bookings yet.</Empty>;
  return <ul className="drill-rows">{bookings.map((booking) => {
    const customer = customers.find((item) => item.id === booking.customerId);
    const vehicle = vehicles.find((item) => item.id === booking.vehicleId);
    return <li key={booking.id}><button type="button" onClick={() => open({ kind: "booking", id: booking.id })}>
      <span className="drill-row-main"><strong>{booking.reference}</strong><small>{customer?.name ?? "Customer removed"} · {vehicle ? `${vehicle.make} ${vehicle.model}` : "Vehicle removed"}</small><small>{longDate(booking.startDate)} – {longDate(booking.endDate)}</small></span>
      <span className="drill-row-side"><span className={statusClass(booking.status)}>{booking.status}</span><strong>{formatMoney(booking.total + (booking.excessMileageCharge ?? 0))}</strong></span>
      <span className="drill-row-arrow" aria-hidden="true">›</span>
    </button></li>;
  })}</ul>;
}

export function VehicleRows({ vehicles }: { vehicles: Vehicle[] }) {
  const { bookings } = useRentalData();
  const { open } = useDrilldown();
  if (!vehicles.length) return <Empty>No vehicles yet.</Empty>;
  return <ul className="drill-rows">{vehicles.map((vehicle) => {
    const current = bookings.find((booking) => booking.vehicleId === vehicle.id && booking.status === "Active");
    const next = bookings.filter((booking) => booking.vehicleId === vehicle.id && booking.status === "Confirmed").sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    return <li key={vehicle.id}><button type="button" onClick={() => open({ kind: "vehicle", id: vehicle.id })}>
      <span className="drill-row-main"><strong>{vehicle.make} {vehicle.model}</strong><small>{vehicle.registration} · {vehicle.vehicleType} · {formatMoney(vehicle.dailyRate)}/day</small><small>{current ? `On rent until ${longDate(current.endDate)}` : next ? `Next booking ${longDate(next.startDate)}` : "No upcoming bookings"}</small></span>
      <span className="drill-row-side"><span className={statusClass(current ? "Active" : vehicle.status)}>{current ? "On rent" : vehicle.status}</span></span>
      <span className="drill-row-arrow" aria-hidden="true">›</span>
    </button></li>;
  })}</ul>;
}

export function CustomerRows({ customers }: { customers: Customer[] }) {
  const { bookings } = useRentalData();
  const { open } = useDrilldown();
  if (!customers.length) return <Empty>No customers yet.</Empty>;
  return <ul className="drill-rows">{customers.map((customer) => {
    const own = bookings.filter((booking) => booking.customerId === customer.id);
    const missing = !customer.licencePhotoDataUrl || !customer.idPhotoDataUrl || !customer.address;
    return <li key={customer.id}><button type="button" onClick={() => open({ kind: "customer", id: customer.id })}>
      <span className="drill-row-main"><strong>{customer.name}</strong><small>{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</small><small>{own.length} {own.length === 1 ? "booking" : "bookings"}</small></span>
      <span className="drill-row-side">{missing ? <span className="status-pill status-active">Details missing</span> : <span className="status-pill status-available">Complete</span>}</span>
      <span className="drill-row-arrow" aria-hidden="true">›</span>
    </button></li>;
  })}</ul>;
}

function InspectionRows({ ids }: { ids: string[] }) {
  const { inspections } = useRentalData();
  const { open } = useDrilldown();
  const rows = inspections.filter((item) => ids.includes(item.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!rows.length) return <Empty>No inspections recorded.</Empty>;
  return <ul className="drill-rows">{rows.map((item) => <li key={item.id}><button type="button" onClick={() => open({ kind: "inspection", id: item.id })}>
    <span className="drill-row-main"><strong>{item.stage ?? "Inspection"} inspection</strong><small>{longDate(item.inspectionDate)} · {item.odometerKm.toLocaleString()} km · {item.fuelPercent}% fuel</small><small>{countRealPhotos(item.photos)} {countRealPhotos(item.photos) === 1 ? "photo" : "photos"}{countDamageMarks(item.photos) ? ` · ${countDamageMarks(item.photos)} damage marks` : ""}</small></span>
    <span className="drill-row-side"><span className={`status-pill ${item.condition === "Needs attention" ? "status-cancelled" : item.condition === "Fair" ? "status-active" : "status-available"}`}>{item.condition}</span></span>
    <span className="drill-row-arrow" aria-hidden="true">›</span>
  </button></li>)}</ul>;
}

function DocumentThumb({ src, label }: { src?: string; label: string }) {
  const { open } = useDrilldown();
  if (!src) return <div className="drill-doc is-missing"><span>{label}</span><small>Not captured</small></div>;
  return <button type="button" className="drill-doc" onClick={() => open({ kind: "custom", title: label, eyebrow: "DOCUMENT", content: <Image className="drill-doc-full" src={src} alt={label} width={900} height={600} unoptimized /> })}>
    <Image src={src} alt="" width={160} height={104} unoptimized /><span>{label}</span>
  </button>;
}

function VehicleDetail({ id }: { id: string }) {
  const { vehicles, bookings, maintenance, expenses, inspections, canViewFinancials } = useRentalData();
  const [copied, setCopied] = useState(false);
  const vehicle = vehicles.find((item) => item.id === id);
  if (!vehicle) return <Empty>This vehicle has been removed.</Empty>;
  const own = bookings.filter((booking) => booking.vehicleId === id).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const earned = own.filter((booking) => booking.status === "Active" || booking.status === "Completed");
  const income = earned.reduce((total, booking) => total + booking.total + (booking.excessMileageCharge ?? 0), 0);
  const days = earned.reduce((total, booking) => total + nightsBetween(booking.startDate, booking.endDate), 0);
  const jobs = maintenance.filter((job) => job.vehicleId === id).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const costs = expenses.filter((expense) => expense.vehicleId === id);
  const totalCosts = costs.reduce((total, expense) => total + expense.amount, 0) + jobs.filter((job) => job.status === "Completed").reduce((total, job) => total + job.cost, 0);
  async function copyLink() {
    const url = `https://classicrides.online/rent/${encodeURIComponent(id)}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { window.prompt("Copy this pre-booking link", url); }
  }
  return <>
    <div className="drill-hero">
      {vehicle.imageDataUrl ? <Image className="drill-hero-image" src={vehicle.imageDataUrl} alt={`${vehicle.make} ${vehicle.model}`} width={320} height={210} unoptimized /> : <div className="drill-hero-image drill-hero-placeholder" aria-hidden="true">{vehicle.make.slice(0, 1)}</div>}
      <div><div className="drill-hero-tags"><span className="registration-tag">{vehicle.registration}</span><span className={statusClass(vehicle.status)}>{vehicle.status}</span></div>
        <Facts items={[["Type", vehicle.vehicleType], ["Year", vehicle.year], ["Transmission", vehicle.transmission], ["Day rate", `${formatMoney(vehicle.dailyRate)} / day`], ["Deposit", formatMoney(vehicle.depositAmount)], ["Mileage", `${vehicle.mileageAllowanceKmPerDay} km/day · ${formatMoney(vehicle.excessMileageRatePerKm)}/km extra`], ["Fuel use", vehicle.fuelConsumptionLPer100Km ? `${vehicle.fuelConsumptionLPer100Km} L/100 km` : undefined]]} />
        <button type="button" className="button button-quiet" onClick={() => void copyLink()}>{copied ? "Link copied" : "Copy pre-book link"}</button>
      </div>
    </div>
    <Stats items={[["Rentals", String(earned.length)], ["Rental days", String(days)], ["Income", formatMoney(income)], ...(canViewFinancials ? [["Costs", formatMoney(totalCosts)], ["Net", formatMoney(income - totalCosts)]] as [string, string][] : [])]} />
    <Section title="Bookings" count={own.length}><BookingRows bookings={own.slice(0, 8)} /></Section>
    <Section title="Inspections" count={inspections.filter((item) => item.vehicleId === id).length}><InspectionRows ids={inspections.filter((item) => item.vehicleId === id).slice(0, 6).map((item) => item.id)} /></Section>
    <Section title="Maintenance" count={jobs.length}>{jobs.length ? <ul className="drill-list">{jobs.slice(0, 6).map((job) => <li key={job.id}><span><strong>{job.title}</strong><small>{longDate(job.dueDate)} · {job.status}</small></span><span>{formatMoney(job.cost)}</span></li>)}</ul> : <Empty>No service jobs.</Empty>}</Section>
    {canViewFinancials && <Section title="Expenses" count={costs.length}>{costs.length ? <ul className="drill-list">{[...costs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((expense) => <li key={expense.id}><span><strong>{expense.payee || expense.category}</strong><small>{longDate(expense.date)} · {expense.category}</small></span><span>{formatMoney(expense.amount)}</span></li>)}</ul> : <Empty>No expenses recorded for this car.</Empty>}</Section>}
  </>;
}

function CustomerDetail({ id }: { id: string }) {
  const { customers, bookings, inspections } = useRentalData();
  const [editing, setEditing] = useState(false);
  const customer = customers.find((item) => item.id === id);
  if (!customer) return <Empty>This customer has been removed.</Empty>;
  const own = bookings.filter((booking) => booking.customerId === id).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const billable = own.filter((booking) => booking.status !== "Cancelled");
  const billed = billable.reduce((total, booking) => total + booking.total + (booking.excessMileageCharge ?? 0), 0);
  const unpaid = billable.filter((booking) => booking.paymentStatus !== "Paid").reduce((total, booking) => total + booking.total + (booking.excessMileageCharge ?? 0), 0);
  const missing = [!customer.licencePhotoDataUrl && "driver’s licence photo", !customer.idPhotoDataUrl && "ID photo", !customer.address && "residential address"].filter(Boolean);
  return <>
    {missing.length > 0 && <div className="drill-warning" role="status"><span>Missing: {missing.join(", ")}.</span><button type="button" className="text-action" onClick={() => setEditing(true)}>Add now</button></div>}
    <div className="drill-actions"><button type="button" className="button button-quiet" onClick={() => setEditing(true)}>Edit details</button><a className="button button-quiet" href={`tel:${customer.phone.replace(/\s+/g, "")}`}>Call</a>{whatsappDigits(customer.phone) && <a className="button button-quiet" href={`https://wa.me/${whatsappDigits(customer.phone)}`} target="_blank" rel="noreferrer">WhatsApp</a>}</div>
    {editing && <CustomerDialog customer={customer} onClose={() => setEditing(false)} />}
    <Facts items={[["Phone", <a key="p" href={`tel:${customer.phone.replace(/\s+/g, "")}`}>{customer.phone}</a>], ["Email", customer.email ? <a key="e" href={`mailto:${customer.email}`}>{customer.email}</a> : undefined], ["Driver licence", customer.licence], ["ID number", customer.idNumber], ["Address", customer.address], ["Next of kin", [customer.nextOfKinName, customer.nextOfKinPhone].filter(Boolean).join(" · ")], ["Customer since", longDate(customer.createdAt)]]} />
    <div className="drill-docs"><DocumentThumb src={customer.idPhotoDataUrl} label="ID document" /><DocumentThumb src={customer.licencePhotoDataUrl} label="Driver’s licence" /></div>
    <Stats items={[["Bookings", String(own.length)], ["Total billed", formatMoney(billed)], ["Unpaid", formatMoney(unpaid)]]} />
    <Section title="Bookings" count={own.length}><BookingRows bookings={own.slice(0, 10)} /></Section>
    <Section title="Inspections" count={inspections.filter((item) => item.customerId === id).length}><InspectionRows ids={inspections.filter((item) => item.customerId === id).slice(0, 6).map((item) => item.id)} /></Section>
  </>;
}

function BookingDetail({ id }: { id: string }) {
  const { bookings, customers, vehicles, inspections, company } = useRentalData();
  const booking = bookings.find((item) => item.id === id);
  if (!booking) return <Empty>This booking has been removed.</Empty>;
  const customer = customers.find((item) => item.id === booking.customerId);
  const vehicle = vehicles.find((item) => item.id === booking.vehicleId);
  const own = inspections.filter((item) => item.bookingId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const pickup = [...own].reverse().find((item) => item.stage === "Pickup");
  const returned = [...own].reverse().find((item) => item.stage === "Return");
  const days = nightsBetween(booking.startDate, booking.endDate);
  return <>
    <div className="drill-hero-tags"><span className={statusClass(booking.status)}>{booking.status}</span><span className={`status-pill ${booking.paymentStatus === "Paid" ? "status-available" : "status-active"}`}>{booking.paymentStatus === "Paid" ? "Paid" : "Payment due"}</span></div>
    <div className="drill-parties">
      <div><span>CUSTOMER</span><DrillLink kind="customer" id={customer?.id}><strong>{customer?.name ?? "Customer removed"}</strong></DrillLink><small>{customer?.phone}</small></div>
      <div><span>VEHICLE</span><DrillLink kind="vehicle" id={vehicle?.id}><strong>{vehicle ? `${vehicle.make} ${vehicle.model}` : "Vehicle removed"}</strong></DrillLink><small>{vehicle?.registration}</small></div>
    </div>
    <Stats items={[["Rental", formatMoney(booking.total)], ["Excess mileage", formatMoney(booking.excessMileageCharge ?? 0)], ["Total", formatMoney(booking.total + (booking.excessMileageCharge ?? 0))], ["Deposit", `${formatMoney(booking.depositAmount ?? 0)}${booking.depositStatus && booking.depositStatus !== "None" ? ` · ${booking.depositStatus}` : ""}`]]} />
    <Facts items={[["Dates", `${longDate(booking.startDate)} – ${longDate(booking.endDate)} · ${days} ${days === 1 ? "day" : "days"}`], ["Pickup", booking.checkoutOdometer !== undefined ? `${booking.checkoutOdometer.toLocaleString()} km · ${booking.checkoutFuel ?? 0}% fuel` : undefined], ["Pickup note", booking.checkoutNote], ["Return", booking.returnOdometer !== undefined ? `${booking.returnOdometer.toLocaleString()} km · ${booking.returnFuel ?? 0}% fuel` : undefined], ["Return note", booking.returnNote], ["Distance", booking.distanceKm !== undefined ? `${booking.distanceKm.toLocaleString()} km (${(booking.includedMileageKm ?? 0).toLocaleString()} km included)` : undefined], ["Note", booking.note]]} />
    <div className="drill-actions">{pickup && <button type="button" className="button button-primary" onClick={() => exportRentalContract({ booking, customer, vehicle, company, pickup })}>Export contract</button>}{pickup && <button type="button" className="button button-quiet" onClick={() => exportVehicleChecklist({ booking, customer, vehicle, company, out: pickup, in: returned })}>Export checklist{returned ? " (out & in)" : ""}</button>}<Link className="button button-quiet" href="/billing">Open billing</Link></div>
    <Section title="Inspections" count={own.length}>{own.length ? own.map((item) => <div className="drill-inspection" key={item.id}><div className="drill-inspection-head"><strong>{item.stage ?? "Inspection"} · {longDate(item.inspectionDate)}</strong><DrillLink kind="inspection" id={item.id}>Full details ›</DrillLink></div><InspectionPhotoGallery photos={item.photos} compact /></div>) : <Empty>No pickup or return inspection yet.</Empty>}</Section>
  </>;
}

function InspectionDetail({ id }: { id: string }) {
  const { inspections, customers, vehicles, bookings, company } = useRentalData();
  const item = inspections.find((record) => record.id === id);
  if (!item) return <Empty>This inspection is no longer available.</Empty>;
  const customer = customers.find((record) => record.id === item.customerId);
  const vehicle = vehicles.find((record) => record.id === item.vehicleId);
  const booking = bookings.find((record) => record.id === item.bookingId);
  const issues = checklistRows(item.checklist).filter((entry) => item.checklist?.[entry.key] === "attention");
  return <>
    <div className="drill-parties">
      <div><span>CUSTOMER</span><DrillLink kind="customer" id={customer?.id}><strong>{customer?.name ?? "Customer removed"}</strong></DrillLink></div>
      <div><span>VEHICLE</span><DrillLink kind="vehicle" id={vehicle?.id}><strong>{vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.registration}` : "Vehicle removed"}</strong></DrillLink></div>
      {booking && <div><span>BOOKING</span><DrillLink kind="booking" id={booking.id}><strong>{booking.reference}</strong></DrillLink></div>}
    </div>
    <Facts items={[["Date", longDate(item.inspectionDate)], ["Odometer", `${item.odometerKm.toLocaleString()} km`], ["Fuel", `${item.fuelPercent}%`], ["Condition", item.condition], ["Checklist issues", issues.length ? issues.map((entry) => entry.label).join(", ") : "None"], ["Notes", item.notes]]} />
    <InspectionPhotoGallery photos={item.photos} />
    {(item.signatureDataUrl || item.repSignatureDataUrl) && <div className="inspection-signatures">{item.signatureDataUrl && <div className="inspection-saved-signature"><span>CLIENT · {item.signatoryName || "CLIENT"}</span><Image src={item.signatureDataUrl} alt="Client signature" width={320} height={80} unoptimized /></div>}{item.repSignatureDataUrl && <div className="inspection-saved-signature"><span>{(company.name || "Classic Rides").toUpperCase()} · {item.repName || "REPRESENTATIVE"}</span><Image src={item.repSignatureDataUrl} alt="Representative signature" width={320} height={80} unoptimized /></div>}</div>}
  </>;
}

function useTitle(target: DrillTarget) {
  const { vehicles, customers, bookings, inspections } = useRentalData();
  if (target.kind === "custom") return { title: target.title, eyebrow: target.eyebrow ?? "DETAILS" };
  if (target.kind === "vehicle") { const v = vehicles.find((item) => item.id === target.id); return { title: v ? `${v.make} ${v.model}` : "Vehicle", eyebrow: "VEHICLE" }; }
  if (target.kind === "customer") return { title: customers.find((item) => item.id === target.id)?.name ?? "Customer", eyebrow: "CUSTOMER" };
  if (target.kind === "booking") return { title: bookings.find((item) => item.id === target.id)?.reference ?? "Booking", eyebrow: "BOOKING" };
  const inspection = inspections.find((item) => item.id === target.id);
  return { title: inspection ? `${inspection.stage ?? "Vehicle"} inspection` : "Inspection", eyebrow: "INSPECTION" };
}

function DrillDialog({ stack, onBack, onClose }: { stack: DrillTarget[]; onBack: () => void; onClose: () => void }) {
  const target = stack[stack.length - 1];
  const { title, eyebrow } = useTitle(target);
  return <WorkspaceDialog key={stack.length} title={title} eyebrow={eyebrow} className="drill-modal" onClose={onClose}>
    {stack.length > 1 && <button type="button" className="drill-back" onClick={onBack}>← Back</button>}
    <div className="drill-body">
      {target.kind === "vehicle" && <VehicleDetail id={target.id} />}
      {target.kind === "customer" && <CustomerDetail id={target.id} />}
      {target.kind === "booking" && <BookingDetail id={target.id} />}
      {target.kind === "inspection" && <InspectionDetail id={target.id} />}
      {target.kind === "custom" && target.content}
    </div>
  </WorkspaceDialog>;
}

export function DrilldownProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<DrillTarget[]>([]);
  const open = useCallback((target: DrillTarget) => setStack((current) => [...current, target].slice(-8)), []);
  const value = useMemo(() => ({ open }), [open]);
  return <Context.Provider value={value}>{children}{stack.length > 0 && <DrillDialog stack={stack} onBack={() => setStack((current) => current.slice(0, -1))} onClose={() => setStack([])} />}</Context.Provider>;
}
