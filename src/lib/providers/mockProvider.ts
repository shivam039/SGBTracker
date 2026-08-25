import { addMonths, differenceInCalendarDays } from "date-fns";
import { buildSampleTranches, currentSampleGoldPrice } from "../sampleData/tranches";
import { REAL_SGB_TRANCHES } from "../sampleData/realTranches";
import { hashSeed, mulberry32 } from "../sampleData/rng";
import { GoldPriceQuote, MarketDataProvider, PriceQuote, ProviderFetchResult, TrancheMasterRecord } from "./types";

const ANCHOR_BY_SYMBOL = new Map(REAL_SGB_TRANCHES.map((t) => [t.symbol, t]));

/**
 * Default provider. Tranche identity (symbol, dates, coupon) is real — see
 * sampleData/realTranches.ts. Day-to-day price movement is simulated from
 * each tranche's real anchor price, since this app has no automated live
 * feed (see README "Data sources").
 *
 * Every quote is seeded from (symbol + calendar day), so re-running the
 * refresh job multiple times on the same day returns the same numbers
 * (stable for demos/tests), while each new day produces a small, plausible
 * random walk in price/volume — including deliberately injecting a few
 * data-quality problems (stale quote, zero volume, wide spread) so the
 * dashboard's warning states are exercised out of the box.
 */
export class MockMarketDataProvider implements MarketDataProvider {
  readonly id = "mock-provider";
  readonly freshnessLabel = "Real tranche identity, simulated day-to-day pricing — not a live feed";

  async fetchAll(asOf?: Date): Promise<ProviderFetchResult> {
    const now = asOf ?? new Date();
    const dayKey = now.toISOString().slice(0, 10);
    const warnings: string[] = [];

    const goldToday = currentSampleGoldPrice(now);
    const gold: GoldPriceQuote = { asOf: now, pricePerGram: goldToday };

    const defs = buildSampleTranches();
    const tranches: TrancheMasterRecord[] = defs.map((d) => {
      const maturityDate = addMonths(d.issueDate, 96);
      const earlyExitFrom = addMonths(d.issueDate, 60);
      return {
        isin: d.isin,
        seriesName: d.seriesName,
        issueDate: d.issueDate,
        maturityDate,
        earlyExitFrom,
        issuePriceInr: d.issuePriceInr,
        couponRatePct: d.couponRatePct,
        issueSizeUnits: null,
        status: maturityDate <= now ? "MATURED" : "ACTIVE",
      };
    });

    const quotes: PriceQuote[] = tranches
      .filter((t) => t.status === "ACTIVE")
      .map((t, i) => buildQuote(t, i, now, dayKey, goldToday));

    return { tranches, quotes, gold, warnings };
  }
}

function buildQuote(
  t: TrancheMasterRecord,
  index: number,
  now: Date,
  dayKey: string,
  goldToday: number
): PriceQuote {
  const rand = mulberry32(hashSeed(`${t.isin}:${dayKey}`));
  const anchor = ANCHOR_BY_SYMBOL.get(t.isin);

  let lastTradedPrice: number;
  if (anchor) {
    // Real anchor price, with a small simulated day-to-day walk from it —
    // bigger for days further from the anchor capture date, capped so a
    // long-idle demo doesn't drift into implausible territory.
    const daysSinceAnchor = Math.max(0, differenceInCalendarDays(now, new Date(anchor.anchorAsOf)));
    const driftBudgetPct = Math.min(daysSinceAnchor, 20) * 0.1; // up to ~2% over 20+ days
    const driftPct = (rand() - 0.5) * 2 * driftBudgetPct;
    lastTradedPrice = round2(anchor.anchorPriceInr * (1 + driftPct / 100));
  } else {
    // Fallback for any tranche without real anchor data: model off today's gold reference.
    const yearsOld = (now.getTime() - t.issueDate.getTime()) / (365 * 24 * 3600 * 1000);
    const baseDiscountPct = -1.5 + Math.min(yearsOld, 6) * 0.35;
    const noisePct = (rand() - 0.5) * 4;
    lastTradedPrice = round2(goldToday * (1 + (baseDiscountPct + noisePct) / 100));
  }

  // Inject a handful of realistic data-quality edge cases deterministically.
  const bucket = index % 9;
  const spreadPct = 0.3 + rand() * (bucket === 3 ? 6 : 1.5); // widen spread for ~1 in 9 tranches
  const halfSpread = (lastTradedPrice * spreadPct) / 200;
  const bidPrice = round2(lastTradedPrice - halfSpread);
  const askPrice = round2(lastTradedPrice + halfSpread);

  const isIlliquid = bucket === 6;
  const isStaleDemo = bucket === 8;
  const volumeUnits = isIlliquid
    ? 0
    : Math.round((anchor?.anchorVolumeUnits ?? rand() * 400) * (0.6 + rand() * 0.8));
  const numTrades = volumeUnits > 0 ? Math.max(1, Math.round(volumeUnits / (8 + rand() * 20))) : 0;

  const asOf = isStaleDemo ? new Date(now.getTime() - 9 * 24 * 3600 * 1000) : now;

  return {
    isin: t.isin,
    asOf,
    lastTradedPrice: volumeUnits > 0 || !isIlliquid ? lastTradedPrice : null,
    bidPrice,
    askPrice,
    volumeUnits,
    numTrades,
    exchange: "MOCK",
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
