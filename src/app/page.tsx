import Link from "next/link";

const navigation = [
  { label: "Overview", href: "/", icon: "⌂", active: true },
  { label: "Bookings", href: "/bookings", icon: "▤" },
  { label: "Fleet", href: "/fleet", icon: "▰" },
  { label: "Customers", href: "/customers", icon: "♙" },
  { label: "Maintenance", href: "/maintenance", icon: "⚙" },
  { label: "Reports", href: "/reports", icon: "▥" },
];

const quickLinks = [
  { title: "Add a vehicle", detail: "Grow your fleet", icon: "＋", href: "/fleet" },
  { title: "Create a booking", detail: "Reserve a vehicle", icon: "↗", href: "/bookings" },
  { title: "Add a customer", detail: "Keep renter details", icon: "♙", href: "/customers" },
];

const today = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "Africa/Harare",
}).format(new Date()).toUpperCase();

export default function Home() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Spiritus Rental home">
          <span className="brand-mark">S</span>
          <span className="brand-copy"><strong>spiritus</strong><small>RENTAL OPERATIONS</small></span>
        </Link>

        <div className="workspace-switcher">
          <span className="workspace-avatar">S</span>
          <span className="workspace-copy"><strong>Your workspace</strong><small>Rental company</small></span>
          <span className="chevron">⌄</span>
        </div>

        <p className="nav-label">WORKSPACE</p>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link key={item.label} className={`nav-item${item.active ? " is-active" : ""}`} href={item.href}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {item.label === "Bookings" && <span className="nav-count">0</span>}
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">?</span>
            <strong>Need a hand?</strong>
            <span>Get help setting up your workspace.</span>
            <a href="mailto:support@spiritusglobal.tech">Contact support <span aria-hidden="true">↗</span></a>
          </div>
          <button className="profile-button" type="button" aria-label="Account settings">
            <span className="profile-avatar">N</span>
            <span className="profile-copy"><strong>Account owner</strong><small>Workspace admin</small></span>
            <span className="more">···</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-actions">
            <span className="environment-pill"><i /> Setup in progress</span>
            <button className="icon-button" type="button" aria-label="Notifications">♧<i className="notification-dot" /></button>
            <button className="top-avatar" type="button" aria-label="Open profile">N</button>
          </div>
        </header>

        <div className="page-wrap">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">{today}</p>
              <h1>Welcome back<span className="heading-period">.</span></h1>
              <p className="welcome-subtitle">Your rental operation starts here. Let’s get your workspace ready.</p>
            </div>
            <Link className="button button-primary" href="/bookings"><span aria-hidden="true">＋</span> New booking</Link>
          </section>

          <section className="setup-banner" aria-labelledby="setup-title">
            <div className="setup-art" aria-hidden="true">
              <div className="sun" />
              <div className="road-line" />
              <div className="mini-car"><span /><i /><b /></div>
              <div className="road" />
            </div>
            <div className="setup-copy">
              <span className="setup-kicker"><span className="sparkle">✳</span> YOUR WORKSPACE IS READY</span>
              <h2 id="setup-title">A smoother rental day starts with the basics.</h2>
              <p>Add your first vehicle and set up your fleet. Bookings, handovers, and returns can follow.</p>
              <Link className="button button-light" href="/fleet">Set up your fleet <span aria-hidden="true">→</span></Link>
            </div>
            <span className="banner-orbit orbit-one" aria-hidden="true" />
            <span className="banner-orbit orbit-two" aria-hidden="true" />
          </section>

          <section className="stats-grid" aria-label="Workspace totals">
            <article className="stat-card">
              <div className="stat-top"><span className="stat-label">FLEET</span><span className="stat-icon fleet-icon">▰</span></div>
              <div className="stat-number">0 <span>vehicles</span></div>
              <div className="stat-foot"><span className="empty-indicator" /> Nothing on the fleet yet</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span className="stat-label">ACTIVE BOOKINGS</span><span className="stat-icon booking-icon">▤</span></div>
              <div className="stat-number">0 <span>bookings</span></div>
              <div className="stat-foot"><span className="empty-indicator" /> Ready when you are</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span className="stat-label">CUSTOMERS</span><span className="stat-icon customer-icon">♙</span></div>
              <div className="stat-number">0 <span>customers</span></div>
              <div className="stat-foot"><span className="empty-indicator" /> Your renter list will show here</div>
            </article>
            <article className="stat-card stat-card-accent">
              <div className="stat-top"><span className="stat-label">SETUP PROGRESS</span><span className="stat-icon progress-icon">✳</span></div>
              <div className="stat-number">1 <span>of 4 steps</span></div>
              <div className="progress-track"><span /></div>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel activity-panel">
              <div className="panel-heading">
                <div><p className="eyebrow">YOUR DAY AT A GLANCE</p><h2>Today’s activity</h2></div>
                <button className="quiet-button" type="button" disabled>View calendar <span aria-hidden="true">↗</span></button>
              </div>
              <div className="activity-empty">
                <div className="calendar-art" aria-hidden="true"><span className="cal-binding" /><span className="cal-lines" /><span className="cal-sun">✳</span></div>
                <strong>Your schedule is clear</strong>
                <p>Once you have bookings, today’s pickups and returns will appear here.</p>
                <Link href="/bookings" className="text-link">Explore bookings <span aria-hidden="true">→</span></Link>
              </div>
            </article>

            <article className="panel quick-panel">
              <div className="panel-heading"><div><p className="eyebrow">GET STARTED</p><h2>Quick actions</h2></div></div>
              <div className="quick-list">
                {quickLinks.map((item) => (
                  <Link className="quick-action" key={item.title} href={item.href}>
                    <span className="quick-icon" aria-hidden="true">{item.icon}</span>
                    <span className="quick-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
                    <span className="quick-arrow" aria-hidden="true">↗</span>
                  </Link>
                ))}
              </div>
              <div className="quick-note"><span aria-hidden="true">✦</span> Your setup saves as you go.</div>
            </article>
          </section>

          <footer className="page-footer"><span>SPIRITUS RENTAL</span><span>Built for the way you move.</span><a href="mailto:support@spiritusglobal.tech">Help & support ↗</a></footer>
        </div>
      </main>
    </div>
  );
}
