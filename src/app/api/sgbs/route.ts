import { NextRequest, NextResponse } from "next/server";
import { computeAllEconomics } from "@/lib/query";
import { getFreshnessMeta } from "@/lib/meta";

export const dynamic = "force-dynamic";

/**
 * GET /api/sgbs?goldGrowth=8&includeMatured=false&q=2018
 * Full list of tranches with computed economics, plus a freshness banner payload.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const goldGrowthParam = searchParams.get("goldGrowth");
  const includeMatured = searchParams.get("includeMatured") === "true";
  const q = searchParams.get("q")?.trim().toLowerCase();

  const goldGrowthRatePct = goldGrowthParam !== null ? Number(goldGrowthParam) : undefined;

  const [all, freshness] = await Promise.all([
    computeAllEconomics({ goldGrowthRatePct, includeMatured }),
    getFreshnessMeta(),
  ]);

  const filtered = q
    ? all.filter((s) => s.isin.toLowerCase().includes(q) || s.seriesName.toLowerCase().includes(q))
    : all;

  return NextResponse.json({ data: filtered, freshness });
}
