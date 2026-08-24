/**
 * Market-data provider abstraction.
 *
 * The rest of the app (calculation engine, API routes, ingestion job) only
 * ever talks to this interface. Swapping data sources — mock → NSE/BSE
 * bhavcopy → a paid broker API — means writing one new class here and
 * flipping an environment variable; nothing else changes.
 *
 * See README "Data sources" for the research behind why this app ships with
 * a mock provider and a documented (but not auto-fetching) bhavcopy CSV
 * parser rather than a live free API: no free, licensed, real-time API for
 * SGB secondary-market quotes was found to exist for India as of this
 * writing. See that section before wiring up a production data feed.
 */

export interface TrancheMasterRecord {
  isin: string;
  seriesName: string;
  issueDate: Date;
  maturityDate: Date;
  earlyExitFrom: Date;
  issuePriceInr: number;
  couponRatePct: number;
  issueSizeUnits: number | null;
  status: "ACTIVE" | "MATURED" | "DELISTED";
}

export interface PriceQuote {
  isin: string;
  asOf: Date;
  lastTradedPrice: number | null;
  bidPrice: number | null;
  askPrice: number | null;
  volumeUnits: number | null;
  numTrades: number | null;
  exchange: "NSE" | "BSE" | "MOCK";
}

export interface GoldPriceQuote {
  asOf: Date;
  pricePerGram: number; // INR, 999 purity
}

export interface ProviderFetchResult {
  tranches: TrancheMasterRecord[];
  quotes: PriceQuote[];
  gold: GoldPriceQuote;
  /** Non-fatal problems encountered while fetching (missing files, unparseable rows, etc). */
  warnings: string[];
}

export interface MarketDataProvider {
  /** Stable identifier persisted on IngestionRun/PriceSnapshot rows, e.g. "mock-provider". */
  readonly id: string;
  /** Human-readable description of freshness/latency, shown in the UI's data-freshness banner. */
  readonly freshnessLabel: string;
  /** `asOf` lets callers (notably the seed script) backfill historical days; omit for "now". */
  fetchAll(asOf?: Date): Promise<ProviderFetchResult>;
}
