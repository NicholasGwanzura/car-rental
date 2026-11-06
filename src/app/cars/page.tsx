import { SiteHeader, SiteFooter, SiteFleet, SiteVehicles } from "@/components/classic-rides-home";
import { SitePageHeader } from "@/components/site-chrome";
import { listPublicVehicles } from "@/lib/public-vehicles";

export const dynamic = "force-dynamic";

export default async function Page() {
  const vehicles = await listPublicVehicles();
  return <main className="classic-site"><SiteHeader /><SitePageHeader crumbs={[{ label: "Fleet" }]} kicker="OUR FLEET" title="Choose your car." intro="Budget cars, premium vehicles and SUVs. Pick a vehicle to see its rate and send your dates, and we’ll confirm availability." /><SiteVehicles vehicles={vehicles} /><SiteFleet /><SiteFooter /></main>;
}
