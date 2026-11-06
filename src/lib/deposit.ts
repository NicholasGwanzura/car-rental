import type { Booking } from "@/lib/rental-data";

/**
 * Refundable deposits.
 *
 * A deposit is collected at pickup ("Held") and settled once the car is back: the customer gets back
 * the deposit minus any deductions (damage, missing accessories, fuel, fines, cleaning, lateness…).
 * "Returned" is the stored status for a settled deposit, whether it was refunded in full, in part,
 * or entirely kept. Deductions are itemised so the receipt and the accounts can show exactly why.
 */

export type DepositDeduction = { id: string; reason: string; note?: string; amount: number };

export const deductionReasons = ["Damage", "Missing accessory", "Fuel shortfall", "Traffic fine", "Cleaning", "Late return", "Other"] as const;

/** A deduction as typed into the form (amount is still text). */
export type DeductionDraft = { id: string; reason: string; note: string; amount: string };

type DepositFields = Pick<Booking, "depositAmount" | "depositStatus" | "depositDeductions" | "depositRefundedAmount" | "depositSettledAt">;

const cents = (value: number) => Math.round(value * 100) / 100;
const sum = (values: number[]) => cents(values.reduce((total, value) => total + value, 0));

export type DepositSummary = {
  /** The deposit amount that was (or is to be) collected. */
  amount: number;
  state: "none" | "due" | "held" | "settled";
  deductions: DepositDeduction[];
  /** Total kept from the deposit. */
  deducted: number;
  /** What the customer gets back (or got back). */
  refund: number;
  outcome?: "full" | "partial" | "kept";
  settledAt?: string;
};

export function depositSummary(booking: DepositFields, vehicleDeposit = 0): DepositSummary {
  const amount = booking.depositAmount ?? vehicleDeposit;
  if (amount <= 0 || booking.depositStatus === "None") return { amount: 0, state: "none", deductions: [], deducted: 0, refund: 0 };
  if (booking.depositStatus === "Returned") {
    const deductions = booking.depositDeductions ?? [];
    const deducted = Math.min(amount, sum(deductions.map((item) => item.amount)));
    // Deposits marked returned before deductions existed were refunded in full.
    const refund = Number.isFinite(booking.depositRefundedAmount) ? cents(booking.depositRefundedAmount as number) : cents(amount - deducted);
    return { amount, state: "settled", deductions, deducted, refund, outcome: deducted <= 0 ? "full" : refund <= 0 ? "kept" : "partial", settledAt: booking.depositSettledAt };
  }
  return { amount, state: booking.depositStatus === "Held" ? "held" : "due", deductions: [], deducted: 0, refund: 0 };
}

/** One readable line per deduction, e.g. "Damage – rear bumper". */
export function deductionLabel(item: DepositDeduction) {
  return item.note?.trim() ? `${item.reason} – ${item.note.trim()}` : item.reason;
}

/** A plain-language outcome, e.g. "$70 returned, $30 kept". */
export function settlementText(summary: DepositSummary, money: (value: number) => string) {
  if (summary.state !== "settled") return "";
  if (summary.outcome === "full") return `${money(summary.refund)} returned in full`;
  if (summary.outcome === "kept") return `${money(summary.deducted)} kept in full`;
  return `${money(summary.refund)} returned, ${money(summary.deducted)} kept`;
}

export type DeductionResult = { ok: true; deductions: DepositDeduction[]; deducted: number; refund: number } | { ok: false; error: string };

/** Checks typed deductions against the deposit. Blank rows are ignored. */
export function resolveDeductions(amount: number, drafts: DeductionDraft[]): DeductionResult {
  const deductions: DepositDeduction[] = [];
  for (const draft of drafts) {
    const text = draft.amount.trim().replace(/[$,\s]/g, "");
    if (!text && !draft.note.trim()) continue;
    if (!/^\d+(\.\d{1,2})?$/.test(text)) return { ok: false, error: `Enter the amount of the “${draft.reason}” deduction as a number, for example 25 or 12.50.` };
    const value = cents(Number(text));
    if (value <= 0) return { ok: false, error: `The “${draft.reason}” deduction must be more than $0.` };
    deductions.push({ id: draft.id, reason: draft.reason, ...(draft.note.trim() ? { note: draft.note.trim() } : {}), amount: value });
  }
  const deducted = sum(deductions.map((item) => item.amount));
  if (deducted > amount) return { ok: false, error: `The deductions ($${deducted.toLocaleString("en-US")}) are more than the $${amount.toLocaleString("en-US")} deposit.` };
  return { ok: true, deductions, deducted, refund: cents(amount - deducted) };
}

/** The booking fields to store when a deposit is settled. */
export function settlementChanges(amount: number, deductions: DepositDeduction[], settledAt = new Date().toISOString()): Pick<Booking, "depositStatus" | "depositDeductions" | "depositRefundedAmount" | "depositSettledAt"> {
  const deducted = sum(deductions.map((item) => item.amount));
  return { depositStatus: "Returned", depositDeductions: deductions, depositRefundedAmount: cents(amount - deducted), depositSettledAt: settledAt };
}

/**
 * Checks settled deposits in a save before it is stored: deductions must be positive, can't exceed the
 * deposit, and the refund must equal the deposit minus the deductions. Returns a message, or null when fine.
 */
export function depositIntegrityError(bookings: unknown): string | null {
  if (!Array.isArray(bookings)) return null;
  for (const item of bookings as Record<string, unknown>[]) {
    if (!item || item.depositStatus !== "Returned") continue;
    const amount = Number(item.depositAmount);
    const deductions = Array.isArray(item.depositDeductions) ? item.depositDeductions as Record<string, unknown>[] : [];
    const amounts = deductions.map((deduction) => Number(deduction?.amount));
    const reference = typeof item.reference === "string" ? item.reference : "a booking";
    if (amounts.some((value) => !Number.isFinite(value) || value <= 0)) return `A deposit deduction on ${reference} has an invalid amount.`;
    const deducted = sum(amounts);
    if (Number.isFinite(amount) && deducted > amount + 0.005) return `The deposit deductions on ${reference} are more than the deposit.`;
    if (item.depositRefundedAmount !== undefined) {
      const refund = Number(item.depositRefundedAmount);
      if (!Number.isFinite(refund) || refund < 0 || (Number.isFinite(amount) && Math.abs(refund - (amount - deducted)) > 0.005)) return `The deposit refund on ${reference} doesn’t match the deposit minus the deductions.`;
    }
  }
  return null;
}
