"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRentalData } from "@/lib/rental-data";

const navigation = [
  { label: "Overview", href: "/", icon: "overview" },
  { label: "Bookings", href: "/bookings", icon: "bookings" },
  { label: "Fleet", href: "/fleet", icon: "fleet" },
  { label: "Customers", href: "/customers", icon: "customers" },
  { label: "Inspections", href: "/inspections", icon: "inspections" },
  { label: "Maintenance", href: "/maintenance", icon: "maintenance" },
  { label: "Reports", href: "/reports", icon: "reports" },
  { label: "Billing", href: "/billing", icon: "billing" },
  { label: "Company settings", href: "/settings", icon: "settings" },
];
const mobilePrimary = navigation.slice(0, 4);
const mobileMore = navigation.slice(4);

export function NavIcon({ name }: { name: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, ReactNode> = {
    overview: <><path d="m3.5 10 8.5-7 8.5 7"/><path d="M5.5 9v10h13V9M9 19v-6h6v6"/></>,
    bookings: <><rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M8 3v4m8-4v4M4 9h16M8 13h3m-3 3h6"/></>,
    fleet: <><path d="m4 13 1.5-5h13l1.5 5v5h-2v-2H6v2H4z"/><path d="M5.5 13h13M7 8l1-3h8l1 3M7.5 13h.01m9 0h.01"/></>,
    customers: <><circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1.5A4.5 4.5 0 0 1 8 13h2a4.5 4.5 0 0 1 4.5 4.5V19zM16 5.5a3 3 0 0 1 0 5.8M17 13h.5a3 3 0 0 1 3 3v3h-3"/></>,
    inspections: <><path d="M8 4.5h8a2 2 0 0 1 2 2V20H6V6.5a2 2 0 0 1 2-2Z"/><path d="M9 4.5V3h6v1.5M9 10h6m-6 3.5h6m-6 3.5h3"/></>,
    maintenance: <><path d="M14 6.5a4 4 0 0 0-5.2 5.2l-5.1 5.1a2 2 0 0 0 2.8 2.8l5.1-5.1A4 4 0 0 0 16.8 9l-2.5 2.5-2.8-2.8z"/><path d="m15 4 5 5"/></>,
    reports: <><path d="M4 19V5m0 14h16"/><path d="m7 15 4-4 3 2 5-6"/><path d="M16 7h3v3"/></>,
    billing: <><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M3.5 9.5h17M7 14h4m2.5 0H17"/></>,
    settings: <><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"/><path d="m19.4 13.5 1.1.8-1.2 2.1-1.3-.5a7.8 7.8 0 0 1-1.5.9l-.2 1.4h-2.5l-.3-1.4a7.8 7.8 0 0 1-1.6 0l-.8 1.2-2.2-1.2.5-1.3a7.8 7.8 0 0 1-.9-1.5l-1.4-.2v-2.5l1.4-.3a7.8 7.8 0 0 1 .1-1.6l-1.2-.8 1.2-2.2 1.3.5a7.8 7.8 0 0 1 1.5-.9l.2-1.4h2.5l.3 1.4a7.8 7.8 0 0 1 1.6.1l.8-1.2 2.2 1.2-.5 1.3a7.8 7.8 0 0 1 .9 1.5l1.4.2v2.5l-1.4.3a7.8 7.8 0 0 1 0 1.6Z"/></>,
  };
  return <svg className="nav-svg" viewBox="0 0 24 24" aria-hidden="true" {...common}>{paths[name] ?? paths.overview}</svg>;
}

function NavLink({ item, active }: { item: (typeof navigation)[number]; active: string }) {
  return <Link key={item.label} className={`nav-item${item.label === active ? " is-active" : ""}`} href={item.href} aria-label={item.label} title={item.label} aria-current={item.label === active ? "page" : undefined}>
    <span className="nav-icon"><NavIcon name={item.icon} /></span><span>{item.label}</span>
  </Link>;
}

export function AppShell({ children, active = "Overview" }: { children: ReactNode; active?: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const mobileNavRef = useRef<HTMLElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreActive = mobileMore.some((item) => item.label === active);

  useEffect(() => {
    if (!moreOpen) return;
    function closeWhenOutside(event: PointerEvent) {
      if (event.target instanceof Node && !mobileNavRef.current?.contains(event.target)) setMoreOpen(false);
    }
    document.addEventListener("pointerdown", closeWhenOutside);
    return () => document.removeEventListener("pointerdown", closeWhenOutside);
  }, [moreOpen]);
  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="Spiritus Rental home">
        <span className="brand-mark">S</span>
        <span className="brand-copy"><strong>spiritus</strong><small>RENTAL OPERATIONS</small></span>
      </Link>
      <div className="workspace-switcher"><span className="workspace-avatar">S</span><span className="workspace-copy"><strong>Your workspace</strong><small>Rental company</small></span><span className="chevron">⌄</span></div>
      <p className="nav-label">WORKSPACE</p>
      <nav className="primary-nav" aria-label="Main navigation">
        {navigation.map((item) => <NavLink key={item.label} item={item} active={active} />)}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><span className="help-icon">?</span><strong>Need a hand?</strong><span>Get help setting up your workspace.</span><a href="mailto:support@spiritusglobal.tech">Contact support <span aria-hidden="true">↗</span></a></div>
      </div>
    </aside>
    <nav ref={mobileNavRef} className="mobile-nav" aria-label="Mobile navigation" onKeyDown={(event) => { if (event.key === "Escape") { setMoreOpen(false); moreButtonRef.current?.focus(); } }}>
      {mobilePrimary.map((item) => <NavLink key={item.label} item={item} active={active} />)}
      <button ref={moreButtonRef} className={`nav-item mobile-more-button${moreActive ? " is-active" : ""}`} type="button" aria-label="More pages" aria-current={moreActive ? "page" : undefined} aria-expanded={moreOpen} aria-controls="mobile-more-menu" aria-haspopup="true" onClick={() => setMoreOpen((value) => !value)}>
        <span className="nav-icon"><svg className="nav-svg" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></span><span>More</span>
      </button>
      <div className="mobile-more-menu" id="mobile-more-menu" hidden={!moreOpen}>{mobileMore.map((item) => <Link key={item.label} className={`mobile-more-item${item.label === active ? " is-active" : ""}`} href={item.href} onClick={() => setMoreOpen(false)}><NavIcon name={item.icon}/><span>{item.label}</span><span className="mobile-menu-arrow" aria-hidden="true">›</span></Link>)}</div>
    </nav>
    <main className="main-content">{children}</main>
  </div>;
}

export function PageTopbar({ title }: { title: string }) {
  const { logout, company, saveStatus, retrySave } = useRentalData();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const companyName = company.name.trim() || "Rental workspace";

  async function signOut() {
    setLogoutError("");
    setLoggingOut(true);
    try { await logout(); }
    catch (error) { setLogoutError(error instanceof Error ? error.message : "Sign out failed. Try again."); }
    finally { setLoggingOut(false); }
  }

  return <header className="topbar">
    <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{title}</strong></div>
    <div className="topbar-actions">
      {saveStatus !== "idle" && <div className={`save-indicator save-indicator-${saveStatus}`} role={saveStatus === "error" ? "alert" : "status"} aria-live={saveStatus === "error" ? "assertive" : "polite"}>
        {saveStatus === "saving" ? "Saving changes…" : saveStatus === "saved" ? "Saved" : <><span>Couldn’t save changes.</span><button type="button" onClick={retrySave}>Retry</button></>}
      </div>}
      <div className="account-control">
        <span className="profile-avatar account-avatar" aria-hidden="true">{companyName.slice(0, 1).toUpperCase()}</span>
        <span className="account-copy"><strong>{companyName}</strong><small>Workspace access</small></span>
        <button className="logout-button" type="button" aria-label={`Sign out of ${companyName}`} title="Sign out of workspace" disabled={loggingOut} onClick={() => void signOut()}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5v16h5m4-4 4-4-4-4m4 4H9"/></svg><span>{loggingOut ? "Signing out…" : "Sign out"}</span>
        </button>
      </div>
      {logoutError && <p className="logout-error" role="alert">{logoutError}</p>}
    </div>
  </header>;
}
