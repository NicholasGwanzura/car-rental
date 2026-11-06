import { describe, expect, it } from "vitest";
import { formatMoney } from "./rental-data";

describe("formatMoney", () => {
  it("shows whole amounts without cents and fractional amounts with two digits", () => {
    expect(formatMoney(65)).toBe("$65");
    expect(formatMoney(52.5)).toBe("$52.50");
    expect(formatMoney(0.25)).toBe("$0.25");
    expect(formatMoney(1234.5)).toBe("$1,234.50");
    expect(formatMoney(0)).toBe("$0");
  });
});
