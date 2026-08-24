import { differenceInCalendarDays, isAfter } from "date-fns";
import { generateCouponDates } from "./dates";
import { xirr } from "./xirr";
import { assessDataQuality } from "./dataQuality";
import {
  CashFlow,
  DEFAULT_TRANSACTION_COSTS,
  GoldReference,
  LatestMarketData,
  RecentSnapshot,
  SgbEconomics,
  TransactionCostAssumptions,
  TrancheInput,
} from "./types";

export interface ComputeSgbEconomicsArgs {
  tranche: TrancheInput;
  latest: LatestMarketData;
  recentWindow: RecentSnapshot[];
  gold: GoldReference;
  now: Date;
  goldGrowthRatePct?: number; // scenario 3: user-defined annual gold growth assumption
  costs?: TransactionCostAssumptions;
}

/**
 * Core valuation function: models the full future cash-flow stream of buying
 * one SGB unit today at its current secondary-market price, then computes
 * annualized-return figures from it.
 *
 * Cash flow model: [-marketPrice today] + [remaining semi-annual coupons] +
 * [gold-linked redemption value at maturity]. See README "Calculation
 * methodology" for the full formula derivation and every assumption below.
 */
export function computeSgbEconomics(args: ComputeSgbEconomicsArgs): SgbEconomics {
  const { tranche, latest, recentWindow, gold, now } = args;
  const goldGrowthRatePct = args.goldGrowthRatePct ?? 0;
  const costs = args.costs ?? DEFAULT_TRANSACTION_COSTS;

  const quality = assessDataQuality(latest, recentWindow, now);

  const marketPrice = latest.lastTradedPrice;
  const bidPrice = latest.bidPrice;
  const askPrice = latest.askPrice;
  const spread = bidPrice !== null && askPrice !== null ? askPrice - bidPrice : null;

  const costMultiplier = 1 + (costs.brokeragePct + costs.otherChargesPct) / 100;
  const netBuyPrice = marketPrice !== null ? marketPrice * costMultiplier : null;

  const discountPremiumInr = marketPrice !== null ? marketPrice - gold.pricePerGram : null;
  const discountPremiumPct =
    marketPrice !== null ? (discountPremiumInr! / gold.pricePerGram) * 100 : null;

  const isMatured = !isAfter(tranche.maturityDate, now);
  const daysToMaturity = differenceInCalendarDays(tranche.maturityDate, now);
  const yearsToMaturity = Math.max(0, daysToMaturity) / 365;

  const annualCouponInr = (tranche.issuePriceInr * tranche.couponRatePct) / 100;
  const semiAnnualCouponInr = annualCouponInr / 2;

  const allCouponDates = generateCouponDates(tranche.issueDate, tranche.maturityDate);
  const remainingCouponDates = allCouponDates.filter((d) => isAfter(d, now));
  const nextCouponDate = remainingCouponDates[0] ?? null;

  // Accrued interest since the last coupon date — informational only. Unlike
  // conventional bonds, exchange-traded SGB consideration is the clean quoted
  // price with no separate accrued-interest settlement: whoever holds the
  // units on the record date receives the full semi-annual coupon. A buyer
  // close to a coupon date is effectively picking up near-term income "for
  // free" relative to a buyer who just missed the record date — this figure
  // makes that visible, it is not added to or subtracted from any cash flow.
  const lastCouponDate =
    [...allCouponDates].reverse().find((d) => !isAfter(d, now)) ?? tranche.issueDate;
  const periodDays = 182.5;
  const daysSinceLastCoupon = Math.max(0, differenceInCalendarDays(now, lastCouponDate));
  const accruedInterestInr = isMatured
    ? 0
    : Math.min(semiAnnualCouponInr, (semiAnnualCouponInr * daysSinceLastCoupon) / periodDays);

  const remainingCouponIncomeInr = remainingCouponDates.length * semiAnnualCouponInr;

  // Redemption value scenarios. RBI's actual methodology is the simple
  // average of IBJA closing gold price (999 purity) over the 3 business days
  // preceding redemption — we approximate that with the latest available
  // reference price, since the exact future average is unknowable in advance.
  const redemptionValueFlatInr = gold.pricePerGram;
  const redemptionValueProjectedInr =
    gold.pricePerGram * Math.pow(1 + goldGrowthRatePct / 100, yearsToMaturity);

  const cashFlowsFlat = buildCashFlows(
    now,
    marketPrice,
    remainingCouponDates,
    semiAnnualCouponInr,
    tranche.maturityDate,
    redemptionValueFlatInr,
    isMatured
  );
  const cashFlowsProjected = buildCashFlows(
    now,
    marketPrice,
    remainingCouponDates,
    semiAnnualCouponInr,
    tranche.maturityDate,
    redemptionValueProjectedInr,
    isMatured
  );
  const cashFlowsNetOfCosts = buildCashFlows(
    now,
    netBuyPrice,
    remainingCouponDates,
    semiAnnualCouponInr,
    tranche.maturityDate,
    redemptionValueFlatInr,
    isMatured
  );

  const totalExpectedCashFlowsFlatInr = marketPrice !== null
    ? remainingCouponIncomeInr + (isMatured ? 0 : redemptionValueFlatInr)
    : null;
  const totalExpectedCashFlowsProjectedInr = marketPrice !== null
    ? remainingCouponIncomeInr + (isMatured ? 0 : redemptionValueProjectedInr)
    : null;

  const simpleAnnualizedReturnFlatPct = simpleAnnualizedReturn(
    marketPrice,
    totalExpectedCashFlowsFlatInr,
    yearsToMaturity
  );
  const simpleAnnualizedReturnProjectedPct = simpleAnnualizedReturn(
    marketPrice,
    totalExpectedCashFlowsProjectedInr,
    yearsToMaturity
  );

  const ytmFlatPct = marketPrice !== null && !isMatured ? xirr(cashFlowsFlat) : null;
  const ytmProjectedPct = marketPrice !== null && !isMatured ? xirr(cashFlowsProjected) : null;
  const ytmNetOfCostsFlatPct = netBuyPrice !== null && !isMatured ? xirr(cashFlowsNetOfCosts) : null;

  return {
    isin: tranche.isin,
    seriesName: tranche.seriesName,
    asOf: latest.asOf,

    marketPrice,
    bidPrice,
    askPrice,
    spread,
    spreadPct: quality.spreadPct,
    netBuyPrice,

    goldPricePerGram: gold.pricePerGram,
    goldAsOf: gold.asOf,
    discountPremiumPct,
    discountPremiumInr,

    issueDate: tranche.issueDate,
    maturityDate: tranche.maturityDate,
    yearsToMaturity,
    daysToMaturity,
    isMatured,

    couponRatePct: tranche.couponRatePct,
    annualCouponInr,
    semiAnnualCouponInr,
    nextCouponDate,
    numCouponsRemaining: remainingCouponDates.length,
    accruedInterestInr: round2(accruedInterestInr),
    remainingCouponIncomeInr: round2(remainingCouponIncomeInr),

    redemptionValueFlatInr: round2(redemptionValueFlatInr),
    redemptionValueProjectedInr: round2(redemptionValueProjectedInr),
    goldGrowthAssumptionPct: goldGrowthRatePct,

    totalExpectedCashFlowsFlatInr:
      totalExpectedCashFlowsFlatInr !== null ? round2(totalExpectedCashFlowsFlatInr) : null,
    totalExpectedCashFlowsProjectedInr:
      totalExpectedCashFlowsProjectedInr !== null
        ? round2(totalExpectedCashFlowsProjectedInr)
        : null,

    simpleAnnualizedReturnFlatPct,
    simpleAnnualizedReturnProjectedPct,

    ytmFlatPct,
    ytmProjectedPct,
    ytmNetOfCostsFlatPct,

    cashFlowsFlat,

    avgDailyVolumeUnits: quality.avgDailyVolumeUnits,
    tradedSessionsInWindow: quality.tradedSessionsInWindow,
    windowSessions: recentWindow.length,
    liquidityTier: quality.liquidityTier,
    dataQualityFlags: quality.flags,
    isReliable: quality.isReliable,
    staleDays: quality.staleDays,
  };
}

function buildCashFlows(
  now: Date,
  purchasePrice: number | null,
  remainingCouponDates: Date[],
  semiAnnualCouponInr: number,
  maturityDate: Date,
  redemptionValueInr: number,
  isMatured: boolean
): CashFlow[] {
  if (purchasePrice === null) return [];
  const flows: CashFlow[] = [{ date: now, amount: -purchasePrice, kind: "PURCHASE" }];
  for (const d of remainingCouponDates) {
    // The final coupon is paid alongside redemption at maturity.
    const isMaturityCoupon = d.getTime() === maturityDate.getTime();
    flows.push({
      date: d,
      amount: semiAnnualCouponInr + (isMaturityCoupon && !isMatured ? redemptionValueInr : 0),
      kind: isMaturityCoupon ? "REDEMPTION" : "COUPON",
    });
  }
  return flows;
}

function simpleAnnualizedReturn(
  purchasePrice: number | null,
  totalCashFlows: number | null,
  yearsToMaturity: number
): number | null {
  if (purchasePrice === null || totalCashFlows === null || purchasePrice <= 0) return null;
  if (yearsToMaturity <= 0) return null;
  const multiple = totalCashFlows / purchasePrice;
  if (multiple <= 0) return null;
  return round2((Math.pow(multiple, 1 / yearsToMaturity) - 1) * 100);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
