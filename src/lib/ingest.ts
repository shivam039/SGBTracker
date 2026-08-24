import { prisma } from "./db";
import { getMarketDataProvider } from "./providers";
import { STALENESS_THRESHOLD_DAYS } from "./calc/dataQuality";
import { computeAllEconomics } from "./query";
import { evaluateAlerts } from "./alerts";
import { differenceInCalendarDays } from "date-fns";

export interface IngestResult {
  runId: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  tranchesUpdated: number;
  warnings: string[];
  alertsFired: number;
}

export interface RunIngestionOptions {
  /** Simulated "as of" date, used by prisma/seed.ts to backfill history. Defaults to now. */
  asOf?: Date;
  /** Skip the (relatively expensive) alert evaluation pass — used while backfilling many historical days. */
  skipAlertEvaluation?: boolean;
}

/**
 * One full refresh cycle: fetch from the configured provider, upsert tranche
 * master data, append a price snapshot per tranche + a gold price snapshot,
 * recompute economics, and evaluate alert rules. Used by both the manual
 * `/api/refresh` route and `prisma/seed.ts` (for the initial data load).
 */
export async function runIngestion(options: RunIngestionOptions = {}): Promise<IngestResult> {
  const provider = getMarketDataProvider();
  const run = await prisma.ingestionRun.create({
    data: { provider: provider.id, status: "RUNNING" },
  });

  const warnings: string[] = [];
  let tranchesUpdated = 0;

  try {
    const { tranches, quotes, gold, warnings: providerWarnings } = await provider.fetchAll(options.asOf);
    warnings.push(...providerWarnings);

    await prisma.goldPriceSnapshot.upsert({
      where: { asOf: gold.asOf },
      create: { asOf: gold.asOf, pricePerGram: gold.pricePerGram, source: provider.id },
      update: { pricePerGram: gold.pricePerGram, source: provider.id },
    });

    const trancheIdByIsin = new Map<string, string>();
    for (const t of tranches) {
      const row = await prisma.tranche.upsert({
        where: { isin: t.isin },
        create: {
          isin: t.isin,
          seriesName: t.seriesName,
          issueDate: t.issueDate,
          maturityDate: t.maturityDate,
          earlyExitFrom: t.earlyExitFrom,
          issuePriceInr: t.issuePriceInr,
          couponRatePct: t.couponRatePct,
          issueSizeUnits: t.issueSizeUnits,
          status: t.status,
        },
        update: {
          seriesName: t.seriesName,
          status: t.status,
        },
      });
      trancheIdByIsin.set(t.isin, row.id);
    }

    const now = options.asOf ?? new Date();
    for (const q of quotes) {
      const trancheId = trancheIdByIsin.get(q.isin);
      if (!trancheId) {
        warnings.push(`Quote for unknown ISIN ${q.isin} skipped.`);
        continue;
      }
      const staleDays = Math.max(0, differenceInCalendarDays(now, q.asOf));
      const isStale = staleDays > STALENESS_THRESHOLD_DAYS;

      let dataQuality = "OK";
      if (isStale) dataQuality = "STALE";
      else if (!q.lastTradedPrice) dataQuality = "NO_TRADE";
      else if ((q.volumeUnits ?? 0) === 0) dataQuality = "LOW_LIQUIDITY";
      else if (q.bidPrice && q.askPrice) {
        const mid = (q.bidPrice + q.askPrice) / 2;
        if (mid > 0 && ((q.askPrice - q.bidPrice) / mid) * 100 > 3) dataQuality = "WIDE_SPREAD";
      }

      await prisma.priceSnapshot.create({
        data: {
          trancheId,
          asOf: q.asOf,
          lastTradedPrice: q.lastTradedPrice,
          bidPrice: q.bidPrice,
          askPrice: q.askPrice,
          volumeUnits: q.volumeUnits,
          numTrades: q.numTrades,
          exchange: q.exchange,
          source: provider.id,
          isStale,
          staleDays,
          dataQuality,
          ingestionRunId: run.id,
        },
      });
      tranchesUpdated++;
    }

    const status = warnings.length > 0 ? "PARTIAL" : "SUCCESS";
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAt: new Date(),
        tranchesUpdated,
        errorCount: warnings.length,
        errors: warnings.length ? JSON.stringify(warnings) : null,
      },
    });

    let alertsFired = 0;
    if (!options.skipAlertEvaluation) {
      const all = await computeAllEconomics({ now });
      alertsFired = await evaluateAlerts(all);
    }

    return { runId: run.id, status, tranchesUpdated, warnings, alertsFired };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        tranchesUpdated,
        errorCount: warnings.length + 1,
        errors: JSON.stringify([...warnings, message]),
      },
    });
    return { runId: run.id, status: "FAILED", tranchesUpdated, warnings: [...warnings, message], alertsFired: 0 };
  }
}
