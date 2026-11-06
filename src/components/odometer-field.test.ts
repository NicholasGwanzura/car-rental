import { describe, expect, it } from "vitest";
import { lastOdometerReading, parseOdometer, validateOdometer } from "./odometer-field";
import type { Booking, PrebookingInspection } from "@/lib/rental-data";

const inspection = (id: string, vehicleId: string, odometerKm: number, bookingId?: string): PrebookingInspection => ({
  id, customerId: "c1", vehicleId, bookingId, stage: "Pickup", inspectionDate: "2026-11-06",
  odometerKm, fuelPercent: 100, condition: "Good", notes: "", photos: [], createdAt: "2026-11-06T08:00:00.000Z",
});

const booking = (id: string, vehicleId: string, checkoutOdometer?: number, returnOdometer?: number): Booking => ({
  id, reference: `BK-${id}`, customerId: "c1", vehicleId, startDate: "2026-11-01", endDate: "2026-11-05",
  total: 100, status: "Completed", note: "", checkoutOdometer, returnOdometer, createdAt: "2026-11-01T08:00:00.000Z",
});

describe("validateOdometer", () => {
  it("accepts a whole reading at or above the last recorded one, with a photo", () => {
    expect(validateOdometer("48,250", "data:image/jpeg;base64,x", 48_000)).toBe("");
    expect(validateOdometer("48 250", "data:image/jpeg;base64,x", 48_250)).toBe("");
  });

  it("rejects blank, non-numeric, zero, and below-minimum readings", () => {
    expect(validateOdometer("", "data:image/jpeg;base64,x", 100)).toMatch(/Enter the odometer reading/);
    expect(validateOdometer("12.5", "data:image/jpeg;base64,x", 100)).toMatch(/whole number/);
    expect(validateOdometer("0", "data:image/jpeg;base64,x", 0)).toMatch(/more than 0/);
    expect(validateOdometer("47,000", "data:image/jpeg;base64,x", 48_000)).toMatch(/lower than the last recorded reading/);
  });

  it("requires a photo of the dashboard", () => {
    expect(validateOdometer("48,250", undefined, 0)).toMatch(/photo/);
  });
});

describe("parseOdometer", () => {
  it("strips spaces and thousands separators", () => {
    expect(parseOdometer(" 48, 250 ")).toBe(48_250);
  });
});

describe("lastOdometerReading", () => {
  it("returns the highest reading recorded for a vehicle across inspections and bookings", () => {
    const inspections = [inspection("i1", "v1", 48_250), inspection("i2", "v1", 48_900, "b1"), inspection("i3", "v2", 999_999)];
    const bookings = [booking("b1", "v1", 47_500, 48_200), booking("b2", "v2", 5_000)];
    expect(lastOdometerReading("v1", inspections, bookings)).toBe(48_900);
    expect(lastOdometerReading("v2", inspections, bookings)).toBe(999_999);
  });

  it("returns 0 when the vehicle has no recorded reading", () => {
    expect(lastOdometerReading("missing", [], [])).toBe(0);
  });
});
