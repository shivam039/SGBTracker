import { SgbEconomics } from "./types";

/**
 * "Cheapest SGB" is defined as: the reliably-priced, actively-tradable
 * tranche with the highest annualized YTM (IRR of dated cash flows —
 * purchase outflow today, remaining coupons, gold-linked redemption at
 * maturity) computed with the gold reference price held FLAT at today's
 * value.
 *
 * Why YTM-flat rather than raw price or raw discount-to-gold:
 *  - Raw market price ignores tenure and coupon income entirely — a tranche
 *    priced low mostly because it matures in 8 months, or has few coupons
 *    left, is not "cheap" in any economic sense.
 *  - Discount-to-gold is a useful, model-free snapshot, but it is a single
 *    point-in-time metric: it doesn't account for the coupon income earned
 *    while waiting, or for how much time that discount has to close.
 *  - YTM converts price + coupons + tenure + redemption into one
 *    apples-to-apples annualized number, which is exactly what "which
 *    tranche should I buy" needs.
 *  - Holding the gold price flat (rather than assuming appreciation) keeps
 *    the comparison free of a speculative forecast: every tranche is judged
 *    under the *same* neutral gold assumption, so differences in YTM come
 *    purely from how each tranche is priced today relative to its own cash
 *    flows — which is the thing that actually varies tranche to tranche.
 *  - Tranches with stale, missing, illiquid, or suspect price data are
 *    excluded from the "cheapest right now" headline even if their computed
 *    YTM looks attractive, because that number cannot be trusted.
 */
export function pickCheapest(all: SgbEconomics[]): SgbEconomics | null {
  const eligible = all.filter(
    (s) => s.isReliable && !s.isMatured && s.ytmFlatPct !== null && s.marketPrice !== null
  );
  if (eligible.length === 0) return null;
  return eligible.reduce((best, cur) => (cur.ytmFlatPct! > best.ytmFlatPct! ? cur : best));
}

export function topByYtm(all: SgbEconomics[], n = 5): SgbEconomics[] {
  return reliableActive(all)
    .filter((s) => s.ytmFlatPct !== null)
    .sort((a, b) => b.ytmFlatPct! - a.ytmFlatPct!)
    .slice(0, n);
}

export function topByDiscountToGold(all: SgbEconomics[], n = 5): SgbEconomics[] {
  return reliableActive(all)
    .filter((s) => s.discountPremiumPct !== null)
    .sort((a, b) => a.discountPremiumPct! - b.discountPremiumPct!) // most negative (deepest discount) first
    .slice(0, n);
}

export function topByExpectedReturn(all: SgbEconomics[], n = 5): SgbEconomics[] {
  return reliableActive(all)
    .filter((s) => s.simpleAnnualizedReturnFlatPct !== null)
    .sort((a, b) => b.simpleAnnualizedReturnFlatPct! - a.simpleAnnualizedReturnFlatPct!)
    .slice(0, n);
}

export function mostLiquid(all: SgbEconomics[], n = 5): SgbEconomics[] {
  return all
    .filter((s) => !s.isMatured && s.avgDailyVolumeUnits !== null)
    .sort((a, b) => (b.avgDailyVolumeUnits ?? 0) - (a.avgDailyVolumeUnits ?? 0))
    .slice(0, n);
}

export function tradingAtPremium(all: SgbEconomics[], n = 5): SgbEconomics[] {
  return reliableActive(all)
    .filter((s) => (s.discountPremiumPct ?? 0) > 0)
    .sort((a, b) => (b.discountPremiumPct ?? 0) - (a.discountPremiumPct ?? 0))
    .slice(0, n);
}

export function tradingAtDiscount(all: SgbEconomics[], n = 5): SgbEconomics[] {
  return reliableActive(all)
    .filter((s) => (s.discountPremiumPct ?? 0) < 0)
    .sort((a, b) => (a.discountPremiumPct ?? 0) - (b.discountPremiumPct ?? 0))
    .slice(0, n);
}

function reliableActive(all: SgbEconomics[]): SgbEconomics[] {
  return all.filter((s) => s.isReliable && !s.isMatured);
}
