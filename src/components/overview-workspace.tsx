"use client";

import Link from "next/link";
import { AppShell, NavIcon, PageTopbar } from "@/components/app-shell";
import { formatMoney, useRentalData } from "@/lib/rental-data";
import { BookingRows, CustomerRows, DrillLink, VehicleRows, useDrilldown } from "@/components/drilldown";

const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: "Africa/Harare" }).format(new Date());
const quickLinks = [
  { title: "Add a vehicle", detail: "Grow your fleet", icon: "fleet", href: "/fleet" },
  { title: "Create a booking", detail: "Reserve a vehicle", icon: "bookings", href: "/bookings" },
  { title: "Add a customer", detail: "Keep renter details", icon: "customers", href: "/customers" },
];

export function OverviewWorkspace() {
  const { vehicles, bookings, customers, maintenance, ready } = useRentalData();
  const { open } = useDrilldown();
  const openBookings = bookings.filter((booking) => ["Confirmed", "Active"].includes(booking.status));
  const upcoming = [...openBookings].sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 4);
  const openJobs = maintenance.filter((job) => job.status !== "Completed");
  const plural = (count: number, one: string, many: string) => count === 1 ? one : many;
  const statCards = [
    { label: "FLEET", icon: "fleet", iconClass: "fleet-icon", count: vehicles.length, unit: plural(vehicles.length, "vehicle", "vehicles"), href: "/fleet", linkLabel: "Manage fleet",
      open: () => open({ kind: "custom", title: "Fleet", eyebrow: `${vehicles.filter((vehicle) => vehicle.status === "Available").length} OF ${vehicles.length} AVAILABLE`, content: <VehicleRows vehicles={vehicles} /> }) },
    { label: "UPCOMING & ACTIVE", icon: "bookings", iconClass: "booking-icon", count: openBookings.length, unit: plural(openBookings.length, "booking", "bookings"), href: "/bookings", linkLabel: "View bookings",
      open: () => open({ kind: "custom", title: "Upcoming & active bookings", eyebrow: `${openBookings.filter((booking) => booking.status === "Active").length} ON RENT · ${openBookings.filter((booking) => booking.status === "Confirmed").length} UPCOMING`, content: <BookingRows bookings={[...openBookings].sort((a, b) => a.startDate.localeCompare(b.startDate))} /> }) },
    { label: "CUSTOMERS", icon: "customers", iconClass: "customer-icon", count: customers.length, unit: plural(customers.length, "customer", "customers"), href: "/customers", linkLabel: "View customers",
      open: () => open({ kind: "custom", title: "Customers", eyebrow: `${customers.length} ${plural(customers.length, "CUSTOMER", "CUSTOMERS")}`, content: <CustomerRows customers={[...customers].sort((a, b) => a.name.localeCompare(b.name))} /> }) },
    { label: "SERVICE TO DO", icon: "maintenance", iconClass: "progress-icon", count: openJobs.length, unit: plural(openJobs.length, "job", "jobs"), href: "/maintenance", linkLabel: "Open maintenance",
      open: () => open({ kind: "custom", title: "Service to do", eyebrow: `${openJobs.length} OPEN ${plural(openJobs.length, "JOB", "JOBS")}`, content: openJobs.length ? <ul className="drill-list">{[...openJobs].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((job) => { const vehicle = vehicles.find((item) => item.id === job.vehicleId); return <li key={job.id}><span><strong>{job.title}</strong><small>Due {new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Harare" }).format(new Date(`${job.dueDate}T12:00:00`))} · {job.status} · <DrillLink kind="vehicle" id={vehicle?.id}>{vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.registration}` : "Vehicle removed"}</DrillLink></small></span><span>{formatMoney(job.cost)}</span></li>; })}</ul> : <p className="drill-empty">No open service jobs.</p> }) },
  ];
  const setupSteps = [
    { label: "Add your first vehicle", href: "/fleet", complete: vehicles.length > 0 },
    { label: "Save a customer", href: "/customers", complete: customers.length > 0 },
    { label: "Create a booking", href: "/bookings", complete: bookings.length > 0 },
  ];
  const completedSteps = setupSteps.filter((step) => step.complete).length;

  return <AppShell active="Overview">
    <PageTopbar title="Overview" />
    <main className="page-wrap overview-wrap">
      <section className="welcome-row">
        <div><p className="eyebrow">{today.toUpperCase()} · HARARE</p><h1>Good morning<span className="heading-period">.</span></h1><p className="welcome-subtitle">Here’s what’s happening with your rental operation.</p></div>
        <Link className="button button-primary" href="/bookings"><span aria-hidden="true">＋</span> New booking</Link>
      </section>

      {!ready ? <div className="loading-state"><span className="loading-spinner" />Loading workspace…</div> : <>
        {completedSteps < setupSteps.length && <section className="setup-card">
          <div className="setup-card-heading"><div><p className="eyebrow">GET STARTED</p><h2>Set up your rental workspace</h2><p>Complete a few basics to start taking bookings.</p></div><span className="setup-count">{completedSteps} of {setupSteps.length}</span></div>
          <div className="setup-progress"><span style={{ width: `${(completedSteps / setupSteps.length) * 100}%` }} /></div>
          <div className="setup-steps">{setupSteps.map((step) => <Link className={`setup-step${step.complete ? " is-complete" : ""}`} href={step.href} key={step.label}><span className="step-check">{step.complete ? "✓" : ""}</span><span>{step.label}</span><span className="step-arrow">{step.complete ? "Done" : "→"}</span></Link>)}</div>
        </section>}

        <section className="stats-grid overview-stats" aria-label="Workspace totals">
          {statCards.map((card) => <article className="stat-card is-drillable" key={card.label}>
            <button type="button" className="stat-drill" onClick={card.open} aria-label={`${card.label}: ${card.count} ${card.unit}. Show list`}>
              <span className="stat-top"><span className="stat-label">{card.label}</span><span className={`stat-icon ${card.iconClass}`}><NavIcon name={card.icon} /></span></span>
              <span className="stat-number">{card.count} <span>{card.unit}</span></span>
              <span className="stat-drill-hint" aria-hidden="true">Tap to view ›</span>
            </button>
            <Link className="stat-link" href={card.href}>{card.linkLabel} →</Link>
          </article>)}
        </section>

        <section className="content-grid overview-content-grid">
          <article className="panel activity-panel"><div className="panel-heading"><div><p className="eyebrow">NEXT UP</p><h2>Upcoming bookings</h2></div><Link className="quiet-button quiet-link" href="/bookings">All bookings →</Link></div>
            {upcoming.length === 0 ? <div className="activity-empty"><div className="calendar-art" aria-hidden="true"><span className="cal-binding" /><span className="cal-lines" /><span className="cal-sun">✳</span></div><strong>No upcoming rentals</strong><p>Confirmed bookings and active rentals will show here.</p><Link href="/bookings" className="text-link">Create a booking <span aria-hidden="true">→</span></Link></div> : <div className="upcoming-list">{upcoming.map((booking) => {
              const customer = customers.find((item) => item.id === booking.customerId); const vehicle = vehicles.find((item) => item.id === booking.vehicleId);
              return <button type="button" onClick={() => open({ kind: "booking", id: booking.id })} className="upcoming-row" key={booking.id}><span className="upcoming-date"><strong>{new Intl.DateTimeFormat("en", { day: "2-digit", timeZone: "Africa/Harare" }).format(new Date(`${booking.startDate}T12:00:00`))}</strong><small>{new Intl.DateTimeFormat("en", { month: "short", timeZone: "Africa/Harare" }).format(new Date(`${booking.startDate}T12:00:00`))}</small></span><span className="upcoming-details"><strong>{customer?.name ?? "Customer"}</strong><small>{vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.registration}` : "Vehicle"}</small></span><span className="upcoming-end"><span className={`status-pill status-${booking.status.toLowerCase()}`}>{booking.status}</span><small>{formatMoney(booking.total)}</small></span></button>;
            })}</div>}
          </article>
          <article className="panel quick-panel"><div className="panel-heading"><div><p className="eyebrow">SHORTCUTS</p><h2>Quick actions</h2></div></div><div className="quick-list">{quickLinks.map((item) => <Link className="quick-action" key={item.title} href={item.href}><span className="quick-icon" aria-hidden="true"><NavIcon name={item.icon} /></span><span className="quick-copy"><strong>{item.title}</strong><small>{item.detail}</small></span><span className="quick-arrow" aria-hidden="true">↗</span></Link>)}</div><Link className="reports-shortcut" href="/reports"><span><strong>View reports</strong><small>Track rental performance</small></span><span aria-hidden="true">→</span></Link></article>
        </section>
        <footer className="page-footer"><span>CLASSIC RIDES</span><span>Built for the way you move.</span><a href="mailto:sales@classicrides.online,classicride23@gmail.com">Contact ↗</a></footer>
      </>}
    </main>
  </AppShell>;
}
