import { SiteHeader, SiteFooter, SiteContact } from "@/components/classic-rides-home";

export default function Page() {
  return <main className="classic-site"><SiteHeader /><div className="site-inner-intro"><span className="site-section-kicker">GET IN TOUCH</span><h1>Contact Classic Rides.</h1><p>Send your dates, pickup location and vehicle type. We’ll confirm availability and pricing.</p></div><SiteContact /><SiteFooter /></main>;
}
