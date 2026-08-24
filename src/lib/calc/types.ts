// Shared types for the SGB calculation engine.
// Kept independent of Prisma's generated types so the engine can be unit
// tested with plain objects and reused if the persistence layer changes.

export interface TrancheInput {
  isin: string;
  seriesName: string;
  issueDate: Date;
  maturityDate: Date;
  earlyExitFrom: Date;
  issuePriceInr: number;
  couponRatePct: number;
}

export interface LatestMarketData {
  asOf: Date;
  lastTradedPrice: number | null;
  bidPrice: number | null;
  askPrice: number | null;
  volumeUnits: number | null;
  exchange: string;
}

/** A short trailing window of snapshots, most-recent first, used for liquidity/staleness heuristics. */
export interface RecentSnapshot {
  asOf: Date;
  lastTradedPrice: number | null;
  volumeUnits: number | null;
}

export interface GoldReference {
  asOf: Date;
  pricePerGram: number;
}

export interface CashFlow {
  date: Date;
  amount: number;
  kind: "PURCHASE" | "COUPON" | "REDEMPTION";
}

export type DataQualityFlag =
  | "STALE"
  | "NO_RECENT_TRADE"
  | "WIDE_SPREAD"
  | "LOW_LIQUIDITY"
  | "MISSING_PRICE"
  | "SUSPECT_MOVE";

export type LiquidityTier = "LIQUID" | "MODERATE" | "LOW" | "ILLIQUID" | "UNKNOWN";

export interface TransactionCostAssumptions {
  /** One-way brokerage, in percent of trade value. */
  brokeragePct: number;
  /** Other exchange/statutory charges (STT, stamp duty, GST on brokerage, DP charges), in percent of trade value. */
  otherChargesPct: number;
}

export const DEFAULT_TRANSACTION_COSTS: TransactionCostAssumptions = {
  brokeragePct: 0.25,
  otherChargesPct: 0.1,
};

export interface GoldGrowthScenario {
  /** Assumed annual gold price growth rate, in percent (e.g. 8 = 8%/yr). 0 = flat/unchanged. */
  annualGrowthRatePct: number;
}

export interface SgbEconomics {
  isin: string;
  seriesName: string;
  asOf: Date;

  // Pricing snapshot
  marketPrice: number | null;
  bidPrice: number | null;
  askPrice: number | null;
  spread: number | null;
  spreadPct: number | null;
  netBuyPrice: number | null; // marketPrice inclusive of assumed transaction costs

  // Gold comparison
  goldPricePerGram: number;
  goldAsOf: Date;
  discountPremiumPct: number | null; // vs marketPrice
  discountPremiumInr: number | null;

  // Tenure
  issueDate: Date;
  maturityDate: Date;
  yearsToMaturity: number;
  daysToMaturity: number;
  isMatured: boolean;

  // Income
  couponRatePct: number;
  annualCouponInr: number;
  semiAnnualCouponInr: number;
  nextCouponDate: Date | null;
  numCouponsRemaining: number;
  accruedInterestInr: number;
  remainingCouponIncomeInr: number;

  // Redemption / return scenarios
  redemptionValueFlatInr: number;
  redemptionValueProjectedInr: number;
  goldGrowthAssumptionPct: number;

  totalExpectedCashFlowsFlatInr: number | null;
  totalExpectedCashFlowsProjectedInr: number | null;

  simpleAnnualizedReturnFlatPct: number | null;
  simpleAnnualizedReturnProjectedPct: number | null;

  ytmFlatPct: number | null; // primary ranking metric
  ytmProjectedPct: number | null;
  ytmNetOfCostsFlatPct: number | null;

  cashFlowsFlat: CashFlow[];

  // Liquidity & data quality
  avgDailyVolumeUnits: number | null;
  tradedSessionsInWindow: number;
  windowSessions: number;
  liquidityTier: LiquidityTier;
  dataQualityFlags: DataQualityFlag[];
  isReliable: boolean; // false => should not be presented as "cheapest right now"
  staleDays: number;
}
