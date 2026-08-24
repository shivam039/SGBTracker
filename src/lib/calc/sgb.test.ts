import { describe, expect, it } from "vitest";
import { addYears } from "date-fns";
import { computeSgbEconomics } from "./sgb";
import { GoldReference, LatestMarketData, RecentSnapshot, TrancheInput } from "./types";

const ISSUE_DATE = new Date("2020-01-15");
const MATURITY_DATE = new Date("2028-01-15"); // exactly 8 years

const baseTranche: TrancheInput = {
  isin: "TESTISIN001",
  seriesName: "Test Series",
  issueDate: ISSUE_DATE,
  maturityDate: MATURITY_DATE,
  earlyExitFrom: addYears(ISSUE_DATE, 5),
  issuePriceInr: 5000,
  couponRatePct: 2.5,
};

function liquidSnapshot(price: number, asOf: Date): LatestMarketData {
  return { asOf, lastTradedPrice: price, bidPrice: price - 5, askPrice: price + 5, volumeUnits: 100, exchange: "MOCK" };
}

function liquidWindow(price: number, asOf: Date): RecentSnapshot[] {
  return Array.from({ length: 6 }, (_, i) => ({
    asOf: new Date(asOf.getTime() - i * 24 * 3600 * 1000),
    lastTradedPrice: price,
    volumeUnits: 100,
  }));
}

describe("computeSgbEconomics", () => {
  it("prices a bond bought at par (price == gold value) close to its coupon rate", () => {
    const now = new Date("2024-06-01"); // roughly midway through the 8-year term
    const gold: GoldReference = { asOf: now, pricePerGram: 5000 };
    const result = computeSgbEconomics({
      tranche: baseTranche,
      latest: liquidSnapshot(5000, now),
      recentWindow: liquidWindow(5000, now),
      gold,
      now,
      goldGrowthRatePct: 0,
    });

    expect(result.discountPremiumPct).toBeCloseTo(0, 5);
    expect(result.ytmFlatPct).not.toBeNull();
    // A bond priced at par, redeemed at the same gold value with a fixed
    // semi-annual coupon, should yield an annualized return close to its
    // coupon rate regardless of when during the term it's purchased.
    expect(Math.abs(result.ytmFlatPct! - 2.5)).toBeLessThan(0.3);
  });

  it("gives a higher YTM when bought at a discount to gold", () => {
    const now = new Date("2024-06-01");
    const gold: GoldReference = { asOf: now, pricePerGram: 5000 };
    const parResult = computeSgbEconomics({
      tranche: baseTranche,
      latest: liquidSnapshot(5000, now),
      recentWindow: liquidWindow(5000, now),
      gold,
      now,
    });
    const discountResult = computeSgbEconomics({
      tranche: baseTranche,
      latest: liquidSnapshot(4700, now),
      recentWindow: liquidWindow(4700, now),
      gold,
      now,
    });
    expect(discountResult.discountPremiumPct!).toBeLessThan(0);
    expect(discountResult.ytmFlatPct!).toBeGreaterThan(parResult.ytmFlatPct!);
  });

  it("gives a lower YTM when bought at a premium to gold", () => {
    const now = new Date("2024-06-01");
    const gold: GoldReference = { asOf: now, pricePerGram: 5000 };
    const parResult = computeSgbEconomics({
      tranche: baseTranche,
      latest: liquidSnapshot(5000, now),
      recentWindow: liquidWindow(5000, now),
      gold,
      now,
    });
    const premiumResult = computeSgbEconomics({
      tranche: baseTranche,
      latest: liquidSnapshot(5300, now),
      recentWindow: liquidWindow(5300, now),
      gold,
      now,
    });
    expect(premiumResult.discountPremiumPct!).toBeGreaterThan(0);
    expect(premiumResult.ytmFlatPct!).toBeLessThan(parResult.ytmFlatPct!);
  });

  it("projects a higher redemption value and YTM when gold growth is assumed", () => {
    const now = new Date("2024-06-01");
    const gold: GoldReference = { asOf: now, pricePerGram: 5000 };
    const flat = computeSgbEconomics({
      tranche: baseTranche,
      latest: liquidSnapshot(5000, now),
      recentWindow: liquidWindow(5000, now),
      gold,
      now,
      goldGrowthRatePct: 0,
    });
    const grown = computeSgbEconomics({
      tranche: baseTranche,
      latest: liquidSnapshot(5000, now),
      recentWindow: liquidWindow(5000, now),
      gold,
      now,
      goldGrowthRatePct: 10,
    });
    expect(grown.redemptionValueProjectedInr).toBeGreaterThan(flat.redemptionValueFlatInr);
    expect(grown.ytmProjectedPct!).toBeGreaterThan(flat.ytmFlatPct!);
  });

  it("treats a matured tranche as having no forward-looking YTM", () => {
    const now = new Date("2029-01-01"); // after maturityDate
    const gold: GoldReference = { asOf: now, pricePerGram: 5000 };
    const result = computeSgbEconomics({
      tranche: baseTranche,
      latest: liquidSnapshot(5000, now),
      recentWindow: liquidWindow(5000, now),
      gold,
      now,
    });
    expect(result.isMatured).toBe(true);
    expect(result.ytmFlatPct).toBeNull();
    expect(result.numCouponsRemaining).toBe(0);
  });

  it("flags a missing price as unreliable and produces no misleading return figures", () => {
    const now = new Date("2024-06-01");
    const gold: GoldReference = { asOf: now, pricePerGram: 5000 };
    const result = computeSgbEconomics({
      tranche: baseTranche,
      latest: { asOf: now, lastTradedPrice: null, bidPrice: null, askPrice: null, volumeUnits: 0, exchange: "MOCK" },
      recentWindow: [],
      gold,
      now,
    });
    expect(result.isReliable).toBe(false);
    expect(result.dataQualityFlags).toContain("MISSING_PRICE");
    expect(result.marketPrice).toBeNull();
    expect(result.ytmFlatPct).toBeNull();
  });

  it("flags a stale quote and excludes it from reliability", () => {
    const now = new Date("2024-06-20");
    const staleAsOf = new Date("2024-06-01"); // 19 days old
    const gold: GoldReference = { asOf: now, pricePerGram: 5000 };
    const result = computeSgbEconomics({
      tranche: baseTranche,
      latest: liquidSnapshot(5000, staleAsOf),
      recentWindow: liquidWindow(5000, staleAsOf),
      gold,
      now,
    });
    expect(result.isReliable).toBe(false);
    expect(result.dataQualityFlags).toContain("STALE");
    expect(result.staleDays).toBeGreaterThan(6);
  });

  it("computes accrued interest bounded within one semi-annual coupon", () => {
    const now = new Date("2024-04-15"); // 3 months after a 2024-01-15 coupon date
    const gold: GoldReference = { asOf: now, pricePerGram: 5000 };
    const result = computeSgbEconomics({
      tranche: baseTranche,
      latest: liquidSnapshot(5000, now),
      recentWindow: liquidWindow(5000, now),
      gold,
      now,
    });
    expect(result.accruedInterestInr).toBeGreaterThan(0);
    expect(result.accruedInterestInr).toBeLessThanOrEqual(result.semiAnnualCouponInr);
  });
});
