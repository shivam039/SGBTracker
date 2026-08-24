import { describe, expect, it } from "vitest";
import {
  mostLiquid,
  pickCheapest,
  topByDiscountToGold,
  topByYtm,
  tradingAtDiscount,
  tradingAtPremium,
} from "./ranking";
import { SgbEconomics } from "./types";

function makeEcon(overrides: Partial<SgbEconomics>): SgbEconomics {
  const base: SgbEconomics = {
    isin: "X",
    seriesName: "X series",
    asOf: new Date(),
    marketPrice: 5000,
    bidPrice: 4995,
    askPrice: 5005,
    spread: 10,
    spreadPct: 0.2,
    netBuyPrice: 5017,
    goldPricePerGram: 5000,
    goldAsOf: new Date(),
    discountPremiumPct: 0,
    discountPremiumInr: 0,
    issueDate: new Date("2020-01-01"),
    maturityDate: new Date("2028-01-01"),
    yearsToMaturity: 3,
    daysToMaturity: 1095,
    isMatured: false,
    couponRatePct: 2.5,
    annualCouponInr: 125,
    semiAnnualCouponInr: 62.5,
    nextCouponDate: new Date("2024-07-01"),
    numCouponsRemaining: 6,
    accruedInterestInr: 10,
    remainingCouponIncomeInr: 375,
    redemptionValueFlatInr: 5000,
    redemptionValueProjectedInr: 5400,
    goldGrowthAssumptionPct: 8,
    totalExpectedCashFlowsFlatInr: 5375,
    totalExpectedCashFlowsProjectedInr: 5775,
    simpleAnnualizedReturnFlatPct: 2.4,
    simpleAnnualizedReturnProjectedPct: 4.8,
    ytmFlatPct: 2.4,
    ytmProjectedPct: 4.8,
    ytmNetOfCostsFlatPct: 2.1,
    cashFlowsFlat: [],
    avgDailyVolumeUnits: 50,
    tradedSessionsInWindow: 5,
    windowSessions: 6,
    liquidityTier: "LIQUID",
    dataQualityFlags: [],
    isReliable: true,
    staleDays: 0,
  };
  return { ...base, ...overrides };
}

describe("ranking", () => {
  it("pickCheapest selects the highest-YTM reliable, active tranche", () => {
    const a = makeEcon({ isin: "A", ytmFlatPct: 3 });
    const b = makeEcon({ isin: "B", ytmFlatPct: 7 });
    const c = makeEcon({ isin: "C", ytmFlatPct: 9, isReliable: false }); // excluded despite highest YTM
    const d = makeEcon({ isin: "D", ytmFlatPct: 8, isMatured: true }); // excluded, matured
    expect(pickCheapest([a, b, c, d])?.isin).toBe("B");
  });

  it("pickCheapest returns null when nothing qualifies", () => {
    const a = makeEcon({ isin: "A", isReliable: false });
    expect(pickCheapest([a])).toBeNull();
    expect(pickCheapest([])).toBeNull();
  });

  it("topByYtm sorts descending and respects the limit", () => {
    const items = [3, 7, 1, 9, 5].map((ytm, i) => makeEcon({ isin: `T${i}`, ytmFlatPct: ytm }));
    const top = topByYtm(items, 3);
    expect(top.map((s) => s.ytmFlatPct)).toEqual([9, 7, 5]);
  });

  it("topByDiscountToGold sorts by most-negative (deepest discount) first", () => {
    const items = [1, -3, 2, -5].map((pct, i) => makeEcon({ isin: `D${i}`, discountPremiumPct: pct }));
    const top = topByDiscountToGold(items, 2);
    expect(top.map((s) => s.discountPremiumPct)).toEqual([-5, -3]);
  });

  it("mostLiquid sorts by trailing average volume", () => {
    const items = [10, 90, 40].map((vol, i) => makeEcon({ isin: `L${i}`, avgDailyVolumeUnits: vol }));
    const top = mostLiquid(items, 3);
    expect(top.map((s) => s.avgDailyVolumeUnits)).toEqual([90, 40, 10]);
  });

  it("tradingAtPremium and tradingAtDiscount partition correctly and never overlap", () => {
    const items = [2, -2, 0.5, -0.5, 0].map((pct, i) => makeEcon({ isin: `P${i}`, discountPremiumPct: pct }));
    const premium = tradingAtPremium(items);
    const discount = tradingAtDiscount(items);
    expect(premium.every((s) => (s.discountPremiumPct ?? 0) > 0)).toBe(true);
    expect(discount.every((s) => (s.discountPremiumPct ?? 0) < 0)).toBe(true);
    const overlap = premium.filter((p) => discount.some((d) => d.isin === p.isin));
    expect(overlap).toHaveLength(0);
  });

  it("excludes unreliable and matured tranches from every ranking list", () => {
    const unreliable = makeEcon({ isin: "U", ytmFlatPct: 99, isReliable: false });
    const matured = makeEcon({ isin: "M", ytmFlatPct: 99, isMatured: true });
    const normal = makeEcon({ isin: "N", ytmFlatPct: 5 });
    const top = topByYtm([unreliable, matured, normal]);
    expect(top.map((s) => s.isin)).toEqual(["N"]);
  });
});
