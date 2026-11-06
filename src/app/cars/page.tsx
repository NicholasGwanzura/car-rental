import { SiteHeader, SiteFooter, SiteFleet } from "@/components/classic-rides-home";

export default function Page() {
  return <main className="classic-site"><SiteHeader /><div className="site-inner-intro"><span className="site-section-kicker">OUR FLEET</span><h1>Vehicle types.</h1><p>We offer Budget, Premium and SUV rentals. Contact us with your dates to check which vehicles are available.</p></div><SiteFleet /><SiteFooter /></main>;
}
