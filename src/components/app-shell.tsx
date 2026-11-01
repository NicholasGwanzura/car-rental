"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useRentalData } from "@/lib/rental-data";

const navigation = [
  { label: "Overview", href: "/", icon: "⌂" },
  { label: "Bookings", href: "/bookings", icon: "▤" },
  { label: "Fleet", href: "/fleet", icon: "▰" },
  { label: "Customers", href: "/customers", icon: "♙" },
  { label: "Maintenance", href: "/maintenance", icon: "⚙" },
  { label: "Reports", href: "/reports", icon: "▥" },
];

export function AppShell({ children, active = "Overview" }: { children: ReactNode; active?: string }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Spiritus Rental home">
          <span className="brand-mark">S</span>
          <span className="brand-copy"><strong>spiritus</strong><small>RENTAL OPERATIONS</small></span>
        </Link>
        <div className="workspace-switcher"><span className="workspace-avatar">S</span><span className="workspace-copy"><strong>Your workspace</strong><small>Rental company</small></span><span className="chevron">⌄</span></div>
        <p className="nav-label">WORKSPACE</p>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map((item) => <Link key={item.label} className={`nav-item${item.label === active ? " is-active" : ""}`} href={item.href} aria-current={item.label === active ? "page" : undefined}>
            <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
          </Link>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><span className="help-icon">?</span><strong>Need a hand?</strong><span>Get help setting up your workspace.</span><a href="mailto:support@spiritusglobal.tech">Contact support <span aria-hidden="true">↗</span></a></div>
          <button className="profile-button" type="button" aria-label="Account settings"><span className="profile-avatar">N</span><span className="profile-copy"><strong>Account owner</strong><small>Workspace admin</small></span><span className="more">···</span></button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

export function PageTopbar({ title }: { title: string }) {
  const { logout } = useRentalData();
  return <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{title}</strong></div><div className="topbar-actions"><span className="environment-pill"><i /> Setup in progress</span><button className="icon-button" type="button" aria-label="Notifications">♧<i className="notification-dot" /></button><button className="top-avatar" type="button" aria-label="Sign out" title="Sign out" onClick={() => void logout()}>N</button></div></header>;
}
