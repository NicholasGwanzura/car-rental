import { describe, expect, it } from "vitest";
import { deductionLabel, depositIntegrityError, depositSummary, resolveDeductions, settlementChanges, settlementText } from "./deposit";

const money = (value: number) => `$${value}`;
const draft = (reason: string, amount: string, note = "") => ({ id: reason, reason, note, amount });

describe("deposit summary", () => {
  it("tracks a deposit from due to held", () => {
    expect(depositSummary({ depositAmount: 150, depositStatus: "Due" }).state).toBe("due");
    expect(depositSummary({ depositAmount: 150, depositStatus: "Held" })).toMatchObject({ state: "held", amount: 150, refund: 0 });
    expect(depositSummary({ depositAmount: 0, depositStatus: "None" }).state).toBe("none");
    expect(depositSummary({ depositStatus: "Held" }, 100).amount).toBe(100); // falls back to the vehicle's deposit
  });

  it("treats a deposit marked returned before deductions existed as a full refund", () => {
    expect(depositSummary({ depositAmount: 150, depositStatus: "Returned" })).toMatchObject({ state: "settled", outcome: "full", refund: 150, deducted: 0 });
  });

  it("works out a partial refund and a deposit kept in full", () => {
    const partial = depositSummary({ depositAmount: 150, depositStatus: "Returned", depositDeductions: [{ id: "a", reason: "Damage", amount: 40 }, { id: "b", reason: "Fuel shortfall", amount: 10.5 }], depositRefundedAmount: 99.5 });
    expect(partial).toMatchObject({ outcome: "partial", deducted: 50.5, refund: 99.5 });
    expect(settlementText(partial, money)).toBe("$99.5 returned, $50.5 kept");
    const kept = depositSummary({ depositAmount: 100, depositStatus: "Returned", depositDeductions: [{ id: "a", reason: "Damage", amount: 100 }], depositRefundedAmount: 0 });
    expect(kept).toMatchObject({ outcome: "kept", refund: 0 });
    expect(settlementText(kept, money)).toBe("$100 kept in full");
  });

  it("labels a deduction with its note", () => {
    expect(deductionLabel({ id: "a", reason: "Damage", note: " rear bumper ", amount: 30 })).toBe("Damage – rear bumper");
    expect(deductionLabel({ id: "a", reason: "Cleaning", amount: 10 })).toBe("Cleaning");
  });
});

describe("resolving deductions", () => {
  it("ignores blank rows and adds up the rest", () => {
    const result = resolveDeductions(150, [draft("Damage", "$40", "rear bumper"), draft("Cleaning", ""), draft("Fuel shortfall", "12.50")]);
    expect(result).toMatchObject({ ok: true, deducted: 52.5, refund: 97.5 });
    expect(result.ok && result.deductions).toHaveLength(2);
  });

  it("rejects bad or excessive amounts", () => {
    expect(resolveDeductions(100, [draft("Damage", "abc")])).toMatchObject({ ok: false });
    expect(resolveDeductions(100, [draft("Damage", "0")])).toMatchObject({ ok: false });
    expect(resolveDeductions(100, [draft("Damage", "-5")])).toMatchObject({ ok: false });
    const over = resolveDeductions(100, [draft("Damage", "80"), draft("Other", "30")]);
    expect(over).toMatchObject({ ok: false });
    expect(!over.ok && over.error).toMatch(/more than the \$100 deposit/);
  });

  it("allows keeping the whole deposit", () => {
    expect(resolveDeductions(100, [draft("Damage", "100")])).toMatchObject({ ok: true, refund: 0 });
  });

  it("builds the stored settlement", () => {
    const changes = settlementChanges(150, [{ id: "a", reason: "Damage", amount: 40 }], "2026-11-06T10:00:00Z");
    expect(changes).toEqual({ depositStatus: "Returned", depositDeductions: [{ id: "a", reason: "Damage", amount: 40 }], depositRefundedAmount: 110, depositSettledAt: "2026-11-06T10:00:00Z" });
  });
});

describe("deposit integrity check for saves", () => {
  const settled = (extra: Record<string, unknown>) => ({ reference: "BK-1", depositAmount: 150, depositStatus: "Returned", ...extra });
  it("accepts a consistent settlement and ignores held deposits", () => {
    expect(depositIntegrityError([settled({ depositDeductions: [{ amount: 40 }], depositRefundedAmount: 110 }), { reference: "BK-2", depositStatus: "Held", depositAmount: 100 }])).toBeNull();
    expect(depositIntegrityError([settled({})])).toBeNull(); // refunded in full, no deductions
    expect(depositIntegrityError(undefined)).toBeNull();
  });

  it("rejects deductions above the deposit, bad amounts and a refund that doesn't add up", () => {
    expect(depositIntegrityError([settled({ depositDeductions: [{ amount: 100 }, { amount: 80 }] })])).toMatch(/more than the deposit/);
    expect(depositIntegrityError([settled({ depositDeductions: [{ amount: -5 }] })])).toMatch(/invalid amount/);
    expect(depositIntegrityError([settled({ depositDeductions: [{ amount: 40 }], depositRefundedAmount: 150 })])).toMatch(/doesn’t match/);
  });
});
