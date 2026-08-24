import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** PATCH /api/alerts/events/:id — mark an alert event acknowledged. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.alertEvent.update({ where: { id }, data: { acknowledged: true } }).catch(() => null);
  if (!event) return NextResponse.json({ error: "Alert event not found" }, { status: 404 });
  return NextResponse.json({ data: event });
}
