import { SiteHeader, SiteFooter, SiteServices } from "@/components/classic-rides-home";
import { SitePageHeader } from "@/components/site-chrome";

export default function Page() {
  return <main className="classic-site"><SiteHeader /><SitePageHeader crumbs={[{ label: "Services" }]} kicker="WHAT WE DO" title="Rental services." intro="Self-drive cars, chauffeur hire, airport transfers, shuttles and long-term rentals. Choose a service, then send us your dates for availability and a quote." /><SiteServices showHeading={false} /><SiteFooter /></main>;
}
