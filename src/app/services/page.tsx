import { SiteHeader, SiteFooter, SiteServices } from "@/components/classic-rides-home";

export default function Page() {
  return <main className="classic-site"><SiteHeader /><div className="site-inner-intro"><span className="site-section-kicker">WHAT WE DO</span><h1>Rental services for every journey.</h1><p>Choose how you travel, from self-drive hire to airport transfers and longer stays.</p></div><SiteServices /><SiteFooter /></main>;
}
