import { prisma } from "./db";
import { getMarketDataProvider } from "./providers";
import { STALENESS_THRESHOLD_DAYS } from "./calc/dataQuality";
import { differenceInCalendarDays } from "date-fns";

export interface FreshnessMeta {
  providerId: string;
  providerLabel: string;
  latestRun: {
    id: string;
    startedAt: Date;
    finishedAt: Date | null;
    status: string;
    tranchesUpdated: number;
    errorCount: number;
  } | null;
  goldPriceAsOf: Date | null;
  goldPricePerGram: number | null;
  staleDaysThreshold: number;
  dataAgeDays: number | null;
  isStale: boolean;
}

export async function getFreshnessMeta(): Promise<FreshnessMeta> {
  const provider = getMarketDataProvider();
  const [latestRun, goldSnapshot] = await Promise.all([
    prisma.ingestionRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.goldPriceSnapshot.findFirst({ orderBy: { asOf: "desc" } }),
  ]);

  const dataAgeDays = goldSnapshot ? differenceInCalendarDays(new Date(), goldSnapshot.asOf) : null;

  return {
    providerId: provider.id,
    providerLabel: provider.freshnessLabel,
    latestRun: latestRun
      ? {
          id: latestRun.id,
          startedAt: latestRun.startedAt,
          finishedAt: latestRun.finishedAt,
          status: latestRun.status,
          tranchesUpdated: latestRun.tranchesUpdated,
          errorCount: latestRun.errorCount,
        }
      : null,
    goldPriceAsOf: goldSnapshot?.asOf ?? null,
    goldPricePerGram: goldSnapshot?.pricePerGram ?? null,
    staleDaysThreshold: STALENESS_THRESHOLD_DAYS,
    dataAgeDays,
    isStale: dataAgeDays !== null && dataAgeDays > STALENESS_THRESHOLD_DAYS,
  };
}
