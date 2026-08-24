import "dotenv/config";
import { prisma } from "../src/lib/db";
import { runIngestion } from "../src/lib/ingest";

/**
 * Seeds the database with ~21 trading days of history (using the mock
 * provider by default) so the dashboard's charts and liquidity/staleness
 * heuristics have something meaningful to show immediately after setup.
 * Run with `npm run db:seed`.
 */
async function main() {
  console.log("Seeding SGB Tracker database with sample data...");

  const days: Date[] = [];
  const cursor = new Date();
  cursor.setHours(9, 0, 0, 0);
  while (days.length < 21) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days.unshift(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }

  for (let i = 0; i < days.length; i++) {
    const isLast = i === days.length - 1;
    const result = await runIngestion({ asOf: days[i], skipAlertEvaluation: !isLast });
    console.log(
      `  [${days[i].toISOString().slice(0, 10)}] ${result.status} — ${result.tranchesUpdated} snapshots` +
        (result.warnings.length ? ` (${result.warnings.length} warnings)` : "")
    );
  }

  const trancheCount = await prisma.tranche.count();
  const activeCount = await prisma.tranche.count({ where: { status: "ACTIVE" } });
  console.log(`Done. ${trancheCount} tranches loaded (${activeCount} active).`);

  await seedSampleAlertRules();
}

async function seedSampleAlertRules() {
  const existing = await prisma.alertRule.count();
  if (existing > 0) return;
  await prisma.alertRule.createMany({
    data: [
      { type: "YTM_ABOVE", thresholdValue: 8, label: "Any tranche YTM crosses 8%" },
      { type: "DISCOUNT_BELOW", thresholdValue: -3, label: "Any tranche trades ≥3% below gold" },
      { type: "NEW_CHEAPEST", thresholdValue: null, label: "Cheapest SGB changes" },
    ],
  });
  console.log("Seeded 3 sample alert rules.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
