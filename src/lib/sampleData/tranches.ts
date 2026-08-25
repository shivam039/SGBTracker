import { subMonths } from "date-fns";
import { REAL_SGB_TRANCHES } from "./realTranches";

/**
 * Tranche reference data (dates, symbols, coupon) is REAL — sourced from
 * live secondary-market data via the INDmoney MCP connector on 2026-08-25
 * (see realTranches.ts for the full provenance note and per-tranche
 * source data). What's still modeled/approximate:
 *   - issuePriceInr: not exposed by the data source, approximated from the
 *     illustrative gold-price curve below at each tranche's issue date.
 *   - exact issue day-of-month: the real symbol only encodes maturity
 *     month/year, not day, so both issue and maturity dates are fixed at
 *     the 5th of their respective months as an approximation.
 *   - day-to-day price movement after the anchor date: the mock provider
 *     (see providers/mockProvider.ts) starts from each tranche's real
 *     anchor price and applies a small simulated daily walk from there,
 *     since this app has no automated live feed (MCP connectors are
 *     scoped to an agent chat session, not to this deployed web server —
 *     see README "Data sources").
 *
 * Coupon is a uniform 2.5%/yr, correct for every tranche in this dataset
 * (all postdate the two 2.75% tranches from Nov 2015/Jan 2016, which
 * aren't included here — see realTranches.ts for why).
 */

export interface SampleTrancheDef {
  isin: string;
  seriesName: string;
  issueDate: Date;
  issuePriceInr: number;
  couponRatePct: number;
}

/** Piecewise-linear illustrative gold price curve (INR/gram, 999 purity), used to approximate issue prices. */
const GOLD_CURVE: [string, number][] = [
  ["2015-11-01", 2650],
  ["2017-01-01", 2850],
  ["2018-06-01", 3050],
  ["2019-09-01", 3800],
  ["2020-08-01", 5100],
  ["2021-06-01", 4650],
  ["2022-06-01", 5100],
  ["2023-06-01", 5900],
  ["2024-06-01", 6800],
  ["2025-06-01", 11200],
  ["2026-08-24", 16150],
];

function goldPriceOnDate(date: Date): number {
  const points = GOLD_CURVE.map(([d, p]) => [new Date(d).getTime(), p] as const);
  const t = date.getTime();
  if (t <= points[0][0]) return points[0][1];
  if (t >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [t0, p0] = points[i];
    const [t1, p1] = points[i + 1];
    if (t >= t0 && t <= t1) {
      const frac = (t - t0) / (t1 - t0);
      return p0 + frac * (p1 - p0);
    }
  }
  return points[points.length - 1][1];
}

export function currentSampleGoldPrice(now: Date = new Date()): number {
  return round2(goldPriceOnDate(now));
}

/** Shortens the long official RBI name into a compact display name, e.g. "SGB 2018-19 Series III". */
function shortSeriesName(officialName: string): string {
  const match = officialName.match(/(\d{4}-\d{2,4})\s*[-–]?\s*Series\s+([IVXLCDM]+)/i);
  if (match) return `SGB ${match[1]} Series ${match[2].toUpperCase()}`;
  return officialName;
}

export function buildSampleTranches(): SampleTrancheDef[] {
  return REAL_SGB_TRANCHES.map((t) => {
    const maturityDate = new Date(t.maturityYear, t.maturityMonth - 1, 5);
    const issueDate = subMonths(maturityDate, 96);
    const issuePriceInr = round2(goldPriceOnDate(issueDate));
    return {
      isin: t.symbol,
      seriesName: shortSeriesName(t.officialName),
      issueDate,
      issuePriceInr,
      couponRatePct: 2.5,
    };
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
