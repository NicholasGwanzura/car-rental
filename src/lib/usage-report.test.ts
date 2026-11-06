import { describe, expect, it } from "vitest";
import { buildRentalsReportHtml, buildUsageReportHtml, calculateUsage, overlapDays, vehicleUsageTimeline } from "./usage-report";
import { vehicleMileage } from "./mileage";
import type { Booking, PrebookingInspection, Vehicle } from "./rental-data";

const vehicle: Vehicle = { id: "v1", registration: "AGW7242", make: "Toyota", model: "Aqua", year: 2018, dailyRate: 45, vehicleType: "Budget", depositAmount: 100, mileageAllowanceKmPerDay: 200, excessMileageRatePerKm: 0.25, transmission: "Automatic", status: "Available", createdAt: "2026-01-01T00:00:00Z" };
const booking = (id: string, start: string, end: string, checkout?: number, returned?: number, status: Booking["status"] = "Completed", extra: Partial<Booking> = {}): Booking => ({ id, reference: `BK-${id}`, customerId: "c1", vehicleId: "v1", startDate: start, endDate: end, total: 45 * 3, status, paymentStatus: "Paid", note: "", checkoutOdometer: checkout, returnOdometer: returned, createdAt: `${start}T08:00:00Z`, ...extra });
const inspection = (km: number): PrebookingInspection => ({ id: `i${km}`, customerId: "c1", vehicleId: "v1", stage: "Pre-booking", inspectionDate: "2026-10-01", odometerKm: km, fuelPercent: 100, condition: "Good", notes: "", photos: [], createdAt: "2026-10-01T08:00:00Z" });
const company = { name: "Classic Rides", email: "", phone: "", address: "", invoicePrefix: "CR", paymentInstructions: "" };
const customers = [{ id: "c1", name: "Steven <M>", phone: "+263", email: "", licence: "DL", createdAt: "2026-01-01T00:00:00Z" }];

const bookings = [booking("1", "2026-10-02", "2026-10-05", 10_000, 10_300), booking("2", "2026-10-10", "2026-10-12", 10_450, 10_700), booking("3", "2026-11-02", "2026-11-05", 10_700, undefined, "Active")];

describe("usage timeline", () => {
  it("matches the mileage module's booked and off-rental totals", () => {
    const segments = vehicleUsageTimeline("v1", bookings, [inspection(9_900)]);
    const booked = segments.reduce((total, segment) => segment.kind === "rental" ? total + (segment.km ?? 0) : total, 0);
    const off = segments.reduce((total, segment) => segment.kind === "off-rental" ? total + segment.km : total, 0);
    const reference = vehicleMileage("v1", bookings, [inspection(9_900)]);
    expect(booked).toBe(reference.bookedKm); // 300 + 250
    expect(off).toBe(reference.unbookedKm); // 9,900→10,000 and 10,300→10,450
    expect(segments.map((segment) => segment.kind)).toEqual(["off-rental", "rental", "off-rental", "rental", "rental"]);
  });

  it("shows a rental still on rent without a distance yet", () => {
    const segments = vehicleUsageTimeline("v1", bookings, []);
    const active = segments.find((segment) => segment.kind === "rental" && segment.booking.id === "3");
    expect(active).toMatchObject({ kind: "rental", startKm: 10_700, endKm: undefined, km: undefined });
  });
});

describe("usage calculations", () => {
  const range = { from: "2026-10-01", to: "2026-10-31" };

  it("counts rentals by pickup date and works out distance and utilisation", () => {
    const [row] = calculateUsage({ vehicles: [vehicle], bookings, inspections: [], range, today: "2026-11-06" });
    expect(row.rentals.map((item) => item.id)).toEqual(["1", "2"]);
    expect(row.bookedKm).toBe(550);
    expect(row.rentalDays).toBe(5); // 3 + 2 nights
    expect(row.availableDays).toBe(31);
    expect(row.utilisation).toBeCloseTo(5 / 31);
    expect(row.offRentalKm).toBe(150);
  });

  it("only counts the days of a running period up to today", () => {
    const [row] = calculateUsage({ vehicles: [vehicle], bookings, inspections: [], range: { from: "2026-11-01", to: "2026-11-30" }, today: "2026-11-06" });
    expect(row.availableDays).toBe(6);
    // Due back 5 Nov but still on rent, so it counts 2 Nov through today (6 Nov).
    expect(row.rentalDays).toBe(5);
    expect(overlapDays(bookings[2], "2026-11-01", "2026-11-06", "2026-11-06")).toBe(5);
    expect(overlapDays(bookings[2], "2026-11-01", "2026-11-06")).toBe(3); // without "today", only the planned nights
  });

  it("ignores cancelled bookings and bookings outside the period", () => {
    const rows = calculateUsage({ vehicles: [vehicle], bookings: [...bookings, booking("9", "2026-10-20", "2026-10-22", 11_000, 11_100, "Cancelled")], inspections: [], range: { from: "2026-09-01", to: "2026-09-30" }, today: "2026-11-06" });
    expect(rows[0].rentals).toHaveLength(0);
    expect(rows[0].bookedKm).toBe(0);
  });
});

describe("report documents", () => {
  it("builds a fleet usage report with distance travelled and escapes names", () => {
    const html = buildUsageReportHtml({ vehicles: [vehicle], bookings, customers, inspections: [], company, range: { from: "2026-10-01", to: "2026-10-31" }, periodLabel: "October 2026", today: "2026-11-06" });
    expect(html).toContain("FLEET USAGE &amp; DISTANCE REPORT");
    expect(html).toContain("AGW7242");
    expect(html).toContain("550 km");
    expect(html).toContain("Steven &lt;M&gt;");
    expect(html).toContain("Not on a rental");
    expect(html).toContain("Save as PDF / Print");
  });

  it("builds a single-vehicle report and a rentals report", () => {
    const one = buildUsageReportHtml({ vehicles: [vehicle, { ...vehicle, id: "v2", registration: "OTHER1" }], bookings, customers, inspections: [], company, range: { from: "2026-10-01", to: "2026-10-31" }, periodLabel: "October 2026", today: "2026-11-06", vehicleId: "v1" });
    expect(one).toContain("VEHICLE USAGE &amp; DISTANCE REPORT");
    expect(one).not.toContain("OTHER1");
    const rentals = buildRentalsReportHtml({ vehicles: [vehicle], bookings: [...bookings, booking("9", "2026-10-20", "2026-10-22", undefined, undefined, "Cancelled")], customers, company, range: { from: "2026-10-01", to: "2026-10-31" }, periodLabel: "October 2026" });
    expect(rentals).toContain("RENTALS &amp; REVENUE REPORT");
    expect(rentals).toContain("BK-9");
    expect(rentals).toContain("Cancelled");
  });
});
