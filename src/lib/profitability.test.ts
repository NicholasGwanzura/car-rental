import { describe, expect, it } from "vitest";
import { monthlyTrend, periodRange, summarize } from "./profitability";
import type { Booking, Expense, MaintenanceJob, Vehicle } from "./rental-data";

const vehicle = (id: string): Vehicle => ({ id, registration: id.toUpperCase(), make: "Toyota", model: id, year: 2022, dailyRate: 50, vehicleType: "Budget", depositAmount: 0, mileageAllowanceKmPerDay: 200, excessMileageRatePerKm: 0.2, transmission: "Automatic", status: "Available", createdAt: "2026-01-01" });
const booking = (id: string, vehicleId: string, startDate: string, endDate: string, total: number, status: Booking["status"], extra: Partial<Booking> = {}): Booking => ({ id, reference: id, customerId: "c", vehicleId, startDate, endDate, total, status, note: "", createdAt: startDate, ...extra });
const expense = (id: string, date: string, amount: number, vehicleId?: string, category: Expense["category"] = "Fuel"): Expense => ({ id, date, amount, category, vehicleId, payee: "", paymentMethod: "Cash", description: "", createdAt: date });

const data = {
  vehicles: [vehicle("a"), vehicle("b")],
  bookings: [
    booking("b1", "a", "2026-10-02", "2026-10-05", 150, "Completed", { excessMileageCharge: 20, paymentStatus: "Paid" }),
    booking("b2", "b", "2026-10-20", "2026-10-22", 100, "Active"),
    booking("b3", "a", "2026-10-25", "2026-10-27", 999, "Cancelled"),
    booking("b4", "a", "2026-11-01", "2026-11-02", 999, "Confirmed"),
    booking("b5", "b", "2026-09-10", "2026-09-11", 60, "Completed"),
  ],
  expenses: [expense("e1", "2026-10-03", 40, "a"), expense("e2", "2026-10-15", 30, undefined, "Rent & office"), expense("e3", "2026-09-01", 10, "b")],
  maintenance: [
    { id: "m1", vehicleId: "b", title: "Service", dueDate: "2026-10-10", cost: 25, status: "Completed", note: "" },
    { id: "m2", vehicleId: "a", title: "Brakes", dueDate: "2026-10-11", cost: 500, status: "Scheduled", note: "" },
  ] satisfies MaintenanceJob[],
};

describe("profitability", () => {
  const october = { from: "2026-10-01", to: "2026-10-31" };

  it("counts only active and completed rentals as income, including excess mileage", () => {
    const summary = summarize(data, october);
    expect(summary.income).toBe(270);
    expect(summary.collected).toBe(170);
    expect(summary.outstanding).toBe(100);
    expect(summary.rentals).toBe(2);
    expect(summary.rentalDays).toBe(5);
  });

  it("includes completed maintenance costs and splits direct costs from overhead", () => {
    const summary = summarize(data, october);
    expect(summary.costs).toBe(95);
    expect(summary.directCosts).toBe(65);
    expect(summary.overhead).toBe(30);
    expect(summary.net).toBe(175);
    expect(summary.margin).toBeCloseTo(175 / 270);
    expect(summary.byCategory[0]).toEqual({ category: "Fuel", amount: 40 });
  });

  it("calculates profit per vehicle", () => {
    const rows = summarize(data, october).byVehicle;
    expect(rows.find((row) => row.vehicleId === "a")).toMatchObject({ income: 170, costs: 40, net: 130, rentalDays: 3, bookings: 1 });
    expect(rows.find((row) => row.vehicleId === "b")).toMatchObject({ income: 100, costs: 25, net: 75 });
  });

  it("builds month-by-month totals for the range", () => {
    const trend = monthlyTrend(data, { from: "2026-09-01", to: "2026-10-31" });
    expect(trend.map((point) => point.month)).toEqual(["2026-09", "2026-10"]);
    expect(trend[0]).toMatchObject({ income: 60, costs: 10, net: 50 });
    expect(trend[1]).toMatchObject({ income: 270, costs: 95 });
  });

  it("resolves calendar periods", () => {
    const today = new Date(2026, 10, 6);
    expect(periodRange("this-month", today)).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(periodRange("last-month", today)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(periodRange("last-12-months", today)).toEqual({ from: "2025-12-01", to: "2026-11-30" });
  });
});
