// Mirrors src/lib/calc/types.ts SgbEconomics, but with Date fields as ISO
// strings — what actually comes back over JSON from the API routes.

export type DataQualityFlag =
  | "STALE"
  | "NO_RECENT_TRADE"
  | "WIDE_SPREAD"
  | "LOW_LIQUIDITY"
  | "MISSING_PRICE"
  | "SUSPECT_MOVE";

export type LiquidityTier = "LIQUID" | "MODERATE" | "LOW" | "ILLIQUID" | "UNKNOWN";

export interface CashFlowDto {
  date: string;
  amount: number;
  kind: "PURCHASE" | "COUPON" | "REDEMPTION";
}

export interface SgbEconomicsDto {
  isin: string;
  seriesName: string;
  asOf: string;

  marketPrice: number | null;
  bidPrice: number | null;
  askPrice: number | null;
  spread: number | null;
  spreadPct: number | null;
  netBuyPrice: number | null;

  goldPricePerGram: number;
  goldAsOf: string;
  discountPremiumPct: number | null;
  discountPremiumInr: number | null;

  issueDate: string;
  maturityDate: string;
  yearsToMaturity: number;
  daysToMaturity: number;
  isMatured: boolean;

  couponRatePct: number;
  annualCouponInr: number;
  semiAnnualCouponInr: number;
  nextCouponDate: string | null;
  numCouponsRemaining: number;
  accruedInterestInr: number;
  remainingCouponIncomeInr: number;

  redemptionValueFlatInr: number;
  redemptionValueProjectedInr: number;
  goldGrowthAssumptionPct: number;

  totalExpectedCashFlowsFlatInr: number | null;
  totalExpectedCashFlowsProjectedInr: number | null;

  simpleAnnualizedReturnFlatPct: number | null;
  simpleAnnualizedReturnProjectedPct: number | null;

  ytmFlatPct: number | null;
  ytmProjectedPct: number | null;
  ytmNetOfCostsFlatPct: number | null;

  cashFlowsFlat: CashFlowDto[];

  avgDailyVolumeUnits: number | null;
  tradedSessionsInWindow: number;
  windowSessions: number;
  liquidityTier: LiquidityTier;
  dataQualityFlags: DataQualityFlag[];
  isReliable: boolean;
  staleDays: number;
}

export interface FreshnessMetaDto {
  providerId: string;
  providerLabel: string;
  latestRun: {
    id: string;
    startedAt: string;
    finishedAt: string | null;
    status: string;
    tranchesUpdated: number;
    errorCount: number;
  } | null;
  goldPriceAsOf: string | null;
  goldPricePerGram: number | null;
  staleDaysThreshold: number;
  dataAgeDays: number | null;
  isStale: boolean;
}

export interface RankingsResponse {
  cheapest: SgbEconomicsDto | null;
  topByYtm: SgbEconomicsDto[];
  topByDiscountToGold: SgbEconomicsDto[];
  topByExpectedReturn: SgbEconomicsDto[];
  mostLiquid: SgbEconomicsDto[];
  tradingAtPremium: SgbEconomicsDto[];
  tradingAtDiscount: SgbEconomicsDto[];
  totalTracked: number;
  unreliableCount: number;
  freshness: FreshnessMetaDto;
}

export interface AlertRuleDto {
  id: string;
  type: "DISCOUNT_BELOW" | "YTM_ABOVE" | "PRICE_BELOW" | "SPREAD_BELOW" | "NEW_CHEAPEST";
  trancheId: string | null;
  tranche: { isin: string; seriesName: string } | null;
  thresholdValue: number | null;
  isActive: boolean;
  label: string | null;
  createdAt: string;
}

export interface TrancheDto {
  id: string;
  isin: string;
  seriesName: string;
  issueDate: string;
  maturityDate: string;
  earlyExitFrom: string;
  issuePriceInr: number;
  couponRatePct: number;
  issueSizeUnits: number | null;
  status: string;
}

export interface PriceHistoryPointDto {
  asOf: string;
  lastTradedPrice: number | null;
  bidPrice: number | null;
  askPrice: number | null;
  volumeUnits: number | null;
  dataQuality: string;
  isStale: boolean;
}

export interface GoldHistoryPointDto {
  asOf: string;
  pricePerGram: number;
}

export interface SgbDetailResponse {
  data: SgbEconomicsDto;
  tranche: TrancheDto;
  priceHistory: PriceHistoryPointDto[];
  goldHistory: GoldHistoryPointDto[];
  freshness: FreshnessMetaDto;
}

export interface AlertEventDto {
  id: string;
  alertRuleId: string;
  alertRule: { type: string; label: string | null };
  trancheId: string | null;
  tranche: { isin: string; seriesName: string } | null;
  message: string;
  valueAtTrigger: number | null;
  triggeredAt: string;
  acknowledged: boolean;
}
