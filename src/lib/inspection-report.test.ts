import { describe, expect, it } from "vitest";
import { buildInspectionReportHtml, pickupFor } from "./inspection-report";
import type { Booking, PrebookingInspection } from "./rental-data";

const now = "2026-11-06T09:30:00Z";
const inspection = (changes: Partial<PrebookingInspection>): PrebookingInspection => ({ id: "abcdef123", customerId: "c1", vehicleId: "v1", bookingId: "b1", stage: "Pickup", inspectionDate: "2026-11-06", odometerKm: 48250, odometerPhotoDataUrl: "data:image/jpeg;base64,AAAA", fuelPercent: 100, condition: "Fair", notes: "Dent <rear> bumper", photos: [], createdAt: now, ...changes });
const booking: Booking = { id: "b1", reference: "BK-482910", customerId: "c1", vehicleId: "v1", startDate: "2026-11-06", endDate: "2026-11-10", total: 260, status: "Active", note: "", createdAt: now };
const base = {
  company: { name: "Classic Rides", email: "", phone: "", address: "", invoicePrefix: "CR", paymentInstructions: "" },
  customer: { id: "c1", name: "Tendai Moyo", phone: "+263", email: "", licence: "DL", createdAt: now },
  vehicle: { id: "v1", registration: "AGB 4521", make: "Toyota", model: "Corolla Cross", year: 2023, dailyRate: 65, vehicleType: "SUV" as const, depositAmount: 150, mileageAllowanceKmPerDay: 200, excessMileageRatePerKm: 0.25, transmission: "Automatic", status: "Available" as const, createdAt: now },
  booking,
};

describe("inspection report", () => {
  it("includes the odometer photo, checklist, issues and damage marks", () => {
    const html = buildInspectionReportHtml({ ...base, inspection: inspection({
      checklist: { interior: "ok", exterior: "attention", tyreBrand: "ok" },
      checklistNotes: { exterior: "Scratch on door", tyreBrand: "205/55 R16 Bridgestone" },
      photos: [{ id: "p1", name: "r.jpg", dataUrl: "data:image/jpeg;base64,BBBB", view: "rear", marks: [{ id: "m1", x: 30, y: 60, type: "Dent", note: "Rear bumper" }] }],
      repName: "Nick", signatoryName: "Tendai Moyo",
    }) });
    expect(html).toContain("VEHICLE INSPECTION REPORT");
    expect(html).toContain("48,250 km");
    expect(html).toContain("data:image/jpeg;base64,AAAA"); // odometer photo
    expect(html).toContain("Issues recorded");
    expect(html).toContain("Scratch on door");
    expect(html).toContain("205/55 R16 Bridgestone");
    expect(html).toContain("Rear bumper");
    expect(html).toContain("Dent &lt;rear&gt; bumper"); // escaped
    expect(html).toContain("BK-482910");
    expect(html).toContain("Save as PDF / Print");
  });

  it("compares a return against its pickup", () => {
    const out = inspection({ id: "o", stage: "Pickup", odometerKm: 48250, fuelPercent: 100, checklist: { exterior: "ok", mats: "ok" }, createdAt: "2026-11-06T09:00:00Z" });
    const back = inspection({ id: "i", stage: "Return", odometerKm: 48900, fuelPercent: 50, checklist: { exterior: "attention", mats: "ok" }, createdAt: "2026-11-10T09:00:00Z" });
    expect(pickupFor(back, [out, back])).toBe(out);
    expect(pickupFor(out, [out, back])).toBeUndefined();
    const html = buildInspectionReportHtml({ ...base, inspection: back, pickup: out });
    expect(html).toContain("Changes since pickup");
    expect(html).toContain("650 km"); // distance driven
    expect(html).toContain("100% → 50%");
    expect(html).toContain("<span>New issues</span><strong>1</strong>");
  });

  it("copes with a removed customer and vehicle", () => {
    const html = buildInspectionReportHtml({ company: base.company, inspection: inspection({ bookingId: undefined, stage: undefined }) });
    expect(html).toContain("Customer removed");
    expect(html).toContain("Vehicle removed");
    expect(html).toContain("INS-ABCDEF");
  });
});
