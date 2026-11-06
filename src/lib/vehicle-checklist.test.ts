import { describe, expect, it } from "vitest";
import { buildChecklistHtml } from "./vehicle-checklist";
import { inspectionChecklistItems } from "@/components/inspection-inputs";
import type { PrebookingInspection } from "./rental-data";

const now = "2026-11-06T09:30:00Z";
const inspection = (changes: Partial<PrebookingInspection>): PrebookingInspection => ({ id: "i", customerId: "c1", vehicleId: "v1", bookingId: "b1", inspectionDate: "2026-11-06", odometerKm: 48250, fuelPercent: 100, condition: "Good", notes: "", photos: [], createdAt: now, ...changes });
const input = {
  company: { name: "Classic Rides", email: "", phone: "", address: "", invoicePrefix: "CR", paymentInstructions: "" },
  booking: { id: "b1", reference: "BK-1", customerId: "c1", vehicleId: "v1", startDate: "2026-11-06", endDate: "2026-11-10", total: 260, status: "Completed" as const, note: "", createdAt: now },
  customer: { id: "c1", name: "Tendai Moyo", phone: "+263 77 123 4567", email: "", licence: "DL", createdAt: now },
  vehicle: { id: "v1", registration: "AGB 4521", make: "Toyota", model: "Corolla Cross", year: 2023, colour: "Silver", fuelType: "Diesel" as const, dailyRate: 65, vehicleType: "SUV" as const, depositAmount: 150, mileageAllowanceKmPerDay: 200, excessMileageRatePerKm: 0.25, transmission: "Automatic", status: "Available" as const, createdAt: now },
};

describe("vehicle checklist form", () => {
  it("lists every item from the paper form with OUT and IN columns", () => {
    const html = buildChecklistHtml({ ...input, out: inspection({ stage: "Pickup", checklist: { tyreBrand: "ok" }, checklistNotes: { tyreBrand: "205/55 R16 Bridgestone" } }), in: inspection({ stage: "Return", odometerKm: 49100, fuelPercent: 50, checklist: { tyreBrand: "attention" } }) });
    expect(inspectionChecklistItems).toHaveLength(25);
    for (const item of inspectionChecklistItems) expect(html).toContain(item.label.replace(/&/g, "&amp;"));
    expect(html).toContain("205/55 R16 Bridgestone");
    expect(html).toContain("VEHICLE CHECKLIST");
    expect(html).toContain("Silver");
    expect(html).toContain("49,100");
    expect(html).toContain("I have checked the vehicle named above and agreed to its condition.");
    expect(html).toContain("06 Carine Close, Cranborne, Harare, Zimbabwe");
  });

  it("still shows items recorded with the older checklist", () => {
    const html = buildChecklistHtml({ ...input, out: inspection({ checklist: { modulator: "attention" } }) });
    expect(html).toContain("FM / Bluetooth modulator");
  });
});
