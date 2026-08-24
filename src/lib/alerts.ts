import { prisma } from "./db";
import { pickCheapest, SgbEconomics } from "./calc";

/**
 * Evaluates every active AlertRule against the latest computed economics and
 * writes an AlertEvent for each newly-triggered condition. Called at the end
 * of every ingestion run (see ingest.ts) so alerts stay current with data.
 *
 * Debouncing: a rule doesn't re-fire if it already produced an event today
 * for the same tranche, so a condition that stays true doesn't spam the feed
 * on every refresh — the existing event remains visible in the feed instead.
 */
export async function evaluateAlerts(all: SgbEconomics[]): Promise<number> {
  const rules = await prisma.alertRule.findMany({ where: { isActive: true } });
  if (rules.length === 0) return 0;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  let firedCount = 0;

  for (const rule of rules) {
    let candidates = all;
    if (rule.trancheId) {
      const scopedTranche = await prisma.tranche.findUnique({ where: { id: rule.trancheId } });
      candidates = scopedTranche ? all.filter((s) => s.isin === scopedTranche.isin) : [];
    }

    if (rule.type === "NEW_CHEAPEST") {
      const cheapest = pickCheapest(all);
      if (!cheapest) continue;
      const lastEvent = await prisma.alertEvent.findFirst({
        where: { alertRuleId: rule.id },
        orderBy: { triggeredAt: "desc" },
      });
      const cheapestTranche = await prisma.tranche.findUnique({ where: { isin: cheapest.isin } });
      if (!cheapestTranche) continue;
      if (lastEvent?.trancheId === cheapestTranche.id) continue; // unchanged, don't re-fire
      await prisma.alertEvent.create({
        data: {
          alertRuleId: rule.id,
          trancheId: cheapestTranche.id,
          message: `${cheapest.seriesName} (${cheapest.isin}) is now the cheapest SGB by YTM (${cheapest.ytmFlatPct?.toFixed(2)}%).`,
          valueAtTrigger: cheapest.ytmFlatPct ?? undefined,
        },
      });
      firedCount++;
      continue;
    }

    for (const s of candidates) {
      const trigger = evaluateSimpleRule(rule.type, rule.thresholdValue, s);
      if (!trigger.fires) continue;

      const tranche = await prisma.tranche.findUnique({ where: { isin: s.isin } });
      if (!tranche) continue;

      const existingToday = await prisma.alertEvent.findFirst({
        where: { alertRuleId: rule.id, trancheId: tranche.id, triggeredAt: { gte: startOfToday } },
      });
      if (existingToday) continue;

      await prisma.alertEvent.create({
        data: {
          alertRuleId: rule.id,
          trancheId: tranche.id,
          message: trigger.message,
          valueAtTrigger: trigger.value,
        },
      });
      firedCount++;
    }
  }

  return firedCount;
}

function evaluateSimpleRule(
  type: string,
  threshold: number | null,
  s: SgbEconomics
): { fires: boolean; message: string; value?: number } {
  if (threshold === null) return { fires: false, message: "" };

  switch (type) {
    case "DISCOUNT_BELOW":
      if (s.discountPremiumPct !== null && s.discountPremiumPct <= threshold) {
        return {
          fires: true,
          value: s.discountPremiumPct,
          message: `${s.seriesName} (${s.isin}) is trading at ${s.discountPremiumPct.toFixed(2)}% to gold, at/below your ${threshold}% threshold.`,
        };
      }
      break;
    case "YTM_ABOVE":
      if (s.ytmFlatPct !== null && s.ytmFlatPct >= threshold) {
        return {
          fires: true,
          value: s.ytmFlatPct,
          message: `${s.seriesName} (${s.isin}) YTM is ${s.ytmFlatPct.toFixed(2)}%, at/above your ${threshold}% threshold.`,
        };
      }
      break;
    case "PRICE_BELOW":
      if (s.marketPrice !== null && s.marketPrice <= threshold) {
        return {
          fires: true,
          value: s.marketPrice,
          message: `${s.seriesName} (${s.isin}) price is ₹${s.marketPrice.toFixed(2)}, at/below your ₹${threshold} target.`,
        };
      }
      break;
    case "SPREAD_BELOW":
      if (s.spreadPct !== null && s.spreadPct <= threshold) {
        return {
          fires: true,
          value: s.spreadPct,
          message: `${s.seriesName} (${s.isin}) bid/ask spread is ${s.spreadPct.toFixed(2)}%, at/below your ${threshold}% threshold.`,
        };
      }
      break;
  }
  return { fires: false, message: "" };
}
