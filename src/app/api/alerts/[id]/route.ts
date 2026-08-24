import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** PATCH /api/alerts/:id — toggle isActive. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;
  if (isActive === undefined) {
    return NextResponse.json({ error: "isActive (boolean) is required" }, { status: 400 });
  }
  const rule = await prisma.alertRule.update({ where: { id }, data: { isActive } }).catch(() => null);
  if (!rule) return NextResponse.json({ error: "Alert rule not found" }, { status: 404 });
  return NextResponse.json({ data: rule });
}

/** DELETE /api/alerts/:id */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.alertRule.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
