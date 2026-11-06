"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-mark";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { DEFAULT_COMPANY_DETAILS, WHATSAPP_DISPLAY, whatsappLink } from "@/lib/brand";

const links = [
  { href: "/", label: "Home" },
  { href: "/cars", label: "Fleet" },
  { href: "/services", label: "Services" },
  { href: "/contact", label: "Contact" },
];

const phones = [
  { display: "+263 772 313 286", tel: "+263772313286" },
  { display: "+263 777 879 154", tel: "+263777879154" },
];
const emails = [DEFAULT_COMPANY_DETAILS.email, DEFAULT_COMPANY_DETAILS.secondaryEmail];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`) || (href === "/cars" && pathname.startsWith("/rent/"));
}

function Wordmark() {
  return <span className="cr-wordmark"><strong>CLASSIC RIDES</strong><small>CAR RENTAL</small></span>;
}

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("cr-menu-open");
    return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("cr-menu-open"); };
  }, [open]);

  // The menu sits beside the header, not inside it: the header's backdrop-filter would
  // otherwise become the containing block for the fixed-position menu and clip it.
  return <>
  <header className={`cr-header${scrolled ? " is-scrolled" : ""}${open ? " is-open" : ""}`}>
    <div className="cr-header-inner">
      <Link className="cr-brand" href="/" aria-label="Classic Rides home" onClick={() => setOpen(false)}><BrandLogo size={38} /><Wordmark /></Link>
      <nav className="cr-nav" aria-label="Main navigation">{links.map((link) => <Link key={link.href} href={link.href} className={isActive(pathname, link.href) ? "is-active" : undefined} aria-current={isActive(pathname, link.href) ? "page" : undefined}>{link.label}</Link>)}</nav>
      <div className="cr-header-actions">
        <a className="cr-phone" href={`tel:${phones[0].tel}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 6.3 6.3l1.4-2.2L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z" /></svg><span>{phones[0].display}</span></a>
        <Link className="cr-cta" href="/contact">Book a car <span aria-hidden="true">→</span></Link>
        <button className="cr-menu-toggle" type="button" aria-expanded={open} aria-controls="cr-mobile-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((value) => !value)}><span /><span /></button>
      </div>
    </div>
  </header>
    <div className="cr-mobile-menu" id="cr-mobile-menu" hidden={!open}>
      <nav aria-label="Mobile navigation">{links.map((link) => <Link key={link.href} href={link.href} className={isActive(pathname, link.href) ? "is-active" : undefined} aria-current={isActive(pathname, link.href) ? "page" : undefined} onClick={() => setOpen(false)}>{link.label}<span aria-hidden="true">→</span></Link>)}</nav>
      <div className="cr-mobile-contact">
        <span>Call or message us</span>
        <a className="cr-wa-link" href={whatsappLink("Hi Classic Rides, I’d like to rent a car.")} target="_blank" rel="noreferrer">WhatsApp {WHATSAPP_DISPLAY}</a>
        {phones.map((phone) => <a key={phone.tel} href={`tel:${phone.tel}`}>{phone.display}</a>)}
        {emails.map((address) => <a key={address} href={`mailto:${address}`}>{address}</a>)}
      </div>
      <div className="cr-mobile-actions"><Link className="cr-cta" href="/contact" onClick={() => setOpen(false)}>Book a car <span aria-hidden="true">→</span></Link><PwaInstallButton /><Link className="cr-staff-link" href="/workspace">Staff login</Link></div>
    </div>
  </>;
}

export function SiteFooter() {
  return <footer className="cr-footer">
    <div className="cr-footer-inner">
      <div className="cr-footer-brand">
        <Link className="cr-brand cr-brand-light" href="/" aria-label="Classic Rides home"><BrandLogo size={42} /><Wordmark /></Link>
        <p>Self-drive car hire, chauffeur service and airport transfers from Harare, Zimbabwe.</p>
        <Link className="cr-cta" href="/contact">Book a car <span aria-hidden="true">→</span></Link>
      </div>
      <nav className="cr-footer-col" aria-label="Explore"><h2>Explore</h2>{links.map((link) => <Link key={link.href} href={link.href}>{link.label === "Fleet" ? "Our fleet" : link.label}</Link>)}</nav>
      <nav className="cr-footer-col" aria-label="Services"><h2>Services</h2><Link href="/services">Self-drive rentals</Link><Link href="/services">Chauffeur-driven</Link><Link href="/services">Airport transfers</Link><Link href="/services">Monthly &amp; long-term</Link></nav>
      <div className="cr-footer-col"><h2>Contact</h2><a className="cr-wa-link" href={whatsappLink("Hi Classic Rides, I’d like to rent a car.")} target="_blank" rel="noreferrer">WhatsApp us</a>{phones.map((phone) => <a key={phone.tel} href={`tel:${phone.tel}`}>{phone.display}</a>)}{emails.map((address) => <a key={address} href={`mailto:${address}`}>{address}</a>)}<span>06 Carine Close, Cranborne, Harare, Zimbabwe</span></div>
    </div>
    <WhatsAppFloat />
    <div className="cr-footer-bottom"><span>© {new Date().getFullYear()} Classic Rides Car Rental. All rights reserved.</span><span className="cr-footer-bottom-links"><PwaInstallButton /><Link href="/workspace">Staff login</Link></span></div>
  </footer>;
}

export type Crumb = { href?: string; label: string };

/** The shared banner on every public page except the home page. */
export function SitePageHeader({ kicker, title, intro, crumbs, compact = false, actions = true }: { kicker?: string; title?: string; intro?: string; crumbs: Crumb[]; compact?: boolean; actions?: boolean }) {
  const trail: Crumb[] = [{ href: "/", label: "Home" }, ...crumbs];
  return <section className={`cr-page-header${compact ? " is-compact" : ""}`}>
    <div className="cr-page-header-inner">
      <nav className="cr-breadcrumbs" aria-label="Breadcrumb"><ol>{trail.map((crumb, index) => <li key={`${crumb.label}-${index}`}>{crumb.href && index < trail.length - 1 ? <Link href={crumb.href}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}</li>)}</ol></nav>
      {!compact && <div className="cr-page-header-body">
        <div>{kicker && <span className="cr-page-kicker">{kicker}</span>}{title && <h1>{title}</h1>}{intro && <p>{intro}</p>}</div>
        {actions && <div className="cr-page-header-actions"><Link className="cr-cta" href="/contact">Book a car <span aria-hidden="true">→</span></Link><a className="cr-page-call" href={`tel:${phones[0].tel}`}>Call {phones[0].display}</a></div>}
      </div>}
    </div>
  </section>;
}

export function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.2 20.8l4.5-1.2A8.8 8.8 0 1 0 12 3.2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M9.1 7.9c.3-.3.7-.3.9 0l1 1.6c.2.3.1.6-.1.9l-.5.5a6.3 6.3 0 0 0 2.7 2.7l.5-.5c.3-.2.6-.3.9-.1l1.6 1c.3.2.3.6 0 .9l-.7.8c-.5.5-1.3.6-2 .3a9.6 9.6 0 0 1-5-5c-.3-.7-.2-1.5.3-2Z" fill="currentColor" /></svg>;
}

/** Floating "Chat on WhatsApp" button shown on every public page. */
export function WhatsAppFloat() {
  return <a className="wa-float" href={whatsappLink("Hi Classic Rides, I’d like to rent a car.")} target="_blank" rel="noreferrer" aria-label={`Chat with Classic Rides on WhatsApp, ${WHATSAPP_DISPLAY}`}>
    <span className="wa-float-icon"><WhatsAppIcon /></span><span className="wa-float-text"><strong>Chat on WhatsApp</strong><small>{WHATSAPP_DISPLAY}</small></span>
  </a>;
}
