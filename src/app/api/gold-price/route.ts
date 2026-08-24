import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/gold-price — reference gold price series used for discount/premium math. */
export async function GET() {
  const history = await prisma.goldPriceSnapshot.findMany({
    orderBy: { asOf: "asc" },
    select: { asOf: true, pricePerGram: true, source: true },
  });
  return NextResponse.json({ data: history });
}
