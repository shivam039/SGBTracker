import { PriceQuote } from "./types";

/**
 * Adapter for NSE/BSE end-of-day "bhavcopy" files — the most realistic free,
 * legally usable path to real secondary-market SGB prices for a personal
 * project, based on the research documented in README "Data sources":
 *
 *   - NSE and BSE both publish daily EOD bhavcopy files (CSV, one row per
 *     traded security) that include the "SG"/debt segment SGBs trade in.
 *     They are free to download from the exchanges' public archive URLs and
 *     commonly used by retail tooling for low-frequency (once-daily), non-
 *     systematic personal use.
 *   - This is DELAYED, END-OF-DAY data only — there is no free, licensed
 *     real-time/intraday SGB quote API. Real-time quotes require a paid
 *     broker API (Zerodha Kite Connect, Upstox, ICICI Breeze, etc.), a
 *     funded trading account, and acceptance of that broker's data-license
 *     terms — out of scope for this app's default configuration.
 *   - Exact download URLs and column layouts change over time and are not
 *     hard-coded here to avoid silently breaking against a moving target.
 *     Point `bhavcopyCsvText` at whatever file you've downloaded (or fetch
 *     it yourself and pass the text in) and this module does the parsing.
 *
 * This class is NOT wired into the app by default (see providers/index.ts —
 * MockMarketDataProvider is used unless you complete the fetch step below).
 * The CSV parser itself (`parseNseBhavcopyCsv`) is fully implemented against
 * NSE's standard bhavcopy column layout and unit-tested, so wiring this up
 * for real is a matter of (a) fetching the day's file from NSE/BSE — by
 * download, by a scheduled scraper you write and legally review, or by a
 * paid vendor — and (b) passing its text into `parseNseBhavcopyCsv`.
 */
export function parseNseBhavcopyCsv(csvText: string, isinWhitelist: Set<string>): PriceQuote[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toUpperCase());
  const col = (name: string) => header.indexOf(name);

  const idxSymbol = col("SYMBOL");
  const idxIsin = col("ISIN");
  const idxClose = col("CLOSE_PRICE");
  const idxLast = col("LAST_PRICE");
  const idxPrevClose = col("PREV_CLOSE");
  const idxQty = col("TTL_TRD_QNTY");
  const idxTrades = col("NO_OF_TRADES");
  const idxDate = col("TRADE_DATE");

  const quotes: PriceQuote[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = splitCsvLine(line);
    const isin = idxIsin >= 0 ? cells[idxIsin]?.trim() : undefined;
    if (!isin || !isinWhitelist.has(isin)) continue;

    const lastTradedPrice = toNum(cells[idxLast] ?? cells[idxClose]);
    const closePrice = toNum(cells[idxClose] ?? cells[idxPrevClose]);
    const volumeUnits = toNum(cells[idxQty]);
    const numTrades = toNum(cells[idxTrades]);
    const asOf = idxDate >= 0 ? parseDate(cells[idxDate]) : new Date();

    quotes.push({
      isin,
      asOf,
      lastTradedPrice: lastTradedPrice ?? closePrice,
      bidPrice: null, // bhavcopy is EOD trade data only; NSE does not publish EOD bid/ask
      askPrice: null,
      volumeUnits,
      numTrades,
      exchange: "NSE",
    });

    void idxSymbol; // reserved for future symbol-based cross-checks/logging
  }
  return quotes;
}

function splitCsvLine(line: string): string[] {
  return line.split(",").map((c) => c.replace(/^"|"$/g, ""));
}

function toNum(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseDate(v: string | undefined): Date {
  if (!v) return new Date();
  // NSE bhavcopy typically uses DD-MMM-YYYY (e.g. 24-AUG-2026).
  const m = v.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (m) {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const monthIdx = months.indexOf(m[2].toUpperCase());
    if (monthIdx >= 0) return new Date(Number(m[3]), monthIdx, Number(m[1]));
  }
  const parsed = new Date(v);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}
