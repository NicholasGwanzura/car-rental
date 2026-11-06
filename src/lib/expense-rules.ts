/**
 * Every business expense needs a receipt photo.
 * These rules run in the Add/Edit expense form and again on the server, so the
 * requirement can't be skipped by a stale tab or a hand-made request.
 */

type Doc = Record<string, unknown>;

/** Largest receipt we'll store. The app compresses photos to a few hundred KB, so this only stops abuse. */
const MAX_RECEIPT_CHARS = 4_000_000;

export function isReceiptImage(value: unknown): value is string {
  return typeof value === "string" && /^data:image\/(jpeg|png|webp);base64,/i.test(value) && value.length <= MAX_RECEIPT_CHARS;
}

/** The message to show when an expense is missing its receipt, or null when it's fine. */
export function receiptProblem(expense: Doc | undefined): string | null {
  if (!expense) return "Add a receipt photo for this expense.";
  return isReceiptImage(expense.receiptDataUrl) ? null : "Add a photo of the receipt for this expense. Every expense needs one.";
}

function describe(expense: Doc) {
  const amount = Number(expense.amount);
  return `${Number.isFinite(amount) ? `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "An expense"}${expense.payee ? ` to ${String(expense.payee)}` : ""}`;
}

/**
 * Checks a save before it is stored. Expenses that are new, or that were changed, must carry a receipt.
 * Older expenses saved before receipts were required are left alone until someone edits them.
 */
export function expenseReceiptError(stored: unknown, incoming: unknown): string | null {
  if (!Array.isArray(incoming)) return null;
  const existing = new Map((Array.isArray(stored) ? stored as Doc[] : []).filter((item) => typeof item?.id === "string").map((item) => [item.id as string, item]));
  for (const item of incoming as Doc[]) {
    if (!item || typeof item.id !== "string") continue;
    const before = existing.get(item.id);
    const unchanged = before !== undefined && JSON.stringify(before) === JSON.stringify(item);
    if (unchanged) continue;
    if (receiptProblem(item)) return `${describe(item)} needs a receipt photo before it can be saved.`;
  }
  return null;
}
