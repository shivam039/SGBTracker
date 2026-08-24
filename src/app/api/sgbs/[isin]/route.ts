import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeOneEconomics } from "@/lib/query";
import { getFreshnessMeta } from "@/lib/meta";

export const dynamic = "force-dynamic";

/**
 * GET /api/sgbs/:isin — full detail for the SGB detail page: computed
 * economics, the cash-flow timeline, and the price/gold history series.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ isin: string }> }) {
  const { isin } = await params;
  const { searchParams } = new URL(req.url);
  const goldGrowthParam = searchParams.get("goldGrowth");
  const goldGrowthRatePct = goldGrowthParam !== null ? Number(goldGrowthParam) : undefined;

  const [economics, tranche, freshness] = await Promise.all([
    computeOneEconomics(isin, { goldGrowthRatePct }),
    prisma.tranche.findUnique({ where: { isin } }),
    getFreshnessMeta(),
  ]);

  if (!economics || !tranche) {
    return NextResponse.json({ error: `No tranche found for ISIN ${isin}` }, { status: 404 });
  }

  const [priceHistory, goldHistory] = await Promise.all([
    prisma.priceSnapshot.findMany({
      where: { trancheId: tranche.id },
      orderBy: { asOf: "asc" },
      select: {
        asOf: true,
        lastTradedPrice: true,
        bidPrice: true,
        askPrice: true,
        volumeUnits: true,
        dataQuality: true,
        isStale: true,
      },
    }),
    prisma.goldPriceSnapshot.findMany({
      orderBy: { asOf: "asc" },
      select: { asOf: true, pricePerGram: true },
    }),
  ]);

  return NextResponse.json({
    data: economics,
    tranche,
    priceHistory,
    goldHistory,
    freshness,
  });
}
