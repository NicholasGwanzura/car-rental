import { describe, expect, it } from "vitest";
import { expenseReceiptError, isReceiptImage, receiptProblem } from "./expense-rules";

const photo = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const expense = (id: string, extra: Record<string, unknown> = {}) => ({ id, amount: 45, payee: "Puma Energy", category: "Fuel", date: "2026-11-06", ...extra });

describe("expense receipts", () => {
  it("accepts only image data URLs", () => {
    expect(isReceiptImage(photo)).toBe(true);
    expect(isReceiptImage("data:text/html;base64,PGI+")).toBe(false);
    expect(isReceiptImage("https://example.com/receipt.jpg")).toBe(false);
    expect(isReceiptImage(undefined)).toBe(false);
    expect(receiptProblem(expense("e1"))).toMatch(/receipt/i);
    expect(receiptProblem(expense("e1", { receiptDataUrl: photo }))).toBeNull();
  });

  it("rejects a new expense without a receipt and names it", () => {
    const error = expenseReceiptError([], [expense("e1")]);
    expect(error).toBe("$45 to Puma Energy needs a receipt photo before it can be saved.");
    expect(expenseReceiptError([], [expense("e1", { receiptDataUrl: photo })])).toBeNull();
  });

  it("requires a receipt when an older expense is edited, but not when it is untouched", () => {
    const legacy = expense("old");
    expect(expenseReceiptError([legacy], [legacy, expense("new", { receiptDataUrl: photo })])).toBeNull();
    expect(expenseReceiptError([legacy], [{ ...legacy, amount: 50 }])).toMatch(/needs a receipt/);
    expect(expenseReceiptError([legacy], [{ ...legacy, amount: 50, receiptDataUrl: photo }])).toBeNull();
  });

  it("does not stop a save that has no expenses array", () => {
    expect(expenseReceiptError([], undefined)).toBeNull();
  });
});
