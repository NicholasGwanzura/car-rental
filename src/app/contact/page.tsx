import { SiteHeader, SiteFooter, SiteContact } from "@/components/classic-rides-home";

export default function Page() {
  return <main className="classic-site"><SiteHeader /><div className="site-inner-intro"><span className="site-section-kicker">GET IN TOUCH</span><h1>Let’s plan your next ride.</h1><p>Tell us your dates, destination and preferred vehicle. We’ll help you with availability and a quote.</p></div><SiteContact /><SiteFooter /></main>;
}
