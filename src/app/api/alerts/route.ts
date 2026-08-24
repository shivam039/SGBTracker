import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALERT_TYPES = ["DISCOUNT_BELOW", "YTM_ABOVE", "PRICE_BELOW", "SPREAD_BELOW", "NEW_CHEAPEST"] as const;

const createSchema = z.object({
  type: z.enum(ALERT_TYPES),
  isin: z.string().optional().nullable(),
  thresholdValue: z.number().optional().nullable(),
  label: z.string().optional().nullable(),
});

/** GET /api/alerts — list alert rules with their tranche (if scoped). */
export async function GET() {
  const rules = await prisma.alertRule.findMany({
    include: { tranche: { select: { isin: true, seriesName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: rules });
}

/** POST /api/alerts — create a new alert rule. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { type, isin, thresholdValue, label } = parsed.data;

  if (type !== "NEW_CHEAPEST" && (thresholdValue === undefined || thresholdValue === null)) {
    return NextResponse.json({ error: "thresholdValue is required for this alert type" }, { status: 400 });
  }

  let trancheId: string | null = null;
  if (isin) {
    const tranche = await prisma.tranche.findUnique({ where: { isin } });
    if (!tranche) return NextResponse.json({ error: `No tranche found for symbol ${isin}` }, { status: 404 });
    trancheId = tranche.id;
  }

  const rule = await prisma.alertRule.create({
    data: { type, trancheId, thresholdValue: thresholdValue ?? null, label: label ?? null },
  });
  return NextResponse.json({ data: rule }, { status: 201 });
}
