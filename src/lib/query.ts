import { prisma } from "./db";
import { computeSgbEconomics, GoldReference, LatestMarketData, RecentSnapshot, SgbEconomics, TrancheInput } from "./calc";

const RECENT_WINDOW_SIZE = 6; // latest + 5 prior sessions, used for liquidity/staleness heuristics

export interface ComputeAllOptions {
  goldGrowthRatePct?: number;
  now?: Date;
  includeMatured?: boolean;
}

/**
 * Loads the latest reference gold price and, for every tranche, its latest
 * price snapshot plus a short trailing window, then runs each through the
 * calculation engine. This is the single read path every API route and the
 * alert evaluator use, so "current state of the world" is always computed
 * consistently.
 */
export async function computeAllEconomics(options: ComputeAllOptions = {}): Promise<SgbEconomics[]> {
  const now = options.now ?? new Date();
  const goldGrowthRatePct =
    options.goldGrowthRatePct ?? Number(process.env.DEFAULT_GOLD_GROWTH_RATE_PCT ?? 8);

  const goldSnapshot = await prisma.goldPriceSnapshot.findFirst({ orderBy: { asOf: "desc" } });
  if (!goldSnapshot) return [];
  const gold: GoldReference = { asOf: goldSnapshot.asOf, pricePerGram: goldSnapshot.pricePerGram };

  const tranches = await prisma.tranche.findMany({
    where: options.includeMatured ? {} : { status: "ACTIVE" },
    orderBy: { issueDate: "asc" },
  });

  const results = await Promise.all(
    tranches.map(async (t) => {
      const snapshots = await prisma.priceSnapshot.findMany({
        where: { trancheId: t.id },
        orderBy: { asOf: "desc" },
        take: RECENT_WINDOW_SIZE,
      });
      if (snapshots.length === 0) return null;

      const latestRow = snapshots[0];
      const latest: LatestMarketData = {
        asOf: latestRow.asOf,
        lastTradedPrice: latestRow.lastTradedPrice,
        bidPrice: latestRow.bidPrice,
        askPrice: latestRow.askPrice,
        volumeUnits: latestRow.volumeUnits,
        exchange: latestRow.exchange,
      };
      const recentWindow: RecentSnapshot[] = snapshots.map((s) => ({
        asOf: s.asOf,
        lastTradedPrice: s.lastTradedPrice,
        volumeUnits: s.volumeUnits,
      }));

      const trancheInput: TrancheInput = {
        isin: t.isin,
        seriesName: t.seriesName,
        issueDate: t.issueDate,
        maturityDate: t.maturityDate,
        earlyExitFrom: t.earlyExitFrom,
        issuePriceInr: t.issuePriceInr,
        couponRatePct: t.couponRatePct,
      };

      return computeSgbEconomics({
        tranche: trancheInput,
        latest,
        recentWindow,
        gold,
        now,
        goldGrowthRatePct,
      });
    })
  );

  return results.filter((r): r is SgbEconomics => r !== null);
}

export async function computeOneEconomics(
  isin: string,
  options: ComputeAllOptions = {}
): Promise<SgbEconomics | null> {
  const all = await computeAllEconomics({ ...options, includeMatured: true });
  return all.find((s) => s.isin === isin) ?? null;
}
