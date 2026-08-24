import { NextRequest, NextResponse } from "next/server";
import { computeAllEconomics } from "@/lib/query";
import { getFreshnessMeta } from "@/lib/meta";
import {
  mostLiquid,
  pickCheapest,
  topByDiscountToGold,
  topByExpectedReturn,
  topByYtm,
  tradingAtDiscount,
  tradingAtPremium,
} from "@/lib/calc";

export const dynamic = "force-dynamic";

/** GET /api/rankings — the pre-sliced lists the dashboard renders. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const goldGrowthParam = searchParams.get("goldGrowth");
  const goldGrowthRatePct = goldGrowthParam !== null ? Number(goldGrowthParam) : undefined;

  const [all, freshness] = await Promise.all([
    computeAllEconomics({ goldGrowthRatePct }),
    getFreshnessMeta(),
  ]);

  return NextResponse.json({
    cheapest: pickCheapest(all),
    topByYtm: topByYtm(all),
    topByDiscountToGold: topByDiscountToGold(all),
    topByExpectedReturn: topByExpectedReturn(all),
    mostLiquid: mostLiquid(all),
    tradingAtPremium: tradingAtPremium(all),
    tradingAtDiscount: tradingAtDiscount(all),
    totalTracked: all.length,
    unreliableCount: all.filter((s) => !s.isReliable).length,
    freshness,
  });
}
