import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/alerts/events — the triggered-alerts feed, newest first. */
export async function GET() {
  const events = await prisma.alertEvent.findMany({
    include: {
      alertRule: { select: { type: true, label: true } },
      tranche: { select: { isin: true, seriesName: true } },
    },
    orderBy: { triggeredAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ data: events });
}
