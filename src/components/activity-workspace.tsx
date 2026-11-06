"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell, PageTopbar } from "@/components/app-shell";
import { useDrilldown } from "@/components/drilldown";
import { useRentalData } from "@/lib/rental-data";

type Entry = { id: string; at: string; userId: string | null; userName: string; userRole: string; entity: string; entityId: string; action: string; summary: string; changes: { field: string; from?: string; to?: string }[] };
type TeamUser = { id: string; name: string; email: string; role: string };

const typeFilters = [
  { value: "", label: "All activity" },
  { value: "booking", label: "Bookings" },
  { value: "inspection", label: "Inspections" },
  { value: "customer", label: "Customers" },
  { value: "vehicle", label: "Fleet" },
  { value: "maintenance", label: "Maintenance" },
  { value: "expense", label: "Expenses" },
  { value: "company", label: "Company settings" },
  { value: "account", label: "Sign-ins" },
  { value: "team", label: "Team invitations" },
];

const entityIcons: Record<string, string> = { booking: "▤", inspection: "✓", customer: "♙", vehicle: "▰", maintenance: "⚙", expense: "$", company: "⌂", account: "⎆", team: "✉" };

function dayLabel(iso: string) {
  const date = new Date(iso);
  const key = (value: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Harare" }).format(value);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (key(date) === key(today)) return "Today";
  if (key(date) === key(yesterday)) return "Yesterday";
  return new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Harare" }).format(date);
}

function timeLabel(iso: string) {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Harare" }).format(new Date(iso));
}

function roleLabel(role: string) {
  return role === "super_admin" ? "Owner" : role === "manager" ? "Manager" : role === "sales" ? "Sales" : "Unknown";
}

export function ActivityWorkspace() {
  const { ready, vehicles, customers, bookings, inspections, currentUser } = useRentalData();
  const { open } = useDrilldown();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [type, setType] = useState("");
  const [person, setPerson] = useState("");
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const allowed = !currentUser || currentUser.role !== "sales";

  const load = useCallback(async (before?: string) => {
    setLoading(true); setError("");
    const params = new URLSearchParams();
    if (before) params.set("before", before);
    if (type) params.set("entity", type);
    if (person) params.set("userId", person);
    try {
      const response = await fetch(`/api/audit?${params}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({})) as { entries?: Entry[]; hasMore?: boolean; error?: string };
      if (!response.ok) throw new Error(response.status === 503 ? "The activity log is available in the online workspace." : result.error ?? "Could not load activity.");
      setEntries((current) => before ? [...current, ...(result.entries ?? [])] : result.entries ?? []);
      setHasMore(Boolean(result.hasMore));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load activity."); }
    finally { setLoading(false); }
  }, [type, person]);

  useEffect(() => { if (allowed) void load(); }, [allowed, load]);
  useEffect(() => {
    if (!allowed) return;
    fetch("/api/team", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((result: { users?: TeamUser[] } | null) => { if (result?.users) setTeam(result.users); }).catch(() => undefined);
  }, [allowed]);

  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of entries) {
      const label = dayLabel(entry.at);
      map.set(label, [...(map.get(label) ?? []), entry]);
    }
    return [...map];
  }, [entries]);

  function canOpen(entry: Entry) {
    if (entry.action === "deleted") return false;
    if (entry.entity === "vehicle") return vehicles.some((item) => item.id === entry.entityId);
    if (entry.entity === "customer") return customers.some((item) => item.id === entry.entityId);
    if (entry.entity === "booking") return bookings.some((item) => item.id === entry.entityId);
    if (entry.entity === "inspection") return inspections.some((item) => item.id === entry.entityId);
    return false;
  }

  if (!ready) return <div className="loading-state"><span className="loading-spinner" />Loading workspace…</div>;
  return <AppShell active="Activity">
    <PageTopbar title="Activity" />
    <main className="module-wrap activity-wrap">
      <section className="module-page-heading"><div><p className="eyebrow">AUDIT LOG</p><h1>Activity</h1><p className="module-summary">See who did what and when: bookings, inspections, payments, customers, fleet, expenses and sign-ins.</p></div></section>
      {!allowed ? <section className="data-empty"><h2>Managers only</h2><p>Ask a manager or the workspace owner if you need to see the activity log.</p></section> : <>
        <div className="list-toolbar booking-toolbar">
          <select className="filter-select" aria-label="Filter by type" value={type} onChange={(event) => setType(event.target.value)}>{typeFilters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}</select>
          <select className="filter-select" aria-label="Filter by person" value={person} onChange={(event) => setPerson(event.target.value)}><option value="">Everyone</option>{team.map((user) => <option key={user.id} value={user.id}>{user.name} · {roleLabel(user.role)}</option>)}</select>
          <span className="result-count">{entries.length} {entries.length === 1 ? "entry" : "entries"}{hasMore ? "+" : ""}</span>
          <button type="button" className="button button-quiet" onClick={() => void load()} disabled={loading}>↻ Refresh</button>
        </div>
        {error ? <section className="data-empty"><h2>Activity unavailable</h2><p>{error}</p></section>
          : !loading && entries.length === 0 ? <section className="data-empty"><h2>No activity yet</h2><p>Changes made in the workspace will appear here, newest first.</p></section>
          : <div className="activity-days">{groups.map(([day, items]) => <section className="activity-day" key={day}>
            <h2>{day}</h2>
            <ol className="activity-list">{items.map((entry) => <li key={entry.id} className={`activity-item activity-${entry.action}`}>
              <span className="activity-icon" aria-hidden="true">{entityIcons[entry.entity] ?? "•"}</span>
              <div className="activity-body">
                <p><strong>{entry.userName}</strong> <span className="activity-role">{roleLabel(entry.userRole)}</span></p>
                <p className="activity-summary">{canOpen(entry) ? <button type="button" className="drill-link" onClick={() => open({ kind: entry.entity as "vehicle" | "customer" | "booking" | "inspection", id: entry.entityId })}>{entry.summary}</button> : entry.summary}</p>
                {entry.changes.length > 0 && <>
                  <button type="button" className="activity-toggle" aria-expanded={Boolean(expanded[entry.id])} onClick={() => setExpanded((current) => ({ ...current, [entry.id]: !current[entry.id] }))}>{expanded[entry.id] ? "Hide changes" : `Show ${entry.changes.length} ${entry.changes.length === 1 ? "change" : "changes"}`}</button>
                  {expanded[entry.id] && <ul className="activity-changes">{entry.changes.map((change, index) => <li key={`${change.field}-${index}`}><span>{change.field}</span>{change.from !== undefined || change.to !== undefined ? <><s>{change.from}</s> → <b>{change.to}</b></> : <em>changed</em>}</li>)}</ul>}
                </>}
              </div>
              <time dateTime={entry.at}>{timeLabel(entry.at)}</time>
            </li>)}</ol>
          </section>)}</div>}
        {hasMore && !error && <div className="activity-more"><button type="button" className="button button-quiet" disabled={loading} onClick={() => void load(entries[entries.length - 1]?.at)}>{loading ? "Loading…" : "Load older activity"}</button></div>}
        {loading && entries.length === 0 && !error && <div className="loading-state"><span className="loading-spinner" />Loading activity…</div>}
      </>}
    </main>
  </AppShell>;
}
