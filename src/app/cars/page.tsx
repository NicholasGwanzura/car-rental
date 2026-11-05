import { SiteHeader, SiteFooter, SiteFleet } from "@/components/classic-rides-home";

export default function Page() {
  return <main className="classic-site"><SiteHeader /><div className="site-inner-intro"><span className="site-section-kicker">OUR FLEET</span><h1>Find your fit.</h1><p>Explore our Budget, Premium and SUV rental options. Contact us to check current availability.</p></div><SiteFleet /><SiteFooter /></main>;
}
