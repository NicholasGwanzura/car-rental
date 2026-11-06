import { SiteHeader, SiteFooter, SiteServices } from "@/components/classic-rides-home";

export default function Page() {
  return <main className="classic-site"><SiteHeader /><div className="site-inner-intro"><span className="site-section-kicker">WHAT WE DO</span><h1>Rental services.</h1><p>Self-drive cars, chauffeur hire, airport transfers, shuttles and long-term rentals. Choose a service, then send us your dates for availability and a quote.</p></div><SiteServices showHeading={false} /><SiteFooter /></main>;
}
