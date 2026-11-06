"use client";

import Link from "next/link";
import { AppShell, NavIcon, PageTopbar } from "@/components/app-shell";
import { formatMoney, useRentalData } from "@/lib/rental-data";
import { useDrilldown } from "@/components/drilldown";

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
          <article className="stat-card"><div className="stat-top"><span className="stat-label">FLEET</span><span className="stat-icon fleet-icon"><NavIcon name="fleet" /></span></div><div className="stat-number">{vehicles.length} <span>{vehicles.length === 1 ? "vehicle" : "vehicles"}</span></div><Link className="stat-link" href="/fleet">Manage fleet →</Link></article>
          <article className="stat-card"><div className="stat-top"><span className="stat-label">UPCOMING & ACTIVE</span><span className="stat-icon booking-icon"><NavIcon name="bookings" /></span></div><div className="stat-number">{openBookings.length} <span>{openBookings.length === 1 ? "booking" : "bookings"}</span></div><Link className="stat-link" href="/bookings">View bookings →</Link></article>
          <article className="stat-card"><div className="stat-top"><span className="stat-label">CUSTOMERS</span><span className="stat-icon customer-icon"><NavIcon name="customers" /></span></div><div className="stat-number">{customers.length} <span>{customers.length === 1 ? "customer" : "customers"}</span></div><Link className="stat-link" href="/customers">View customers →</Link></article>
          <article className="stat-card"><div className="stat-top"><span className="stat-label">SERVICE TO DO</span><span className="stat-icon progress-icon"><NavIcon name="maintenance" /></span></div><div className="stat-number">{openJobs.length} <span>{openJobs.length === 1 ? "job" : "jobs"}</span></div><Link className="stat-link" href="/maintenance">Open maintenance →</Link></article>
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
        <footer className="page-footer"><span>CLASSIC RIDES</span><span>Built for the way you move.</span><a href="mailto:sales@classicrides.online">Contact ↗</a></footer>
      </>}
    </main>
  </AppShell>;
}
