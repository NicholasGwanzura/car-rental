import Image from "next/image";
import { PwaInstallButton } from "@/components/pwa-install-button";

const contactNumbers = [
  { label: "Zimbabwe", display: "+263 772 313 286", tel: "+263772313286" },
  { label: "Zimbabwe", display: "+263 777 879 154", tel: "+263777879154" },
];

const services = [
  { number: "01", title: "Self-drive rentals", detail: "Daily and longer self-drive hire." },
  { number: "02", title: "Chauffeur-driven", detail: "A car and driver for your trip." },
  { number: "03", title: "Airport transfers", detail: "Pre-arranged airport pickups and drop-offs." },
  { number: "04", title: "Shuttle services", detail: "Transport for groups, events and business travel." },
  { number: "05", title: "Premium and SUV hire", detail: "Premium cars and SUVs for hire." },
  { number: "06", title: "Monthly and long-term", detail: "Monthly hire and extended rental periods." },
];

export function ClassicRidesHome() {
  return <main className="classic-site">
    <SiteHeader />

    <section className="site-hero" id="home">
      <div className="site-hero-copy">
        <p className="site-eyebrow"><span /> CLASSIC RIDES · CAR RENTAL</p>
        <h1>Rent a car. <em>Set your dates.</em></h1>
        <p className="site-hero-intro">Choose a budget car, premium vehicle or SUV. Ask us about self-drive hire, a driver, airport transfers and longer rentals.</p>
        <div className="site-hero-actions"><a className="site-button-primary" href="/contact">Check availability <span aria-hidden="true">→</span></a><a className="site-button-link" href="/services">See rental services</a></div>
        <div className="site-proof"><span>Self-drive</span><span aria-hidden="true">·</span><span>With a driver</span><span aria-hidden="true">·</span><span>Airport transfers</span></div>
      </div>
      <div className="site-hero-visual">
        <Image src="/classic-rides-fleet.png" alt="Classic Rides silver SUV and dark sedan ready for hire" width={1536} height={1024} priority sizes="(max-width: 760px) 100vw, 58vw" />


      </div>
    </section>

    <SiteFleet />

    <SiteServices />

    <SiteContact />

    <SiteFooter />
  </main>;
}

export function SiteHeader() { return <>
    <header className="site-header">
      <a className="site-brand" href="/" aria-label="Classic Rides home"><span className="site-brand-text"><strong>CLASSIC RIDES</strong><small>CAR RENTAL</small></span></a>
      <nav className="site-nav" aria-label="Main navigation"><a href="/services">Services</a><a href="/cars">Fleet</a><a href="/contact">Contact</a><PwaInstallButton /></nav>
      <div className="site-header-actions">
        <a className="site-admin-link" href="/workspace">Admin</a>
        <a className="site-header-cta" href="/contact">Enquire now <span aria-hidden="true">↗</span></a>
      </div>
    </header>
</>; }

export function SiteFooter() { return <>
    <footer className="site-footer"><a className="site-footer-brand" href="/" aria-label="Classic Rides home">CLASSIC RIDES <small>CAR RENTAL</small></a><span>Vehicle hire and transfers.</span><a href="mailto:sales@classicrides.online">sales@classicrides.online</a><a href="/workspace">Admin workspace <span aria-hidden="true">↗</span></a></footer>
</>; }

export function SiteFleet() { return <>
    <section className="site-fleet-strip" id="fleet"><div><span className="site-section-kicker">VEHICLE TYPES</span><h2>Budget, Premium and SUV.</h2></div><div className="fleet-types"><article><span>01</span><strong>Budget</strong><small>Everyday car hire</small></article><article><span>02</span><strong>Premium</strong><small>Premium vehicle hire</small></article><article><span>03</span><strong>SUV</strong><small>More seats and luggage space</small></article></div></section>
</>; }

export function SiteServices() { return <>
    <section className="site-services" id="services"><div className="site-section-heading"><div><span className="site-section-kicker">OUR SERVICES</span><h2>Rental services.</h2></div><p>Choose a rental service, then contact us with your dates for availability and a quote.</p></div><div className="site-service-grid">{services.map((service) => <article className="site-service-card" key={service.number}><span>{service.number}</span><h3>{service.title}</h3><p>{service.detail}</p><a href="mailto:sales@classicrides.online?subject=Classic%20Rides%20service%20enquiry" aria-label={`Ask about ${service.title}`}>Ask us <span aria-hidden="true">↗</span></a></article>)}</div><p className="site-advance-note"><span aria-hidden="true">✳</span> Ask about rates for advance and longer bookings.</p></section>
</>; }

export function SiteContact() { return <>
    <section className="site-contact" id="contact"><div className="site-contact-copy"><span className="site-section-kicker">CONTACT CLASSIC RIDES</span><h2>Request a vehicle.</h2><p>Send your rental dates, preferred vehicle type and pickup location. We’ll reply with availability and a quote.</p><a className="site-button-light" href="mailto:sales@classicrides.online?subject=Classic%20Rides%20booking%20enquiry">Email your request <span aria-hidden="true">→</span></a></div><div className="site-contact-details"><div className="site-email-card"><span className="site-contact-icon" aria-hidden="true">@</span><span><small>OFFICIAL EMAIL</small><a href="mailto:sales@classicrides.online">sales@classicrides.online</a></span></div><div className="site-phone-grid">{contactNumbers.map((number) => <a className="site-phone-card" key={number.tel} href={`tel:${number.tel}`}><span className="site-contact-icon" aria-hidden="true">↗</span><span><small>{number.label}</small><strong>{number.display}</strong></span></a>)}</div><a className="site-domain" href="https://classicrides.online">classicrides.online</a></div></section>
</>; }
