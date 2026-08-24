import { NextRequest, NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/refresh — triggers one ingestion cycle. Intended to be called by
 * a scheduler (Vercel Cron, GitHub Actions cron, or a self-hosted cron job —
 * see README "Scheduler"), guarded by a shared secret so the endpoint can't
 * be triggered by anyone who finds the URL.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const provided =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      new URL(req.url).searchParams.get("secret");
    if (provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runIngestion();
  const status = result.status === "FAILED" ? 500 : 200;
  return NextResponse.json(result, { status });
}
