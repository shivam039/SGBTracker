import { differenceInCalendarDays } from "date-fns";
import { DataQualityFlag, LatestMarketData, LiquidityTier, RecentSnapshot } from "./types";

/** A price is considered stale once it's older than this many calendar days (~1 trading week). */
export const STALENESS_THRESHOLD_DAYS = 6;

/** A bid/ask spread wider than this, as a percent of mid price, is flagged. */
export const WIDE_SPREAD_THRESHOLD_PCT = 3;

/** Heuristic daily-volume thresholds (units/grams), based on trailing window average. */
export const LIQUIDITY_THRESHOLDS = {
  liquidMinAvgVolume: 25,
  moderateMinAvgVolume: 5,
} as const;

/** A single-session price move larger than this vs. the prior snapshot is flagged as suspect. */
export const SUSPECT_MOVE_THRESHOLD_PCT = 15;

export interface QualityAssessment {
  flags: DataQualityFlag[];
  isReliable: boolean;
  staleDays: number;
  liquidityTier: LiquidityTier;
  avgDailyVolumeUnits: number | null;
  tradedSessionsInWindow: number;
  spreadPct: number | null;
}

export function assessDataQuality(
  latest: LatestMarketData,
  recentWindow: RecentSnapshot[],
  now: Date
): QualityAssessment {
  const flags: DataQualityFlag[] = [];

  const staleDays = differenceInCalendarDays(now, latest.asOf);
  if (staleDays > STALENESS_THRESHOLD_DAYS) flags.push("STALE");

  if (latest.lastTradedPrice === null || latest.lastTradedPrice <= 0) {
    flags.push("MISSING_PRICE");
  }

  const tradedSessionsInWindow = recentWindow.filter(
    (s) => (s.volumeUnits ?? 0) > 0 && s.lastTradedPrice !== null
  ).length;
  if (recentWindow.length > 0 && tradedSessionsInWindow === 0) {
    flags.push("NO_RECENT_TRADE");
  }

  const volumes = recentWindow.map((s) => s.volumeUnits ?? 0);
  const avgDailyVolumeUnits =
    volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : null;

  let liquidityTier: LiquidityTier = "UNKNOWN";
  if (avgDailyVolumeUnits !== null) {
    if (
      avgDailyVolumeUnits >= LIQUIDITY_THRESHOLDS.liquidMinAvgVolume &&
      tradedSessionsInWindow >= Math.ceil(recentWindow.length * 0.6)
    ) {
      liquidityTier = "LIQUID";
    } else if (avgDailyVolumeUnits >= LIQUIDITY_THRESHOLDS.moderateMinAvgVolume) {
      liquidityTier = "MODERATE";
    } else if (avgDailyVolumeUnits > 0) {
      liquidityTier = "LOW";
    } else {
      liquidityTier = "ILLIQUID";
    }
  }
  if (liquidityTier === "LOW" || liquidityTier === "ILLIQUID") {
    flags.push("LOW_LIQUIDITY");
  }

  let spreadPct: number | null = null;
  if (latest.bidPrice !== null && latest.askPrice !== null && latest.bidPrice > 0) {
    const mid = (latest.bidPrice + latest.askPrice) / 2;
    spreadPct = ((latest.askPrice - latest.bidPrice) / mid) * 100;
    if (spreadPct > WIDE_SPREAD_THRESHOLD_PCT) flags.push("WIDE_SPREAD");
  }

  // Suspect single-session move vs. the immediately preceding snapshot.
  const prior = recentWindow.find((s) => s.lastTradedPrice !== null && s.asOf < latest.asOf);
  if (prior && prior.lastTradedPrice && latest.lastTradedPrice) {
    const movePct =
      (Math.abs(latest.lastTradedPrice - prior.lastTradedPrice) / prior.lastTradedPrice) * 100;
    if (movePct > SUSPECT_MOVE_THRESHOLD_PCT) flags.push("SUSPECT_MOVE");
  }

  const isReliable =
    !flags.includes("STALE") &&
    !flags.includes("MISSING_PRICE") &&
    !flags.includes("NO_RECENT_TRADE") &&
    !flags.includes("SUSPECT_MOVE");

  return {
    flags,
    isReliable,
    staleDays: Math.max(0, staleDays),
    liquidityTier,
    avgDailyVolumeUnits,
    tradedSessionsInWindow,
    spreadPct,
  };
}
