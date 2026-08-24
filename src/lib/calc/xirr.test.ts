import { describe, expect, it } from "vitest";
import { xirr } from "./xirr";
import { CashFlow } from "./types";

function cf(date: string, amount: number, kind: CashFlow["kind"] = "COUPON"): CashFlow {
  return { date: new Date(date), amount, kind };
}

describe("xirr", () => {
  it("solves a simple one-year 10% return", () => {
    const flows = [cf("2024-01-01", -1000, "PURCHASE"), cf("2025-01-01", 1100, "REDEMPTION")];
    const result = xirr(flows);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(10, 0);
  });

  it("solves a two-year compounding return", () => {
    // -1000 today, +1210 in exactly 2 years => 10%/yr compounded
    const flows = [cf("2024-01-01", -1000, "PURCHASE"), cf("2026-01-01", 1210, "REDEMPTION")];
    const result = xirr(flows);
    expect(result!).toBeCloseTo(10, 0);
  });

  it("handles multiple coupon cash flows plus a redemption", () => {
    // Price 950, four semi-annual coupons of 25 each, redemption 1000 at 2 years.
    // Rough sanity check: return should be positive and more than the flat 5%/yr coupon yield
    // (25*2/1000) because it was also bought below the 1000 redemption value.
    const flows = [
      cf("2024-01-01", -950, "PURCHASE"),
      cf("2024-07-01", 25),
      cf("2025-01-01", 25),
      cf("2025-07-01", 25),
      cf("2026-01-01", 25 + 1000, "REDEMPTION"),
    ];
    const result = xirr(flows);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(5);
    expect(result!).toBeLessThan(10);
  });

  it("returns null when all cash flows are outflows", () => {
    const flows = [cf("2024-01-01", -1000, "PURCHASE"), cf("2025-01-01", -100)];
    expect(xirr(flows)).toBeNull();
  });

  it("returns null when all cash flows are inflows", () => {
    const flows = [cf("2024-01-01", 1000, "PURCHASE"), cf("2025-01-01", 100)];
    expect(xirr(flows)).toBeNull();
  });

  it("returns null for fewer than 2 cash flows", () => {
    expect(xirr([cf("2024-01-01", -1000)])).toBeNull();
    expect(xirr([])).toBeNull();
  });

  it("matches a known NPV=0 root within tolerance", () => {
    // Verify solved rate actually zeroes the NPV function (internal consistency check).
    const flows = [
      cf("2024-01-01", -2000, "PURCHASE"),
      cf("2024-07-01", 50),
      cf("2025-01-01", 50),
      cf("2025-07-01", 2100, "REDEMPTION"),
    ];
    const rate = xirr(flows)! / 100;
    const anchor = flows[0].date;
    const npv = flows.reduce((sum, f) => {
      const years = (f.date.getTime() - anchor.getTime()) / (365 * 24 * 3600 * 1000);
      return sum + f.amount / Math.pow(1 + rate, years);
    }, 0);
    expect(Math.abs(npv)).toBeLessThan(1);
  });
});
