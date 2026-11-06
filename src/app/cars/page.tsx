import { SiteHeader, SiteFooter, SiteFleet, SiteVehicles } from "@/components/classic-rides-home";
import { listPublicVehicles } from "@/lib/public-vehicles";

export const dynamic = "force-dynamic";

export default async function Page() {
  const vehicles = await listPublicVehicles();
  return <main className="classic-site"><SiteHeader /><div className="site-inner-intro"><span className="site-section-kicker">OUR FLEET</span><h1>Vehicle types.</h1><p>We offer Budget, Premium and SUV rentals. Contact us with your dates to check which vehicles are available.</p></div><SiteVehicles vehicles={vehicles} /><SiteFleet /><SiteFooter /></main>;
}
