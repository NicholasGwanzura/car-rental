import Link from "next/link";

const modules: Record<string, { title: string; summary: string; empty: string; action: string }> = {
  bookings: { title: "Bookings", summary: "Review reservations, pickup times, and return dates in one place.", empty: "No bookings yet", action: "Add vehicles to your fleet before taking reservations." },
  fleet: { title: "Fleet", summary: "Keep vehicle details, availability, and readiness up to date.", empty: "Your fleet is ready to get started", action: "Add your first vehicle to begin managing availability." },
  customers: { title: "Customers", summary: "Keep renter and driver information organized for each booking.", empty: "No customers yet", action: "Customer records will appear here when you add them." },
  maintenance: { title: "Maintenance", summary: "Track service work and vehicle downtime for your fleet.", empty: "No maintenance activity yet", action: "Add vehicles first, then record their maintenance history here." },
  reports: { title: "Reports", summary: "Understand fleet activity and rental performance over time.", empty: "Reports will appear as your operation grows", action: "Once you have bookings and vehicles, this space will summarize their activity." },
};

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const content = modules[module];
  if (!content) return <main className="module-wrap"><h1>Page not found</h1><Link href="/">Return to overview</Link></main>;

  return (
    <main className="module-wrap">
      <div className="module-crumb"><Link href="/">Workspace</Link><span>/</span><strong>{content.title}</strong></div>
      <p className="eyebrow">WORKSPACE</p>
      <h1>{content.title}</h1>
      <p className="module-summary">{content.summary}</p>
      <section className="module-empty">
        <div className="module-empty-icon" aria-hidden="true">✳</div>
        <h2>{content.empty}</h2>
        <p>{content.action}</p>
        <Link href="/" className="module-back">Back to overview <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
