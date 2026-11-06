import { describe, expect, it } from "vitest";
import { buildContractHtml, buildReceiptHtml } from "./rental-contract";
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

describe("standalone customer receipt", () => {
  it("is a one-page receipt with the days, charges and the refundable deposit", () => {
    const html = buildReceiptHtml({ ...base, booking: booking() });
    expect(html).toContain("RENTAL RECEIPT");
    expect(html).not.toContain("VEHICLE RENTAL CONTRACT");
    expect(html).toContain("<strong>4 days</strong>");
    expect(html).toContain("Deposit is refundable.");
    expect(html).toContain("Save as PDF / Print");
    expect(html).toContain("RC-482910");
  });

  it("shows the deposit as returned once it has been refunded", () => {
    const held = buildReceiptHtml({ ...base, booking: booking({ depositStatus: "Held" }) });
    expect(held).toContain("Received");
    const returned = buildReceiptHtml({ ...base, booking: booking({ depositStatus: "Returned" }) });
    expect(returned).toContain("Returned to customer");
    expect(returned).toContain("Refunded to customer");
    expect(returned).toContain("Net paid after refund</th><td><strong>$260</strong>");
    expect(held).not.toContain("Net paid after refund");
  });

  it("itemises deductions and shows a partial refund", () => {
    const html = buildReceiptHtml({ ...base, booking: booking({ depositStatus: "Returned", depositSettledAt: "2026-11-10T09:00:00Z", depositDeductions: [{ id: "a", reason: "Damage", note: "rear bumper", amount: 40 }, { id: "b", reason: "Missing accessory", note: "floor mat", amount: 10 }], depositRefundedAmount: 100 }) });
    expect(html).toContain("Partly returned");
    expect(html).toContain("Kept from deposit: Damage – rear bumper");
    expect(html).toContain("Kept from deposit: Missing accessory – floor mat");
    expect(html).toContain("Refunded to customer</th><td>−$100");
    expect(html).toContain("Net paid after refund</th><td><strong>$310</strong>"); // $260 rental + $150 deposit − $100 refunded
    expect(html).toContain("$100 returned, $50 kept");
    expect(html).not.toContain("Deposit is refundable.");
  });

  it("shows a deposit kept in full", () => {
    const html = buildReceiptHtml({ ...base, booking: booking({ depositStatus: "Returned", depositDeductions: [{ id: "a", reason: "Damage", amount: 150 }], depositRefundedAmount: 0 }) });
    expect(html).toContain("Kept to cover charges");
    expect(html).not.toContain("Refunded to customer");
    expect(html).toContain("Net paid after refund</th><td><strong>$410</strong>");
  });
});

