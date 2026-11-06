import { describe, expect, it } from "vitest";
import { buildContractHtml } from "./rental-contract";
import type { Booking } from "./rental-data";

const now = "2026-11-06T09:30:00Z";
const booking = (changes: Partial<Booking> = {}): Booking => ({ id: "b1", reference: "BK-482910", customerId: "c1", vehicleId: "v1", startDate: "2026-11-06", endDate: "2026-11-10", total: 260, depositAmount: 150, depositStatus: "Held", status: "Active", paymentStatus: "Paid", note: "", createdAt: now, ...changes });
const base = {
  company: { name: "Classic Rides", email: "", phone: "", address: "", invoicePrefix: "CR", paymentInstructions: "" },
  customer: { id: "c1", name: "Tendai Moyo", phone: "+263", email: "", licence: "DL", createdAt: now },
  vehicle: { id: "v1", registration: "AGB 4521", make: "Toyota", model: "Corolla Cross", year: 2023, dailyRate: 65, vehicleType: "SUV" as const, depositAmount: 150, mileageAllowanceKmPerDay: 200, excessMileageRatePerKm: 0.25, transmission: "Automatic", status: "Available" as const, createdAt: now },
};

describe("rental receipt", () => {
  it("shows the number of days, the refundable deposit and what was received", () => {
    const html = buildContractHtml({ ...base, booking: booking() });
    expect(html).toContain("RENTAL RECEIPT");
    expect(html).toContain("<strong>4 days</strong>");
    expect(html).toContain("Rental charge (4 × $65)");
    expect(html).toContain("Deposit is refundable.");
    expect(html).toContain("<strong>$410</strong>");
    expect(html).not.toContain("Balance due</th>");
    expect(html.indexOf("RENTAL RECEIPT")).toBeGreaterThan(html.indexOf("VEHICLE RENTAL CONTRACT"));
  });

  it("shows a balance due when the rental isn't paid yet", () => {
    const html = buildContractHtml({ ...base, booking: booking({ paymentStatus: "Unpaid" }) });
    expect(html).toContain("<strong>$150</strong>"); // only the deposit was received
    expect(html).toContain("Balance due</th><td><strong>$260</strong>");
  });
});
