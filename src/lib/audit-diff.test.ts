import { describe, expect, it } from "vitest";
import { diffWorkspace } from "./audit-diff";

const base = {
  vehicles: [{ id: "v1", make: "Toyota", model: "Aqua", registration: "AGW7242", status: "Available" }],
  customers: [{ id: "c1", name: "Steven M", phone: "0771", idPhotoDataUrl: "data:a" }],
  bookings: [{ id: "b1", reference: "BK-1", status: "Confirmed", paymentStatus: "Unpaid", vehicleId: "v1", customerId: "c1" }],
  maintenance: [], inspections: [], expenses: [],
  company: { name: "Classic Rides" },
};

describe("diffWorkspace", () => {
  it("describes the changes staff care about in plain words", () => {
    const after = {
      ...base,
      bookings: [{ ...base.bookings[0], status: "Active", checkoutOdometer: 48250 }],
      customers: [{ ...base.customers[0], phone: "0772", idPhotoDataUrl: "data:b" }, { id: "c2", name: "Rudo" }],
      inspections: [{ id: "i1", stage: "Pickup", bookingId: "b1", vehicleId: "v1", odometerKm: 48250 }],
    };
    const entries = diffWorkspace(base, after);
    expect(entries.map((entry) => entry.summary)).toEqual([
      "Updated customer Steven M (phone, ID photo)",
      "Added customer Rudo",
      "Started rental BK-1",
      "Recorded Pickup inspection for BK-1",
    ]);
    const phone = entries[0].changes.find((change) => change.field === "phone");
    expect(phone).toEqual({ field: "phone", from: "0771", to: "0772" });
    expect(entries[0].changes.find((change) => change.field === "ID photo")).toEqual({ field: "ID photo" });
    expect(entries[2].changes).toContainEqual({ field: "pickup odometer", from: "—", to: "48,250 km" });
  });

  it("records deletions, payments and settings changes", () => {
    const after = { ...base, vehicles: [], bookings: [{ ...base.bookings[0], paymentStatus: "Paid" }], company: { name: "Classic Rides", invoicePrefix: "CR" } };
    expect(diffWorkspace(base, after).map((entry) => entry.summary)).toEqual([
      "Deleted vehicle Toyota Aqua (AGW7242)",
      "Marked BK-1 paid",
      "Updated company settings (invoice prefix)",
    ]);
  });

  it("describes a deposit settlement with its refund and deductions", () => {
    const held = { ...base, bookings: [{ ...base.bookings[0], status: "Completed", depositAmount: 150, depositStatus: "Held" }] };
    const settled = { ...base, bookings: [{ ...held.bookings[0], depositStatus: "Returned", depositDeductions: [{ id: "a", reason: "Damage", amount: 40 }], depositRefundedAmount: 110, depositSettledAt: "2026-11-10T09:00:00Z" }] };
    const [entry] = diffWorkspace(held, settled);
    expect(entry.summary).toBe("Settled deposit for BK-1 ($110 returned, $40 kept)");
    expect(entry.changes.map((change) => change.field)).toEqual(expect.arrayContaining(["deposit", "deposit deductions", "deposit refund"]));
    expect(entry.changes.find((change) => change.field === "deposit deductions")).toEqual({ field: "deposit deductions", from: "—", to: "1 item, $40" });
    expect(entry.changes.some((change) => change.field === "depositSettledAt")).toBe(false);
  });

  it("returns nothing when nothing changed", () => {
    expect(diffWorkspace(base, structuredClone(base))).toEqual([]);
  });
});
