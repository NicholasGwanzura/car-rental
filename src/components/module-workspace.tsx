"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { AppShell, PageTopbar } from "@/components/app-shell";
import { BillingWorkspace } from "@/components/billing-workspace";
import { CompanySettingsWorkspace } from "@/components/company-settings-workspace";
import { formatMoney, nightsBetween, useRentalData, type Booking, type Customer, type MaintenanceJob, type Vehicle } from "@/lib/rental-data";

const pageCopy: Record<string, { title: string; summary: string; action?: string }> = {
  bookings: { title: "Bookings", summary: "Plan pickups, manage active rentals, and keep every reservation moving.", action: "New booking" },
  fleet: { title: "Fleet", summary: "Keep vehicle details, rates, and readiness up to date.", action: "Add vehicle" },
  customers: { title: "Customers", summary: "Keep renter contact and licence details ready for their next trip.", action: "Add customer" },
  maintenance: { title: "Maintenance", summary: "Schedule service and keep vehicles safe and road-ready.", action: "Schedule service" },
  reports: { title: "Reports", summary: "A clear view of bookings, revenue, and how your fleet is being used." },
  billing: { title: "Billing", summary: "Review rental charges, record payment status, and prepare customer invoices." },
  settings: { title: "Company settings", summary: "Manage business details that appear on customer invoices." },
};

function dateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function dateLabel(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Harare" }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function vehicleName(vehicle?: Vehicle) { return vehicle ? `${vehicle.make} ${vehicle.model}` : "Vehicle removed"; }
function customerName(customer?: Customer) { return customer?.name ?? "Customer removed"; }
function slug(value: string) { return value.toLowerCase().replaceAll(" ", "-"); }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" tabIndex={-1} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="form-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-heading"><div><p className="eyebrow">WORKSPACE</p><h2 id="modal-title">{title}</h2></div><button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">×</button></div>
      {children}
    </section>
  </div>;
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`form-field${wide ? " form-field-wide" : ""}`}><span>{label}</span>{children}</label>;
}

function DialogActions({ onCancel, submit = "Save" }: { onCancel: () => void; submit?: string }) {
  return <div className="form-actions"><button className="button button-quiet" type="button" onClick={onCancel}>Cancel</button><button className="button button-primary" type="submit">{submit}</button></div>;
}

function EmptyState({ icon = "＋", title, detail, action }: { icon?: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="data-empty"><span className="data-empty-icon" aria-hidden="true">{icon}</span><h2>{title}</h2><p>{detail}</p>{action}</div>;
}

function TableFrame({ children }: { children: ReactNode }) { return <div className="data-table-wrap"><table className="data-table">{children}</table></div>; }

function FleetWorkspace() {
  const { vehicles, bookings, addVehicle, ready } = useRentalData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(false);
  const filtered = vehicles.filter((vehicle) => `${vehicle.registration} ${vehicle.make} ${vehicle.model}`.toLowerCase().includes(query.toLowerCase()));
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    addVehicle({ registration: String(form.get("registration")).trim().toUpperCase(), make: String(form.get("make")).trim(), model: String(form.get("model")).trim(), year: Number(form.get("year")), dailyRate: Number(form.get("dailyRate")), transmission: String(form.get("transmission")), status: "Available" });
    setOpen(false); setSaved(true); window.setTimeout(() => setSaved(false), 3000);
  }
  if (!ready) return <LoadingState />;
  return <>
    {saved && <div className="inline-notice" role="status">Vehicle added to your fleet.</div>}
    <div className="list-toolbar"><label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search registration or model" aria-label="Search fleet" /></label><span className="result-count">{vehicles.length} {vehicles.length === 1 ? "vehicle" : "vehicles"}</span></div>
    {vehicles.length === 0 ? <EmptyState icon="▰" title="Your fleet starts here" detail="Add a vehicle to set its day rate and begin managing availability." action={<button className="button button-primary" onClick={() => setOpen(true)}>＋ Add your first vehicle</button>} /> : filtered.length === 0 ? <EmptyState icon="⌕" title="No matches" detail="Try a different registration, make, or model." /> : <TableFrame><thead><tr><th>VEHICLE</th><th>REGISTRATION</th><th>DAY RATE</th><th>STATUS</th><th>BOOKINGS</th></tr></thead><tbody>{filtered.map((vehicle) => {
      const activeBookings = bookings.filter((booking) => booking.vehicleId === vehicle.id && ["Confirmed", "Active"].includes(booking.status)).length;
      return <tr key={vehicle.id}><td><div className="table-primary">{vehicle.make} {vehicle.model}</div><div className="table-secondary">{vehicle.year} · {vehicle.transmission}</div></td><td><span className="registration-tag">{vehicle.registration}</span></td><td>{formatMoney(vehicle.dailyRate)} <span className="table-secondary">/ day</span></td><td><span className="status-pill status-available">{vehicle.status}</span></td><td>{activeBookings}</td></tr>;
    })}</tbody></TableFrame>}
    {open && <Modal title="Add a vehicle" onClose={() => setOpen(false)}><form className="form-grid" onSubmit={save}>
      <Field label="Registration"><input name="registration" placeholder="e.g. AAZ 1234" required maxLength={16} /></Field>
      <Field label="Make"><input name="make" placeholder="Toyota" required /></Field>
      <Field label="Model"><input name="model" placeholder="Corolla Cross" required /></Field>
      <Field label="Year"><input name="year" type="number" min="1980" max="2035" defaultValue={new Date().getFullYear()} required /></Field>
      <Field label="Transmission"><select name="transmission" defaultValue="Automatic"><option>Automatic</option><option>Manual</option></select></Field>
      <Field label="Day rate (USD)"><input name="dailyRate" type="number" min="1" step="1" placeholder="65" required /></Field>
      <p className="form-hint form-field-wide">You can update vehicle availability any time from its booking activity.</p>
      <div className="form-field-wide"><DialogActions onCancel={() => setOpen(false)} submit="Add vehicle" /></div>
    </form></Modal>}
  </>;
}

function CustomerWorkspace() {
  const { customers, addCustomer, bookings, ready } = useRentalData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(query.toLowerCase()));
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    addCustomer({ name: String(form.get("name")).trim(), phone: String(form.get("phone")).trim(), email: String(form.get("email")).trim(), licence: String(form.get("licence")).trim() }); setOpen(false);
  }
  if (!ready) return <LoadingState />;
  return <>
    <div className="list-toolbar"><label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers" aria-label="Search customers" /></label><span className="result-count">{customers.length} {customers.length === 1 ? "customer" : "customers"}</span></div>
    {customers.length === 0 ? <EmptyState icon="♙" title="No customers yet" detail="Save renter contact details once, then select them when you create a booking." action={<button className="button button-primary" onClick={() => setOpen(true)}>＋ Add a customer</button>} /> : filtered.length === 0 ? <EmptyState icon="⌕" title="No matches" detail="Try a different name, phone, or email." /> : <TableFrame><thead><tr><th>CUSTOMER</th><th>PHONE</th><th>DRIVER LICENCE</th><th>BOOKINGS</th><th>ADDED</th></tr></thead><tbody>{filtered.map((customer) => <tr key={customer.id}><td><div className="table-primary">{customer.name}</div><div className="table-secondary">{customer.email || "No email added"}</div></td><td>{customer.phone}</td><td>{customer.licence || <span className="table-secondary">Not recorded</span>}</td><td>{bookings.filter((booking) => booking.customerId === customer.id).length}</td><td>{dateLabel(customer.createdAt.slice(0, 10))}</td></tr>)}</tbody></TableFrame>}
    {open && <Modal title="Add a customer" onClose={() => setOpen(false)}><form className="form-grid" onSubmit={save}>
      <Field label="Full name" wide><input name="name" placeholder="Customer name" autoComplete="name" required /></Field>
      <Field label="Phone"><input name="phone" type="tel" placeholder="+263 77 000 0000" autoComplete="tel" required /></Field>
      <Field label="Email (optional)"><input name="email" type="email" placeholder="name@example.com" autoComplete="email" /></Field>
      <Field label="Driver licence (optional)" wide><input name="licence" placeholder="Licence number" /></Field>
      <div className="form-field-wide"><DialogActions onCancel={() => setOpen(false)} submit="Save customer" /></div>
    </form></Modal>}
  </>;
}

function BookingLifecycleDialog({ booking, action, onClose }: { booking: Booking; action: "checkout" | "return"; onClose: () => void }) {
  const { updateBooking } = useRentalData();
  const isCheckout = action === "checkout";
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const odometer = Number(form.get("odometer")); const fuel = Number(form.get("fuel"));
    updateBooking(booking.id, isCheckout ? { status: "Active", checkoutOdometer: odometer, checkoutFuel: fuel } : { status: "Completed", returnOdometer: odometer, returnFuel: fuel }); onClose();
  }
  return <Modal title={isCheckout ? "Vehicle handover" : "Complete return"} onClose={onClose}>
    <p className="modal-description">{isCheckout ? "Record the vehicle condition at pickup to start this rental." : "Record the return readings to close out this rental."}</p>
    <form className="form-grid" onSubmit={save}>
      <Field label="Odometer (km)"><input name="odometer" type="number" min="0" defaultValue={isCheckout ? 0 : booking.checkoutOdometer ?? 0} required /></Field>
      <Field label="Fuel level"><select name="fuel" defaultValue="100"><option value="100">Full</option><option value="75">¾ tank</option><option value="50">½ tank</option><option value="25">¼ tank</option><option value="0">Empty</option></select></Field>
      <Field label="Handover note (optional)" wide><textarea name="note" rows={2} placeholder="Note existing marks or customer comments" /></Field>
      <div className="form-field-wide"><DialogActions onCancel={onClose} submit={isCheckout ? "Start rental" : "Complete return"} /></div>
    </form>
  </Modal>;
}

function BookingsWorkspace() {
  const { bookings, customers, vehicles, addBooking, updateBooking, ready } = useRentalData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All bookings");
  const [flow, setFlow] = useState<{ booking: Booking; action: "checkout" | "return" } | null>(null);
  const [error, setError] = useState("");
  const tomorrow = dateInputValue(new Date(Date.now() + 86_400_000));
  const filtered = bookings.filter((booking) => {
    const search = `${booking.reference} ${customerName(customers.find((c) => c.id === booking.customerId))} ${vehicleName(vehicles.find((v) => v.id === booking.vehicleId))}`.toLowerCase();
    return (filter === "All bookings" || booking.status === filter) && search.includes(query.toLowerCase());
  });
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); const form = new FormData(event.currentTarget);
    const customerId = String(form.get("customerId")); const vehicleId = String(form.get("vehicleId")); const startDate = String(form.get("startDate")); const endDate = String(form.get("endDate"));
    if (endDate <= startDate) { setError("Choose a return date after the pickup date."); return; }
    const overlaps = bookings.some((booking) => booking.vehicleId === vehicleId && ["Confirmed", "Active"].includes(booking.status) && startDate < booking.endDate && endDate > booking.startDate);
    if (overlaps) { setError("This vehicle already has a booking for part of those dates."); return; }
    const vehicle = vehicles.find((item) => item.id === vehicleId); if (!vehicle) return;
    addBooking({ customerId, vehicleId, startDate, endDate, total: vehicle.dailyRate * nightsBetween(startDate, endDate), note: String(form.get("note")).trim() }); setOpen(false);
  }
  if (!ready) return <LoadingState />;
  return <>
    <div className="list-toolbar booking-toolbar"><label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bookings" aria-label="Search bookings" /></label><select className="filter-select" aria-label="Filter booking status" value={filter} onChange={(event) => setFilter(event.target.value)}><option>All bookings</option><option>Confirmed</option><option>Active</option><option>Completed</option><option>Cancelled</option></select><span className="result-count">{filtered.length} {filtered.length === 1 ? "booking" : "bookings"}</span></div>
    {bookings.length === 0 ? <EmptyState icon="▤" title="Your first booking is a few steps away" detail="Add a vehicle and a customer, then create a booking with pickup and return dates." action={<div className="empty-actions"><Link href="/fleet" className="button button-quiet">Add vehicle</Link><Link href="/customers" className="button button-quiet">Add customer</Link><button className="button button-primary" onClick={() => setOpen(true)}>＋ New booking</button></div>} /> : filtered.length === 0 ? <EmptyState icon="⌕" title="No bookings found" detail="Change the status filter or search by booking reference." /> : <TableFrame><thead><tr><th>BOOKING</th><th>CUSTOMER</th><th>VEHICLE</th><th>DATES</th><th>TOTAL</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{filtered.map((booking) => <tr key={booking.id}><td><span className="table-primary">{booking.reference}</span></td><td>{customerName(customers.find((item) => item.id === booking.customerId))}</td><td>{vehicleName(vehicles.find((item) => item.id === booking.vehicleId))}</td><td><span>{dateLabel(booking.startDate)}</span><div className="table-secondary">to {dateLabel(booking.endDate)}</div></td><td>{formatMoney(booking.total)}</td><td><span className={`status-pill status-${slug(booking.status)}`}>{booking.status}</span></td><td><div className="row-actions">{booking.status === "Confirmed" && <button className="text-action" onClick={() => setFlow({ booking, action: "checkout" })}>Start rental</button>}{booking.status === "Active" && <button className="text-action" onClick={() => setFlow({ booking, action: "return" })}>Return vehicle</button>}{booking.status === "Confirmed" && <button className="text-action text-action-muted" onClick={() => updateBooking(booking.id, { status: "Cancelled" })}>Cancel</button>}</div></td></tr>)}</tbody></TableFrame>}
    {open && <Modal title="Create a booking" onClose={() => { setOpen(false); setError(""); }}>
      {customers.length === 0 || vehicles.length === 0 ? <div className="setup-needed"><p>Add a renter and an available vehicle before creating a booking.</p><div className="empty-actions">{vehicles.length === 0 && <Link className="button button-quiet" href="/fleet">Add vehicle</Link>}{customers.length === 0 && <Link className="button button-quiet" href="/customers">Add customer</Link>}</div></div> : <form className="form-grid" onSubmit={save}>
        <Field label="Customer" wide><select name="customerId" required defaultValue=""><option value="" disabled>Choose a customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}</select></Field>
        <Field label="Vehicle" wide><select name="vehicleId" required defaultValue=""><option value="" disabled>Choose a vehicle</option>{vehicles.filter((vehicle) => vehicle.status === "Available").map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration} · {vehicle.make} {vehicle.model} · {formatMoney(vehicle.dailyRate)}/day</option>)}</select></Field>
        <Field label="Pickup date"><input name="startDate" type="date" min={dateInputValue(new Date())} defaultValue={tomorrow} required /></Field>
        <Field label="Return date"><input name="endDate" type="date" min={tomorrow} defaultValue={dateInputValue(new Date(Date.now() + 2 * 86_400_000))} required /></Field>
        <Field label="Booking note (optional)" wide><textarea name="note" rows={2} placeholder="Pickup location or special request" /></Field>
        {error && <p className="form-error form-field-wide" role="alert">{error}</p>}
        <p className="form-hint form-field-wide">The booking total is calculated from the selected vehicle’s day rate and rental duration.</p>
        <div className="form-field-wide"><DialogActions onCancel={() => setOpen(false)} submit="Confirm booking" /></div>
      </form>}
    </Modal>}
    {flow && <BookingLifecycleDialog booking={flow.booking} action={flow.action} onClose={() => setFlow(null)} />}
  </>;
}

function MaintenanceWorkspace() {
  const { vehicles, maintenance, addMaintenance, updateMaintenance, ready } = useRentalData();
  const [open, setOpen] = useState(false);
  const activeJobs = maintenance.filter((job) => job.status !== "Completed");
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    addMaintenance({ vehicleId: String(form.get("vehicleId")), title: String(form.get("title")).trim(), dueDate: String(form.get("dueDate")), cost: Number(form.get("cost") || 0), status: "Scheduled", note: String(form.get("note")).trim() }); setOpen(false);
  }
  if (!ready) return <LoadingState />;
  return <>
    <div className="maintenance-summary"><div><span className="eyebrow">OPEN WORK</span><strong>{activeJobs.length}</strong><small>jobs still to complete</small></div><div><span className="eyebrow">FLEET AVAILABLE</span><strong>{vehicles.length}</strong><small>vehicles tracked</small></div><div><span className="eyebrow">COMPLETED</span><strong>{maintenance.length - activeJobs.length}</strong><small>jobs closed</small></div></div>
    {maintenance.length === 0 ? <EmptyState icon="⚙" title="No service jobs scheduled" detail="Record upcoming maintenance to keep each vehicle road-ready." action={<button className="button button-primary" onClick={() => setOpen(true)}>＋ Schedule service</button>} /> : <TableFrame><thead><tr><th>SERVICE</th><th>VEHICLE</th><th>DUE DATE</th><th>ESTIMATED COST</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{maintenance.map((job) => <tr key={job.id}><td><span className="table-primary">{job.title}</span>{job.note && <div className="table-secondary">{job.note}</div>}</td><td>{vehicleName(vehicles.find((item) => item.id === job.vehicleId))}</td><td>{dateLabel(job.dueDate)}</td><td>{job.cost ? formatMoney(job.cost) : "—"}</td><td><span className={`status-pill status-${slug(job.status)}`}>{job.status}</span></td><td>{job.status !== "Completed" && <button className="text-action" onClick={() => updateMaintenance(job.id, { status: job.status === "Scheduled" ? "In progress" : "Completed" })}>{job.status === "Scheduled" ? "Start job" : "Mark complete"}</button>}</td></tr>)}</tbody></TableFrame>}
    {open && <Modal title="Schedule maintenance" onClose={() => setOpen(false)}>{vehicles.length === 0 ? <div className="setup-needed"><p>Add a vehicle before scheduling service.</p><Link className="button button-primary" href="/fleet">Go to fleet</Link></div> : <form className="form-grid" onSubmit={save}>
      <Field label="Vehicle" wide><select name="vehicleId" required defaultValue="">{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration} · {vehicle.make} {vehicle.model}</option>)}</select></Field>
      <Field label="Service"><input name="title" placeholder="Oil change" required /></Field>
      <Field label="Due date"><input name="dueDate" type="date" defaultValue={dateInputValue(new Date(Date.now() + 7 * 86_400_000))} required /></Field>
      <Field label="Estimated cost (USD)"><input name="cost" type="number" min="0" step="1" placeholder="0" /></Field>
      <Field label="Note (optional)" wide><textarea name="note" rows={2} placeholder="Workshop or work details" /></Field>
      <div className="form-field-wide"><DialogActions onCancel={() => setOpen(false)} submit="Schedule job" /></div>
    </form>}</Modal>}
  </>;
}

function ReportsWorkspace() {
  const { bookings, customers, vehicles, maintenance, ready } = useRentalData();
  if (!ready) return <LoadingState />;
  const completed = bookings.filter((booking) => booking.status === "Completed");
  const revenue = completed.reduce((sum, booking) => sum + booking.total, 0);
  const active = bookings.filter((booking) => booking.status === "Active").length;
  const reserved = bookings.filter((booking) => booking.status === "Confirmed").length;
  const openJobs = maintenance.filter((job) => job.status !== "Completed").length;
  const utilization = vehicles.length ? Math.min(100, Math.round(((active + reserved) / vehicles.length) * 100)) : 0;
  function downloadCsv() {
    const rows = [["Reference", "Customer", "Vehicle", "Pickup", "Return", "Status", "Total USD"], ...bookings.map((booking) => [booking.reference, customerName(customers.find((item) => item.id === booking.customerId)), vehicleName(vehicles.find((item) => item.id === booking.vehicleId)), booking.startDate, booking.endDate, booking.status, String(booking.total)])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "spiritus-bookings.csv"; link.click(); URL.revokeObjectURL(url);
  }
  return <>
    <div className="report-actions"><p>Live totals from records in this workspace.</p><button className="button button-quiet" onClick={downloadCsv} disabled={bookings.length === 0}>↓ Export bookings CSV</button></div>
    <section className="report-grid"><article className="report-card"><span className="eyebrow">COMPLETED RENTALS</span><strong>{completed.length}</strong><small>closed bookings</small></article><article className="report-card"><span className="eyebrow">REVENUE RECORDED</span><strong>{formatMoney(revenue)}</strong><small>completed booking totals</small></article><article className="report-card"><span className="eyebrow">FLEET BOOKED</span><strong>{utilization}%</strong><small>{active} active · {reserved} upcoming</small><div className="report-progress"><i style={{ width: `${Math.min(100, utilization)}%` }} /></div></article><article className="report-card"><span className="eyebrow">OPEN MAINTENANCE</span><strong>{openJobs}</strong><small>jobs requiring attention</small></article></section>
    {bookings.length === 0 ? <EmptyState icon="▥" title="Your reports are ready" detail="Once your first booking is created, this view will summarize completed rentals, revenue, and fleet activity." action={<Link className="button button-primary" href="/bookings">Go to bookings</Link>} /> : <section className="panel report-table-panel"><div className="panel-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Latest bookings</h2></div><Link className="text-link" href="/bookings">All bookings →</Link></div><TableFrame><thead><tr><th>REFERENCE</th><th>CUSTOMER</th><th>VEHICLE</th><th>DATES</th><th>STATUS</th><th>TOTAL</th></tr></thead><tbody>{bookings.slice(0, 8).map((booking) => <tr key={booking.id}><td><span className="table-primary">{booking.reference}</span></td><td>{customerName(customers.find((item) => item.id === booking.customerId))}</td><td>{vehicleName(vehicles.find((item) => item.id === booking.vehicleId))}</td><td>{dateLabel(booking.startDate)} – {dateLabel(booking.endDate)}</td><td><span className={`status-pill status-${slug(booking.status)}`}>{booking.status}</span></td><td>{formatMoney(booking.total)}</td></tr>)}</tbody></TableFrame></section>}
  </>;
}

function LoadingState() { return <div className="loading-state"><span className="loading-spinner" />Loading workspace…</div>; }

export function ModuleWorkspace({ module }: { module: string }) {
  const page = pageCopy[module]; const [open, setOpen] = useState(false);
  if (module === "billing") return <BillingWorkspace />;
  if (module === "settings") return <CompanySettingsWorkspace />;
  if (!page) return <AppShell><PageTopbar title="Page not found" /><main className="module-wrap"><h1>Page not found</h1><Link href="/">Return to overview</Link></main></AppShell>;
  const Action = module === "reports" ? null : <button className="button button-primary page-action" onClick={() => setOpen(true)}><span aria-hidden="true">＋</span>{page.action}</button>;
  return <AppShell active={page.title}>
    <PageTopbar title={page.title} />
    <main className="module-wrap">
      <section className="module-page-heading"><div><p className="eyebrow">WORKSPACE</p><h1>{page.title}</h1><p className="module-summary">{page.summary}</p></div>{Action}</section>
      {module === "fleet" && <FleetWorkspace />}
      {module === "customers" && <CustomerWorkspace />}
      {module === "bookings" && <BookingsWorkspace key={open ? "booking-open" : "booking-closed"} />}
      {module === "maintenance" && <MaintenanceWorkspace />}
      {module === "reports" && <ReportsWorkspace />}
    </main>
    {open && module === "bookings" && <BookingModalBridge onClose={() => setOpen(false)} />}
    {open && module === "fleet" && <CreateVehicleBridge onClose={() => setOpen(false)} />}
    {open && module === "customers" && <CreateCustomerBridge onClose={() => setOpen(false)} />}
    {open && module === "maintenance" && <CreateMaintenanceBridge onClose={() => setOpen(false)} />}
  </AppShell>;
}

// Page-level actions open the same forms from the empty state and the toolbar.
function BookingModalBridge({ onClose }: { onClose: () => void }) { return <BookingsCreateOnly onClose={onClose} />; }
function BookingsCreateOnly({ onClose }: { onClose: () => void }) {
  const { customers, vehicles, bookings, addBooking } = useRentalData(); const [error, setError] = useState(""); const tomorrow = dateInputValue(new Date(Date.now() + 86_400_000));
  function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const customerId = String(form.get("customerId")); const vehicleId = String(form.get("vehicleId")); const startDate = String(form.get("startDate")); const endDate = String(form.get("endDate")); if (endDate <= startDate) { setError("Choose a return date after the pickup date."); return; } if (bookings.some((booking) => booking.vehicleId === vehicleId && ["Confirmed", "Active"].includes(booking.status) && startDate < booking.endDate && endDate > booking.startDate)) { setError("This vehicle already has a booking for part of those dates."); return; } const vehicle = vehicles.find((item) => item.id === vehicleId); if (!vehicle) return; addBooking({ customerId, vehicleId, startDate, endDate, total: vehicle.dailyRate * nightsBetween(startDate, endDate), note: String(form.get("note")).trim() }); onClose(); }
  return <Modal title="Create a booking" onClose={onClose}>{customers.length === 0 || vehicles.length === 0 ? <div className="setup-needed"><p>Add a renter and an available vehicle before creating a booking.</p><div className="empty-actions">{vehicles.length === 0 && <Link className="button button-quiet" href="/fleet">Add vehicle</Link>}{customers.length === 0 && <Link className="button button-quiet" href="/customers">Add customer</Link>}</div></div> : <form className="form-grid" onSubmit={save}><Field label="Customer" wide><select name="customerId" defaultValue="" required><option value="" disabled>Choose a customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}</select></Field><Field label="Vehicle" wide><select name="vehicleId" defaultValue="" required><option value="" disabled>Choose a vehicle</option>{vehicles.filter((vehicle) => vehicle.status === "Available").map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration} · {vehicle.make} {vehicle.model} · {formatMoney(vehicle.dailyRate)}/day</option>)}</select></Field><Field label="Pickup date"><input name="startDate" type="date" min={dateInputValue(new Date())} defaultValue={tomorrow} required /></Field><Field label="Return date"><input name="endDate" type="date" min={tomorrow} defaultValue={dateInputValue(new Date(Date.now() + 2 * 86_400_000))} required /></Field><Field label="Booking note (optional)" wide><textarea name="note" rows={2} placeholder="Pickup location or special request" /></Field>{error && <p className="form-error form-field-wide" role="alert">{error}</p>}<p className="form-hint form-field-wide">The total uses the selected vehicle’s day rate and rental duration.</p><div className="form-field-wide"><DialogActions onCancel={onClose} submit="Confirm booking" /></div></form>}</Modal>;
}

function CreateVehicleBridge({ onClose }: { onClose: () => void }) {
  const { addVehicle } = useRentalData(); function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); addVehicle({ registration: String(form.get("registration")).trim().toUpperCase(), make: String(form.get("make")).trim(), model: String(form.get("model")).trim(), year: Number(form.get("year")), dailyRate: Number(form.get("dailyRate")), transmission: String(form.get("transmission")), status: "Available" }); onClose(); }
  return <Modal title="Add a vehicle" onClose={onClose}><form className="form-grid" onSubmit={save}><Field label="Registration"><input name="registration" placeholder="e.g. AAZ 1234" required maxLength={16} /></Field><Field label="Make"><input name="make" placeholder="Toyota" required /></Field><Field label="Model"><input name="model" placeholder="Corolla Cross" required /></Field><Field label="Year"><input name="year" type="number" min="1980" max="2035" defaultValue={new Date().getFullYear()} required /></Field><Field label="Transmission"><select name="transmission" defaultValue="Automatic"><option>Automatic</option><option>Manual</option></select></Field><Field label="Day rate (USD)"><input name="dailyRate" type="number" min="1" placeholder="65" required /></Field><div className="form-field-wide"><DialogActions onCancel={onClose} submit="Add vehicle" /></div></form></Modal>;
}
function CreateCustomerBridge({ onClose }: { onClose: () => void }) {
  const { addCustomer } = useRentalData(); function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); addCustomer({ name: String(form.get("name")).trim(), phone: String(form.get("phone")).trim(), email: String(form.get("email")).trim(), licence: String(form.get("licence")).trim() }); onClose(); }
  return <Modal title="Add a customer" onClose={onClose}><form className="form-grid" onSubmit={save}><Field label="Full name" wide><input name="name" placeholder="Customer name" required /></Field><Field label="Phone"><input name="phone" type="tel" placeholder="+263 77 000 0000" required /></Field><Field label="Email (optional)"><input name="email" type="email" placeholder="name@example.com" /></Field><Field label="Driver licence (optional)" wide><input name="licence" placeholder="Licence number" /></Field><div className="form-field-wide"><DialogActions onCancel={onClose} submit="Save customer" /></div></form></Modal>;
}
function CreateMaintenanceBridge({ onClose }: { onClose: () => void }) {
  const { vehicles, addMaintenance } = useRentalData(); function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); addMaintenance({ vehicleId: String(form.get("vehicleId")), title: String(form.get("title")).trim(), dueDate: String(form.get("dueDate")), cost: Number(form.get("cost") || 0), status: "Scheduled", note: String(form.get("note")).trim() }); onClose(); }
  return <Modal title="Schedule maintenance" onClose={onClose}>{vehicles.length === 0 ? <div className="setup-needed"><p>Add a vehicle before scheduling service.</p><Link className="button button-primary" href="/fleet">Go to fleet</Link></div> : <form className="form-grid" onSubmit={save}><Field label="Vehicle" wide><select name="vehicleId" required>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration} · {vehicle.make} {vehicle.model}</option>)}</select></Field><Field label="Service"><input name="title" placeholder="Oil change" required /></Field><Field label="Due date"><input name="dueDate" type="date" defaultValue={dateInputValue(new Date(Date.now() + 7 * 86_400_000))} required /></Field><Field label="Estimated cost (USD)"><input name="cost" type="number" min="0" placeholder="0" /></Field><Field label="Note (optional)" wide><textarea name="note" rows={2} placeholder="Workshop or work details" /></Field><div className="form-field-wide"><DialogActions onCancel={onClose} submit="Schedule job" /></div></form>}</Modal>;
}

