import type { Booking, Expense, ExpenseCategory, MaintenanceJob, Vehicle } from "@/lib/rental-data";

import { depositSummary } from "@/lib/deposit";
/**
 * Profitability rules
 * - Rental income is earned when a booking is Active or Completed. It counts in the period
 *   that contains the booking's pickup date, at its rental total plus any excess mileage charge.
 * - Expenses are the recorded expenses plus completed maintenance jobs with a cost
 *   (so service costs don't have to be entered twice).
 * - An expense with a vehicle is a direct cost of that vehicle; without one it is overhead.
 */

export type DateRange = { from: string; to: string };
export type PeriodKey = "this-month" | "last-month" | "last-3-months" | "this-year" | "last-12-months" | "all" | "custom";

export const periodLabels: Record<PeriodKey, string> = {
  "this-month": "This month",
  "last-month": "Last month",
  "last-3-months": "Last 3 months",
  "this-year": "This year",
  "last-12-months": "Last 12 months",
  all: "All time",
  custom: "Custom range",
};

export type CostEntry = {
  id: string;
  date: string;
  amount: number;
  category: ExpenseCategory;
  vehicleId?: string;
  description: string;
  source: "expense" | "maintenance";
};

export type IncomeEntry = { bookingId: string; date: string; amount: number; collected: boolean; vehicleId: string; rentalDays: number };

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function rentalDays(start: string, end: string) {
  const days = Math.ceil((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86_400_000);
  return Math.max(1, days || 1);
}

export function periodRange(period: PeriodKey, today = new Date(), custom?: DateRange): DateRange {
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (period) {
    case "this-month": return { from: isoDate(new Date(y, m, 1)), to: isoDate(new Date(y, m + 1, 0)) };
    case "last-month": return { from: isoDate(new Date(y, m - 1, 1)), to: isoDate(new Date(y, m, 0)) };
    case "last-3-months": return { from: isoDate(new Date(y, m - 2, 1)), to: isoDate(new Date(y, m + 1, 0)) };
    case "this-year": return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "last-12-months": return { from: isoDate(new Date(y, m - 11, 1)), to: isoDate(new Date(y, m + 1, 0)) };
    case "custom": return custom && custom.from && custom.to ? custom : { from: "0000-01-01", to: "9999-12-31" };
    default: return { from: "0000-01-01", to: "9999-12-31" };
  }
}

export function inRange(date: string, range: DateRange) {
  const day = date.slice(0, 10);
  return day >= range.from && day <= range.to;
}

export function incomeEntries(bookings: Booking[]): IncomeEntry[] {
  return bookings
    .filter((booking) => booking.status === "Active" || booking.status === "Completed")
    .map((booking) => ({
      bookingId: booking.id,
      date: booking.startDate,
      amount: booking.total + (booking.excessMileageCharge ?? 0),
      collected: booking.paymentStatus === "Paid",
      vehicleId: booking.vehicleId,
      rentalDays: rentalDays(booking.startDate, booking.endDate),
    }));
}

/** Money kept from refundable deposits (damage, missing items, fuel, fines…), dated when the deposit was settled. */
export type DepositKeptEntry = { bookingId: string; date: string; amount: number; vehicleId: string };

export function depositKeptEntries(bookings: Booking[]): DepositKeptEntry[] {
  return bookings.flatMap((booking) => {
    const deposit = depositSummary(booking);
    if (deposit.state !== "settled" || deposit.deducted <= 0) return [];
    return [{ bookingId: booking.id, date: (deposit.settledAt ?? booking.endDate).slice(0, 10), amount: deposit.deducted, vehicleId: booking.vehicleId }];
  });
}

export function costEntries(expenses: Expense[], maintenance: MaintenanceJob[]): CostEntry[] {
  return [
    ...expenses.map((expense): CostEntry => ({ id: expense.id, date: expense.date, amount: expense.amount, category: expense.category, vehicleId: expense.vehicleId || undefined, description: expense.description || expense.payee, source: "expense" })),
    ...maintenance
      .filter((job) => job.status === "Completed" && job.cost > 0)
      .map((job): CostEntry => ({ id: `maintenance-${job.id}`, date: job.dueDate, amount: job.cost, category: "Maintenance & repairs", vehicleId: job.vehicleId, description: job.title, source: "maintenance" })),
  ];
}

export type VehicleProfit = { vehicleId: string; vehicle?: Vehicle; income: number; depositKept: number; costs: number; net: number; margin: number | null; rentalDays: number; bookings: number };

export type ProfitSummary = {
  income: number;
  collected: number;
  outstanding: number;
  costs: number;
  directCosts: number;
  overhead: number;
  /** Money kept from refundable deposits in the period (counts as income). */
  depositKept: number;
  net: number;
  margin: number | null;
  rentals: number;
  rentalDays: number;
  byCategory: { category: ExpenseCategory; amount: number }[];
  byVehicle: VehicleProfit[];
};

export function summarize({ bookings, expenses, maintenance, vehicles }: { bookings: Booking[]; expenses: Expense[]; maintenance: MaintenanceJob[]; vehicles: Vehicle[] }, range: DateRange): ProfitSummary {
  const income = incomeEntries(bookings).filter((entry) => inRange(entry.date, range));
  const kept = depositKeptEntries(bookings).filter((entry) => inRange(entry.date, range));
  const costs = costEntries(expenses, maintenance).filter((entry) => inRange(entry.date, range));
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const depositKept = sum(kept.map((entry) => entry.amount));

  const totalIncome = sum(income.map((entry) => entry.amount));
  const collected = sum(income.filter((entry) => entry.collected).map((entry) => entry.amount));
  const totalCosts = sum(costs.map((entry) => entry.amount));
  const directCosts = sum(costs.filter((entry) => entry.vehicleId).map((entry) => entry.amount));

  const categories = new Map<ExpenseCategory, number>();
  for (const entry of costs) categories.set(entry.category, (categories.get(entry.category) ?? 0) + entry.amount);

  const vehicleIds = new Set<string>([...vehicles.map((vehicle) => vehicle.id), ...income.map((entry) => entry.vehicleId), ...kept.map((entry) => entry.vehicleId), ...costs.flatMap((entry) => entry.vehicleId ? [entry.vehicleId] : [])]);
  const byVehicle = [...vehicleIds].map((vehicleId): VehicleProfit => {
    const vehicleIncome = income.filter((entry) => entry.vehicleId === vehicleId);
    const vehicleCosts = sum(costs.filter((entry) => entry.vehicleId === vehicleId).map((entry) => entry.amount));
    const earned = sum(vehicleIncome.map((entry) => entry.amount));
    const vehicleKept = sum(kept.filter((entry) => entry.vehicleId === vehicleId).map((entry) => entry.amount));
    return {
      vehicleId,
      vehicle: vehicles.find((vehicle) => vehicle.id === vehicleId),
      income: earned,
      depositKept: vehicleKept,
      costs: vehicleCosts,
      net: earned + vehicleKept - vehicleCosts,
      margin: earned + vehicleKept > 0 ? (earned + vehicleKept - vehicleCosts) / (earned + vehicleKept) : null,
      rentalDays: sum(vehicleIncome.map((entry) => entry.rentalDays)),
      bookings: vehicleIncome.length,
    };
  }).filter((row) => row.vehicle || row.income || row.depositKept || row.costs).sort((a, b) => b.net - a.net);

  return {
    income: totalIncome,
    collected,
    outstanding: totalIncome - collected,
    costs: totalCosts,
    directCosts,
    overhead: totalCosts - directCosts,
    depositKept,
    net: totalIncome + depositKept - totalCosts,
    margin: totalIncome + depositKept > 0 ? (totalIncome + depositKept - totalCosts) / (totalIncome + depositKept) : null,
    rentals: income.length,
    rentalDays: sum(income.map((entry) => entry.rentalDays)),
    byCategory: [...categories].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    byVehicle,
  };
}

export type MonthPoint = { month: string; label: string; income: number; costs: number; net: number };

/** Month-by-month totals for the months a range covers (at most the latest 12). */
export function monthlyTrend(data: { bookings: Booking[]; expenses: Expense[]; maintenance: MaintenanceJob[] }, range: DateRange, today = new Date()): MonthPoint[] {
  // Income is rentals plus money kept from deposits, so each month's net matches the profit figures.
  const income = [...incomeEntries(data.bookings), ...depositKeptEntries(data.bookings)].filter((entry) => inRange(entry.date, range));
  const costs = costEntries(data.expenses, data.maintenance).filter((entry) => inRange(entry.date, range));
  const dates = [...income.map((entry) => entry.date), ...costs.map((entry) => entry.date)].sort();
  const todayMonth = isoDate(today).slice(0, 7);
  const lastMonth = (range.to.startsWith("9999") ? (dates.at(-1)?.slice(0, 7) ?? todayMonth) : range.to.slice(0, 7));
  const firstMonth = range.from.startsWith("0000") ? (dates[0]?.slice(0, 7) ?? lastMonth) : range.from.slice(0, 7);
  const months: string[] = [];
  let [year, month] = lastMonth.split("-").map(Number);
  while (months.length < 12) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    months.unshift(key);
    if (key <= firstMonth) break;
    month -= 1;
    if (month === 0) { month = 12; year -= 1; }
  }
  return months.map((key) => {
    const monthIncome = income.filter((entry) => entry.date.startsWith(key)).reduce((total, entry) => total + entry.amount, 0);
    const monthCosts = costs.filter((entry) => entry.date.startsWith(key)).reduce((total, entry) => total + entry.amount, 0);
    const [y, m] = key.split("-").map(Number);
    return { month: key, label: new Intl.DateTimeFormat("en", { month: "short", year: "2-digit" }).format(new Date(y, m - 1, 1)), income: monthIncome, costs: monthCosts, net: monthIncome - monthCosts };
  });
}
