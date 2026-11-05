import Image from "next/image";

const contactNumbers = [
  { label: "Zimbabwe", display: "+263 772 313 286", tel: "+263772313286" },
  { label: "Zimbabwe", display: "+263 777 879 154", tel: "+263777879154" },
  { label: "United Kingdom", display: "+44 7449 975828", tel: "+447449975828" },
];

const services = [
  { number: "01", title: "Self-drive rentals", detail: "Choose your car, set your route, and travel at your own pace." },
  { number: "02", title: "Chauffeur-driven", detail: "A comfortable ride with a professional driver." },
  { number: "03", title: "Airport transfers", detail: "Reliable pickups and drop-offs for a smoother arrival." },
  { number: "04", title: "Shuttle services", detail: "Convenient transport for groups, events, and business." },
  { number: "05", title: "Premium and SUV hire", detail: "More space and comfort for the journeys that need it." },
  { number: "06", title: "Monthly and long-term", detail: "Flexible rental options for longer stays and regular travel." },
];

function CarMark() {
  return <svg viewBox="0 0 44 28" aria-hidden="true"><path d="m7 17 2-6a4 4 0 0 1 3.8-2.8h17.4A4 4 0 0 1 34 11l3 6v5h-4a4.5 4.5 0 0 1-9 0h-5a4.5 4.5 0 0 1-9 0H7v-5Z"/><path d="m12 9 2-4h14l3 4M10 15h25M6 18H3m38 0h-3"/></svg>;
}

export function ClassicRidesHome() {
  return <main className="classic-site">
    <header className="site-header">
      <a className="site-brand" href="#home" aria-label="Classic Rides home"><span className="site-brand-mark"><CarMark /></span><span><strong>CLASSIC RIDES</strong><small>CAR RENTAL</small></span></a>
      <nav className="site-nav" aria-label="Main navigation"><a href="#services">Services</a><a href="#fleet">Fleet</a><a href="#contact">Contact</a></nav>
      <div className="site-header-actions">
        <a className="site-admin-link" href="/workspace">Admin</a>
        <a className="site-header-cta" href="mailto:sales@classicrides.online?subject=Car%20rental%20enquiry">Book a ride <span aria-hidden="true">↗</span></a>
      </div>
    </header>

    <section className="site-hero" id="home">
      <div className="site-hero-copy">
        <p className="site-eyebrow"><span /> RELIABLE RIDES. MORE FREEDOM.</p>
        <h1>Make every journey <em>yours.</em></h1>
        <p className="site-hero-intro">Car rental made simple. Choose a budget car, premium ride, or SUV for your next trip, airport pickup, or longer stay.</p>
        <div className="site-hero-actions"><a className="site-button-primary" href="mailto:sales@classicrides.online?subject=Car%20rental%20enquiry">Book your car <span aria-hidden="true">→</span></a><a className="site-button-link" href="#services">Explore our services</a></div>
        <div className="site-proof"><span className="proof-stars" aria-hidden="true">★★★★★</span><span>Flexible rentals for everyday travel and special journeys</span></div>
      </div>
      <div className="site-hero-visual">
        <Image src="/classic-rides-fleet.png" alt="Classic Rides silver SUV and dark sedan ready for hire" width={1536} height={1024} priority sizes="(max-width: 760px) 100vw, 58vw" />
        <div className="site-price-badge"><small>CAR HIRE</small><strong>From $40</strong><span>per day</span></div>
        <div className="site-image-caption"><span className="site-caption-dot" />A ride that fits your plans</div>
      </div>
    </section>

    <section className="site-fleet-strip" id="fleet"><div><span className="site-section-kicker">FIND YOUR FIT</span><h2>Three ways to get there.</h2></div><div className="fleet-types"><article><span>01</span><strong>Budget</strong><small>Easy everyday travel</small></article><article><span>02</span><strong>Premium</strong><small>Extra comfort for the road</small></article><article><span>03</span><strong>SUV</strong><small>Space for more adventure</small></article></div></section>

    <section className="site-services" id="services"><div className="site-section-heading"><div><span className="site-section-kicker">OUR SERVICES</span><h2>Good journeys start here.</h2></div><p>Whether it’s a quick airport pickup or a month on the road, we’ll help you find the right ride.</p></div><div className="site-service-grid">{services.map((service) => <article className="site-service-card" key={service.number}><span>{service.number}</span><h3>{service.title}</h3><p>{service.detail}</p><a href="mailto:sales@classicrides.online?subject=Classic%20Rides%20service%20enquiry" aria-label={`Ask about ${service.title}`}>Ask us <span aria-hidden="true">↗</span></a></article>)}</div><p className="site-advance-note"><span aria-hidden="true">✳</span> Book in advance to ask about available discounts.</p></section>

    <section className="site-contact" id="contact"><div className="site-contact-copy"><span className="site-section-kicker">LET’S GET YOU MOVING</span><h2>Tell us where you’re headed.</h2><p>Share your dates and the kind of ride you need. Our team will help with availability and a quote.</p><a className="site-button-light" href="mailto:sales@classicrides.online?subject=Classic%20Rides%20booking%20enquiry">Email our team <span aria-hidden="true">→</span></a></div><div className="site-contact-details"><div className="site-email-card"><span className="site-contact-icon" aria-hidden="true">@</span><span><small>OFFICIAL EMAIL</small><a href="mailto:sales@classicrides.online">sales@classicrides.online</a></span></div><div className="site-phone-grid">{contactNumbers.map((number) => <a className="site-phone-card" key={number.tel} href={`tel:${number.tel}`}><span className="site-contact-icon" aria-hidden="true">↗</span><span><small>{number.label}</small><strong>{number.display}</strong></span></a>)}</div><a className="site-domain" href="https://classicrides.online">classicrides.online</a></div></section>

    <footer className="site-footer"><a className="site-footer-brand" href="#home">CLASSIC RIDES <span>CAR RENTAL</span></a><span>Car hire for the way you move.</span><a href="/workspace">Staff workspace <span aria-hidden="true">↗</span></a></footer>
  </main>;
}
