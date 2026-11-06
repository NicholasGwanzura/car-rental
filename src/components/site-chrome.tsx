"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-mark";
import { PwaInstallButton } from "@/components/pwa-install-button";

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
const email = "sales@classicrides.online";

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
        <span>Call us</span>
        {phones.map((phone) => <a key={phone.tel} href={`tel:${phone.tel}`}>{phone.display}</a>)}
        <a href={`mailto:${email}`}>{email}</a>
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
      <div className="cr-footer-col"><h2>Contact</h2>{phones.map((phone) => <a key={phone.tel} href={`tel:${phone.tel}`}>{phone.display}</a>)}<a href={`mailto:${email}`}>{email}</a><span>Harare, Zimbabwe</span></div>
    </div>
    <div className="cr-footer-bottom"><span>© {new Date().getFullYear()} Classic Rides Car Rental. All rights reserved.</span><span className="cr-footer-bottom-links"><PwaInstallButton /><Link href="/workspace">Staff login</Link></span></div>
  </footer>;
}
