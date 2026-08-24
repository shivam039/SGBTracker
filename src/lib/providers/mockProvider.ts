import { addMonths } from "date-fns";
import { buildSampleTranches, currentSampleGoldPrice } from "../sampleData/tranches";
import { hashSeed, mulberry32 } from "../sampleData/rng";
import { GoldPriceQuote, MarketDataProvider, PriceQuote, ProviderFetchResult, TrancheMasterRecord } from "./types";

/**
 * Default provider. Generates deterministic-but-varying sample market data
 * so the app is fully usable without any live data source, per the
 * requirement to ship with mock data and clearly label freshness.
 *
 * Every quote is seeded from (ISIN + calendar day), so re-running the
 * refresh job multiple times on the same day returns the same numbers
 * (stable for demos/tests), while each new day produces a small, plausible
 * random walk in price/volume — including deliberately injecting a few
 * data-quality problems (stale quote, zero volume, wide spread) so the
 * dashboard's warning states are exercised out of the box.
 */
export class MockMarketDataProvider implements MarketDataProvider {
  readonly id = "mock-provider";
  readonly freshnessLabel = "Simulated data — not live market data";

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

  // Longstanding, larger tranches tend to trade at a smaller (sometimes
  // negative) premium and have more volume; newer/smaller ones are noisier.
  const yearsOld = (now.getTime() - t.issueDate.getTime()) / (365 * 24 * 3600 * 1000);
  const baseDiscountPct = -1.5 + Math.min(yearsOld, 6) * 0.35; // drifts from ~-1.5% toward premium as it ages
  const noisePct = (rand() - 0.5) * 4; // +/-2%
  const premiumPct = baseDiscountPct + noisePct;
  const lastTradedPrice = round2(goldToday * (1 + premiumPct / 100));

  // Inject a handful of realistic data-quality edge cases deterministically.
  const bucket = index % 9;
  const spreadPct = 0.3 + rand() * (bucket === 3 ? 6 : 1.5); // widen spread for ~1 in 9 tranches
  const halfSpread = (lastTradedPrice * spreadPct) / 200;
  const bidPrice = round2(lastTradedPrice - halfSpread);
  const askPrice = round2(lastTradedPrice + halfSpread);

  const isIlliquid = bucket === 6;
  const isStaleDemo = bucket === 8;
  const volumeUnits = isIlliquid ? 0 : Math.round(rand() * 400 + (bucket === 0 ? 800 : 0));
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
