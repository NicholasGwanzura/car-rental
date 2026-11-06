import { SiteHeader, SiteFooter, SiteContact } from "@/components/classic-rides-home";
import { SitePageHeader } from "@/components/site-chrome";

export default function Page() {
  return <main className="classic-site"><SiteHeader /><SitePageHeader crumbs={[{ label: "Contact" }]} kicker="GET IN TOUCH" title="Contact Classic Rides." intro="Send your dates, pickup location and vehicle type. We’ll confirm availability and pricing." actions={false} /><SiteContact /><SiteFooter /></main>;
}
