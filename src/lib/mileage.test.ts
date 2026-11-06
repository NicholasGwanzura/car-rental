import { describe, expect, it } from "vitest";
import { unbookedBeforeBooking, vehicleMileage } from "./mileage";
import type { Booking, PrebookingInspection } from "@/lib/rental-data";

const booking = (id: string, vehicleId: string, checkout?: number, returned?: number, status: Booking["status"] = "Completed"): Booking => ({
  id, reference: `BK-${id}`, customerId: "c1", vehicleId, startDate: "2026-11-01", endDate: "2026-11-05",
  total: 100, status, note: "", checkoutOdometer: checkout, returnOdometer: returned, createdAt: "2026-11-01T08:00:00.000Z",
});

const inspection = (id: string, vehicleId: string, odometerKm: number, bookingId?: string): PrebookingInspection => ({
  id, customerId: "c1", vehicleId, bookingId, stage: "Pre-booking", inspectionDate: "2026-11-06",
  odometerKm, fuelPercent: 100, condition: "Good", notes: "", photos: [], createdAt: "2026-11-06T08:00:00.000Z",
});

describe("vehicleMileage", () => {
  it("splits distance into booked and unbooked kilometres", () => {
    const bookings = [booking("b1", "v1", 10_000, 10_200), booking("b2", "v1", 10_300, 10_500)];
    const result = vehicleMileage("v1", bookings, []);
    expect(result.bookedKm).toBe(400);
    expect(result.unbookedKm).toBe(100); // 10,200 → 10,300 while off rental
    expect(result.lastOdometerKm).toBe(10_500);
    expect(result.trips).toBe(2);
  });

  it("counts distance after a pre-booking inspection as unbooked", () => {
    const bookings = [booking("b1", "v1", 10_000, 10_200)];
    const inspections = [inspection("i1", "v1", 9_900)];
    const result = vehicleMileage("v1", bookings, inspections);
    expect(result.bookedKm).toBe(200);
    expect(result.unbookedKm).toBe(100); // 9,900 (inspection) → 10,000 pickup
    expect(result.lastOdometerKm).toBe(10_200);
  });

  it("ignores a first rental with no earlier reading and missing returns", () => {
    const bookings = [booking("b1", "v1", 10_000), booking("b2", "v1")];
    const result = vehicleMileage("v1", bookings, []);
    expect(result.bookedKm).toBe(0);
    expect(result.unbookedKm).toBe(0);
    expect(result.lastOdometerKm).toBe(10_000);
    expect(result.trips).toBe(0);
  });

  it("returns zeroes for a vehicle with no readings", () => {
    expect(vehicleMileage("v1", [], [])).toEqual({ bookedKm: 0, unbookedKm: 0, lastOdometerKm: 0, trips: 0 });
  });
});

describe("unbookedBeforeBooking", () => {
  it("measures the gap between the previous reading and the booking's pickup", () => {
    const bookings = [booking("b1", "v1", 10_000, 10_200), booking("b2", "v1", 10_300, 10_500)];
    expect(unbookedBeforeBooking(bookings[1], bookings, [])).toBe(100);
  });

  it("is null when there is no earlier reading or no pickup reading", () => {
    const bookings = [booking("b1", "v1", 10_000, 10_200)];
    expect(unbookedBeforeBooking(bookings[0], bookings, [])).toBeNull();
    expect(unbookedBeforeBooking(booking("b2", "v1"), bookings, [])).toBeNull();
  });
});
