import { buildDocument, escapeHtml, km, longDate, openHtmlDocument, shortDate } from "@/lib/print-document";
import { inRange, type DateRange } from "@/lib/profitability";
import { formatMoney, type Booking, type CompanyProfile, type Customer, type PrebookingInspection, type Vehicle } from "@/lib/rental-data";

/**
 * Printable reports on how the fleet is used: when each car was booked, how far it was driven on
 * rentals and while it wasn't booked, how busy it was, plus a rentals-and-revenue summary.
 *
 * Rules (the same as the finance page): a rental belongs to the period that contains its pickup date,
 * and only Active and Completed rentals count as usage.
 */

const DAY = 86_400_000;
const dayNumber = (date: string) => Math.floor(new Date(`${date.slice(0, 10)}T12:00:00Z`).getTime() / DAY);
const ALL_START = "0000-01-01";
const ALL_END = "9999-12-31";

export type UsageSegment =
  | { kind: "rental"; booking: Booking; startKm: number; endKm?: number; km?: number }
  | { kind: "off-rental"; before: Booking; fromKm: number; toKm: number; km: number };

/**
 * Every recorded stretch of driving for one vehicle, in odometer order:
 * rentals (pickup to return reading) and the gaps between the last reading and the next pickup,
 * when the car was driven without being booked. Odometers only go up, so ordering by reading is ordering by time.
 */
export function vehicleUsageTimeline(vehicleId: string, bookings: Booking[], inspections: PrebookingInspection[]): UsageSegment[] {
  const readings: { km: number; booking?: Booking }[] = [];
  for (const booking of bookings) {
    if (booking.vehicleId !== vehicleId) continue;
    if (booking.checkoutOdometer !== undefined) readings.push({ km: booking.checkoutOdometer, booking });
    if (booking.returnOdometer !== undefined) readings.push({ km: booking.returnOdometer });
  }
  for (const inspection of inspections) if (inspection.vehicleId === vehicleId) readings.push({ km: inspection.odometerKm });
  readings.sort((a, b) => a.km - b.km);

  const segments: UsageSegment[] = [];
  let last: number | null = null;
  for (const reading of readings) {
    const booking = reading.booking;
    if (booking) {
      if (last !== null && reading.km > last) segments.push({ kind: "off-rental", before: booking, fromKm: last, toKm: reading.km, km: reading.km - last });
      const endKm = booking.returnOdometer;
      segments.push({ kind: "rental", booking, startKm: reading.km, endKm, km: endKm === undefined ? undefined : Math.max(0, endKm - reading.km) });
    }
    if (last === null || reading.km > last) last = reading.km;
  }
  return segments;
}

/** The days a period covers for the "days on rental" measure: from its start up to today (a period still running isn't counted past today). */
export function effectivePeriod(range: DateRange, today: string): { from: string; to: string; days: number } {
  const from = range.from === ALL_START ? today : range.from;
  const to = range.to === ALL_END || range.to > today ? today : range.to;
  const days = Math.max(0, dayNumber(to) - dayNumber(from) + 1);
  return { from, to, days };
}

/**
 * Days a booking spent inside [from, to], counted as nights like the rest of the app.
 * A rental that is still on rent past its planned return date is still out, so it counts through today.
 */
export function overlapDays(booking: Booking, from: string, to: string, today?: string) {
  const plannedEnd = dayNumber(booking.endDate);
  const lastDay = booking.status === "Active" && today ? Math.max(plannedEnd, dayNumber(today) + 1) : plannedEnd;
  const start = Math.max(dayNumber(booking.startDate), dayNumber(from));
  const end = Math.min(lastDay, dayNumber(to) + 1);
  return Math.max(0, end - start);
}

export type VehicleUsage = {
  vehicle: Vehicle;
  rentals: Booking[];
  rentalDays: number;
  availableDays: number;
  utilisation: number | null;
  bookedKm: number;
  measuredTrips: number;
  measuredDays: number;
  offRentalKm: number;
  lastOdometerKm: number;
  segments: UsageSegment[];
};

export type UsageInput = {
  vehicles: Vehicle[];
  bookings: Booking[];
  customers: Customer[];
  inspections: PrebookingInspection[];
  company: CompanyProfile;
  range: DateRange;
  periodLabel: string;
  /** Today as YYYY-MM-DD; only set in tests. */
  today?: string;
};

function todayText() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function calculateUsage(input: Pick<UsageInput, "vehicles" | "bookings" | "inspections" | "range" | "today">): VehicleUsage[] {
  const today = input.today ?? todayText();
  return input.vehicles.map((vehicle) => {
    const added = vehicle.createdAt.slice(0, 10);
    // Utilisation counts from the day the vehicle was added to the system, so a new car isn't shown as idle before it existed.
    const period = effectivePeriod({ from: input.range.from < added ? added : input.range.from, to: input.range.to }, today);
    const own = input.bookings.filter((booking) => booking.vehicleId === vehicle.id && (booking.status === "Active" || booking.status === "Completed"));
    const rentals = own.filter((booking) => inRange(booking.startDate, input.range)).sort((a, b) => a.startDate.localeCompare(b.startDate));
    const segments = vehicleUsageTimeline(vehicle.id, input.bookings, input.inspections).filter((segment) => {
      const booking = segment.kind === "rental" ? segment.booking : segment.before;
      return inRange(booking.startDate, input.range) && (booking.status === "Active" || booking.status === "Completed");
    });
    const rentalDays = own.reduce((total, booking) => total + overlapDays(booking, period.from, period.to, today), 0);
    const trips = segments.filter((segment): segment is Extract<UsageSegment, { kind: "rental" }> => segment.kind === "rental" && segment.km !== undefined);
    const allReadings = vehicleUsageTimeline(vehicle.id, input.bookings, input.inspections);
    const lastOdometerKm = Math.max(0, ...input.inspections.filter((item) => item.vehicleId === vehicle.id).map((item) => item.odometerKm), ...input.bookings.filter((booking) => booking.vehicleId === vehicle.id).flatMap((booking) => [booking.checkoutOdometer ?? 0, booking.returnOdometer ?? 0]), ...allReadings.map((segment) => segment.kind === "rental" ? segment.endKm ?? segment.startKm : segment.toKm));
    return {
      vehicle,
      rentals,
      rentalDays: Math.min(rentalDays, period.days),
      availableDays: period.days,
      utilisation: period.days > 0 ? Math.min(1, rentalDays / period.days) : null,
      bookedKm: trips.reduce((total, segment) => total + (segment.km ?? 0), 0),
      measuredTrips: trips.length,
      measuredDays: trips.reduce((total, segment) => total + Math.max(1, dayNumber(segment.booking.endDate) - dayNumber(segment.booking.startDate)), 0),
      offRentalKm: segments.filter((segment) => segment.kind === "off-rental").reduce((total, segment) => total + segment.km, 0),
      lastOdometerKm,
      segments,
    };
  });
}

const percent = (value: number | null) => value === null ? "—" : `${Math.round(value * 100)}%`;
const name = (vehicle: Vehicle) => `${vehicle.make} ${vehicle.model}`;

function statTiles(items: [string, string, boolean?][]) {
  return `<div class="stats">${items.map(([label, value, accent]) => `<div class="stat${accent ? " is-accent" : ""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>`;
}

function timelineRows(usage: VehicleUsage, customers: Customer[]) {
  if (!usage.segments.length) return `<tr><td colspan="6" class="muted">No rentals with odometer readings in this period.</td></tr>`;
  return usage.segments.map((segment) => {
    if (segment.kind === "off-rental") {
      return `<tr class="off"><td>Before ${escapeHtml(shortDate(segment.before.startDate))}</td><td><span class="pill pill-warn">Not on a rental</span> driven between the last reading and the pickup for ${escapeHtml(segment.before.reference)}</td><td class="num">${escapeHtml(km(segment.fromKm))}</td><td class="num">${escapeHtml(km(segment.toKm))}</td><td class="num"><strong>${escapeHtml(km(segment.km))}</strong></td><td></td></tr>`;
    }
    const { booking } = segment;
    const customer = customers.find((item) => item.id === booking.customerId);
    const days = Math.max(1, dayNumber(booking.endDate) - dayNumber(booking.startDate));
    const included = booking.includedMileageKm ?? (booking.mileageAllowanceKmPerDay ?? usage.vehicle.mileageAllowanceKmPerDay) * days;
    const excess = segment.km !== undefined && included > 0 ? Math.max(0, segment.km - included) : 0;
    return `<tr><td>${escapeHtml(shortDate(booking.startDate))} → ${escapeHtml(shortDate(booking.endDate))}<br><span class="muted">${days} ${days === 1 ? "day" : "days"}</span></td><td><strong>${escapeHtml(booking.reference)}</strong> · ${escapeHtml(customer?.name ?? "Customer removed")}<br><span class="pill ${booking.status === "Active" ? "pill-info" : "pill-ok"}">${escapeHtml(booking.status === "Active" ? "On rent" : "Completed")}</span></td><td class="num">${escapeHtml(km(segment.startKm))}</td><td class="num">${escapeHtml(segment.endKm === undefined ? "In progress" : km(segment.endKm))}</td><td class="num"><strong>${escapeHtml(segment.km === undefined ? "—" : km(segment.km))}</strong></td><td class="num">${excess > 0 ? `<span class="issue">${escapeHtml(km(excess))}</span>` : "—"}</td></tr>`;
  }).join("");
}

function vehicleSection(usage: VehicleUsage, customers: Customer[], periodLabel: string) {
  const perRental = usage.measuredTrips ? usage.bookedKm / usage.measuredTrips : undefined;
  return `<section class="vehicle-section"><h2>${escapeHtml(name(usage.vehicle))} <small>${escapeHtml(usage.vehicle.registration)} · ${escapeHtml(usage.vehicle.vehicleType)} · ${escapeHtml(periodLabel)}</small></h2>
${statTiles([
    ["Rentals", String(usage.rentals.length)],
    ["Days on rental", `${usage.rentalDays} of ${usage.availableDays}`],
    ["Utilisation", percent(usage.utilisation), true],
    ["Distance on rentals", km(usage.bookedKm)],
    ["Average per rental", perRental === undefined ? "—" : km(perRental)],
    ["Off-rental distance", km(usage.offRentalKm)],
  ])}
<table><thead><tr><th style="width:21%">When</th><th>Activity</th><th class="num">From</th><th class="num">To</th><th class="num">Distance</th><th class="num">Over allowance</th></tr></thead><tbody>${timelineRows(usage, customers)}</tbody></table></section>`;
}

const reportStyles = ".off td{background:#fffaf0!important}.vehicle-section{break-inside:auto}.note{margin-top:14px;color:#666;font-size:10.5px}";

/** Fleet usage and distance report; pass `vehicleId` for one car. */
export function buildUsageReportHtml(input: UsageInput & { vehicleId?: string }) {
  const { company, customers, periodLabel } = input;
  const all = calculateUsage(input);
  const usage = input.vehicleId ? all.filter((row) => row.vehicle.id === input.vehicleId) : all;
  const single = Boolean(input.vehicleId) && usage.length === 1;
  const rentals = usage.reduce((total, row) => total + row.rentals.length, 0);
  const rentalDays = usage.reduce((total, row) => total + row.rentalDays, 0);
  const availableDays = usage.reduce((total, row) => total + row.availableDays, 0);
  const bookedKm = usage.reduce((total, row) => total + row.bookedKm, 0);
  const measuredTrips = usage.reduce((total, row) => total + row.measuredTrips, 0);
  const measuredDays = usage.reduce((total, row) => total + row.measuredDays, 0);
  const offKm = usage.reduce((total, row) => total + row.offRentalKm, 0);
  const active = usage.filter((row) => row.rentals.length || row.segments.length);

  const summary = statTiles([
    ["Rentals started", String(rentals)],
    ["Days on rental", String(rentalDays)],
    ["Fleet utilisation", percent(availableDays ? Math.min(1, rentalDays / availableDays) : null), true],
    ["Distance on rentals", km(bookedKm)],
    ["Average per rental", measuredTrips ? km(bookedKm / measuredTrips) : "—"],
    ["Average per day", measuredDays ? km(bookedKm / measuredDays) : "—"],
    ["Off-rental distance", km(offKm)],
  ]);

  const table = `<h2>${single ? "Summary" : "Usage by vehicle"}</h2>
<table><thead><tr><th>Vehicle</th><th class="num">Rentals</th><th class="num">Days on rental</th><th class="num">Utilisation</th><th class="num">Distance on rentals</th><th class="num">Per rental</th><th class="num">Per day</th><th class="num">Off-rental</th><th class="num">Last odometer</th></tr></thead><tbody>
${usage.length ? usage.map((row) => `<tr><td><strong>${escapeHtml(name(row.vehicle))}</strong><br><span class="muted">${escapeHtml(row.vehicle.registration)}</span></td><td class="num">${row.rentals.length}</td><td class="num">${row.rentalDays} / ${row.availableDays}</td><td class="num">${percent(row.utilisation)}</td><td class="num">${escapeHtml(km(row.bookedKm))}</td><td class="num">${row.measuredTrips ? escapeHtml(km(row.bookedKm / row.measuredTrips)) : "—"}</td><td class="num">${row.measuredDays ? escapeHtml(km(row.bookedKm / row.measuredDays)) : "—"}</td><td class="num">${escapeHtml(km(row.offRentalKm))}</td><td class="num">${row.lastOdometerKm ? escapeHtml(km(row.lastOdometerKm)) : "—"}</td></tr>`).join("") : `<tr><td colspan="9" class="muted">No vehicles.</td></tr>`}
</tbody></table>`;

  const sections = active.length ? active.map((row) => vehicleSection(row, customers, periodLabel)).join("") : `<p class="muted">No rentals or odometer readings were recorded in this period.</p>`;
  const body = `${summary}${single ? "" : table}${sections}
<p class="note"><strong>How this is worked out.</strong> A rental counts in the period that contains its pickup date, and only rentals that are on rent or completed are counted. Distance on a rental is the return odometer reading minus the pickup reading. Off-rental distance is driven between the last recorded reading and the next pickup, when the car was not on a booking. Utilisation is days on rental divided by days in the period (up to today, and since the vehicle was added to the system). Rentals still on rent show “In progress” until they are returned.</p>`;

  return buildDocument({
    title: `${single ? "Vehicle usage report" : "Fleet usage report"} · ${periodLabel}`,
    company,
    heading: single ? "VEHICLE USAGE & DISTANCE REPORT" : "FLEET USAGE & DISTANCE REPORT",
    subtitle: single ? `${name(usage[0].vehicle)} (${usage[0].vehicle.registration}) · ${periodLabel}` : periodLabel,
    body,
    landscape: true,
    extraStyles: reportStyles,
  });
}

/** Rentals and revenue for a period, with the distance each rental covered. */
export function buildRentalsReportHtml(input: Omit<UsageInput, "inspections"> & { inspections?: PrebookingInspection[] }) {
  const { bookings, customers, vehicles, company, range, periodLabel } = input;
  const inPeriod = bookings.filter((booking) => inRange(booking.startDate, range)).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const counted = inPeriod.filter((booking) => booking.status === "Active" || booking.status === "Completed");
  const amount = (booking: Booking) => booking.total + (booking.excessMileageCharge ?? 0);
  const revenue = counted.reduce((total, booking) => total + amount(booking), 0);
  const collected = counted.filter((booking) => booking.paymentStatus === "Paid").reduce((total, booking) => total + amount(booking), 0);
  const distance = (booking: Booking) => booking.checkoutOdometer !== undefined && booking.returnOdometer !== undefined ? Math.max(0, booking.returnOdometer - booking.checkoutOdometer) : booking.distanceKm;
  const totalKm = counted.reduce((total, booking) => total + (distance(booking) ?? 0), 0);
  const days = counted.reduce((total, booking) => total + Math.max(1, dayNumber(booking.endDate) - dayNumber(booking.startDate)), 0);

  const body = `${statTiles([
    ["Rentals", String(counted.length)],
    ["Days booked", String(days)],
    ["Rental income", formatMoney(revenue), true],
    ["Collected", formatMoney(collected)],
    ["Outstanding", formatMoney(revenue - collected)],
    ["Distance driven", km(totalKm)],
  ])}
<h2>Rentals <small>${inPeriod.length} ${inPeriod.length === 1 ? "booking" : "bookings"} with pickup in this period</small></h2>
<table><thead><tr><th>Booking</th><th>Customer</th><th>Vehicle</th><th>Pickup</th><th>Return</th><th class="num">Days</th><th>Status</th><th class="num">Distance</th><th class="num">Total</th><th>Payment</th></tr></thead><tbody>
${inPeriod.length ? inPeriod.map((booking) => {
    const vehicle = vehicles.find((item) => item.id === booking.vehicleId);
    const customer = customers.find((item) => item.id === booking.customerId);
    const nights = Math.max(1, dayNumber(booking.endDate) - dayNumber(booking.startDate));
    const driven = distance(booking);
    return `<tr><td><strong>${escapeHtml(booking.reference)}</strong></td><td>${escapeHtml(customer?.name ?? "Customer removed")}</td><td>${escapeHtml(vehicle ? `${name(vehicle)} · ${vehicle.registration}` : "Vehicle removed")}</td><td>${escapeHtml(shortDate(booking.startDate))}</td><td>${escapeHtml(shortDate(booking.endDate))}</td><td class="num">${nights}</td><td><span class="pill ${booking.status === "Completed" ? "pill-ok" : booking.status === "Active" ? "pill-info" : booking.status === "Cancelled" ? "pill-issue" : "pill-warn"}">${escapeHtml(booking.status)}</span></td><td class="num">${driven === undefined ? (booking.status === "Active" ? "In progress" : "—") : escapeHtml(km(driven))}</td><td class="num">${escapeHtml(formatMoney(amount(booking)))}</td><td>${booking.status === "Cancelled" ? "—" : booking.paymentStatus === "Paid" ? "Paid" : "Due"}</td></tr>`;
  }).join("") : `<tr><td colspan="10" class="muted">No bookings with pickup in this period.</td></tr>`}
</tbody></table>
<p class="note">Income and distance count rentals that are on rent or completed, by pickup date. Cancelled and not-yet-started bookings are listed but not counted. Days booked are the planned nights of those rentals. Report generated ${escapeHtml(longDate(new Date().toISOString()))}.</p>`;

  return buildDocument({ title: `Rentals report · ${periodLabel}`, company, heading: "RENTALS & REVENUE REPORT", subtitle: periodLabel, body, landscape: true, extraStyles: reportStyles });
}

export function exportUsageReport(input: UsageInput & { vehicleId?: string }) {
  openHtmlDocument(buildUsageReportHtml(input), `${input.vehicleId ? "vehicle" : "fleet"}-usage-report.html`);
}

export function exportRentalsReport(input: Omit<UsageInput, "inspections"> & { inspections?: PrebookingInspection[] }) {
  openHtmlDocument(buildRentalsReportHtml(input), "rentals-report.html");
}
