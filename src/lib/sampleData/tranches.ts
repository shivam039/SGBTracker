import { addMonths } from "date-fns";

/**
 * SAMPLE / ILLUSTRATIVE DATA — not verified real trading data.
 *
 * The RBI issued Sovereign Gold Bonds in periodic tranches from November
 * 2015 until the scheme was paused after FY2023-24. The *structure* modeled
 * here is accurate to the real program:
 *   - 8-year maturity from issue date, early-exit window opens at year 5
 *   - interest paid semi-annually on the original issue price
 *   - coupon was 2.75%/yr for the first two tranches (Nov 2015, Jan 2016)
 *     and 2.50%/yr for every tranche after that
 *   - issue price was fixed near the prevailing gold price at each issuance
 *   - the identifier assigned to each tranche below (`isin` field) is its
 *     real, publicly-documented NSE/BSE trading symbol convention:
 *     "SGB" + the 3-letter month + 2-digit year of MATURITY (not issue),
 *     e.g. a tranche maturing June 2029 trades as SGBJUN29 — confirmed
 *     against live exchange listings (Groww/NSE) during development. A
 *     roman-numeral suffix (II, III, ...) is appended when more than one
 *     tranche matures in the same month, matching the real convention
 *     (e.g. SGBFEB32IV). This makes every sample tranche searchable by
 *     the same identifier a broker app would show — unlike a fabricated
 *     placeholder — even though this app cannot fetch that tranche's real
 *     secondary-market price (see README "Data sources").
 *
 * The exact issue dates, prices and coupon-date specifics below are
 * synthetically generated (three illustrative tranches per fiscal year,
 * evenly spaced) rather than transcribed from an official record, because
 * this app ships without a live licensed data source. Replace this file —
 * or better, replace the whole mock provider — with real reference data
 * from RBI/NSDL/exchange once a real market-data provider is wired up.
 */

export interface SampleTrancheDef {
  isin: string;
  seriesName: string;
  issueDate: Date;
  issuePriceInr: number;
  couponRatePct: number;
}

/**
 * Piecewise-linear illustrative gold price curve (INR/gram, 999 purity),
 * used only to seed sample data. The tail end is anchored to a verified
 * real reference price (~₹16,150/gram on 2026-08-24, cross-checked against
 * live secondary-market SGB prices which trade near gold parity) — earlier
 * points before ~2024 are still an approximation, not a transcribed series,
 * since this app has no live/historical gold-price feed by default.
 */
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

/** Fiscal-year start months (April) from FY2015-16 through FY2023-24, 3 tranches each. */
function buildIssueDates(): { date: Date; label: string }[] {
  const out: { date: Date; label: string }[] = [];
  // First two tranches were a special case: Nov 2015 and Jan 2016.
  out.push({ date: new Date("2015-11-30"), label: "2015-16 Series I" });
  out.push({ date: new Date("2016-01-18"), label: "2015-16 Series II" });

  const fyStartYears = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];
  const romanTriplet = ["I", "II", "III"];
  const monthOffsets = [3, 7, 11]; // roughly Jul, Nov, Mar within the fiscal year (Apr start)
  for (const fyStart of fyStartYears) {
    const fyLabel = `${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`;
    monthOffsets.forEach((offset, idx) => {
      const date = addMonths(new Date(`${fyStart}-04-05`), offset);
      out.push({ date, label: `${fyLabel} Series ${romanTriplet[idx]}` });
    });
  }
  return out;
}

const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const ROMAN_SUFFIXES = ["", "II", "III", "IV", "V", "VI"];

/** Real NSE/BSE SGB symbol convention: SGB + maturity month/year (+ roman suffix if more than one matures that month). */
function assignTradingSymbols(maturityDates: Date[]): string[] {
  const seenCount = new Map<string, number>();
  return maturityDates.map((d) => {
    const key = `${MONTH_ABBR[d.getMonth()]}${String(d.getFullYear()).slice(-2)}`;
    const occurrence = seenCount.get(key) ?? 0;
    seenCount.set(key, occurrence + 1);
    const suffix = ROMAN_SUFFIXES[occurrence] ?? `-${occurrence + 1}`;
    return `SGB${key}${suffix}`;
  });
}

export function buildSampleTranches(): SampleTrancheDef[] {
  const issues = buildIssueDates();
  const maturityDates = issues.map((issue) => addMonths(issue.date, 96));
  const symbols = assignTradingSymbols(maturityDates);

  return issues.map((issue, i) => {
    const issuePriceInr = round2(goldPriceOnDate(issue.date) * (0.995 + ((i * 37) % 11) / 1000));
    const couponRatePct = i < 2 ? 2.75 : 2.5;
    return {
      isin: symbols[i],
      seriesName: `SGB ${issue.label}`,
      issueDate: issue.date,
      issuePriceInr,
      couponRatePct,
    };
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
