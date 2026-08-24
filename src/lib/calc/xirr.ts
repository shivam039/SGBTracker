import { CashFlow } from "./types";
import { yearFraction } from "./dates";

/**
 * Net present value of a set of dated cash flows at annual rate `rate`,
 * discounted Actual/365 from the first cash flow's date.
 */
function npv(rate: number, flows: CashFlow[], anchor: Date): number {
  return flows.reduce((sum, cf) => {
    const t = yearFraction(anchor, cf.date);
    return sum + cf.amount / Math.pow(1 + rate, t);
  }, 0);
}

function dNpv(rate: number, flows: CashFlow[], anchor: Date): number {
  return flows.reduce((sum, cf) => {
    const t = yearFraction(anchor, cf.date);
    if (t === 0) return sum;
    return sum - (t * cf.amount) / Math.pow(1 + rate, t + 1);
  }, 0);
}

/**
 * Annualized internal rate of return (XIRR) for a set of dated cash flows,
 * e.g. [-purchasePrice today, +coupon, +coupon, ..., +redemption at maturity].
 *
 * Solved with Newton-Raphson (fast, exact) and a bisection fallback (robust)
 * when Newton fails to converge or walks outside a sane bound. SGB cash-flow
 * patterns are a single outflow followed by inflows, so NPV(rate) is strictly
 * decreasing for rate > -1 and a root is guaranteed to exist whenever the
 * total inflows exceed the outflow (otherwise the answer is < -100%, which we
 * clamp and flag rather than return misleadingly).
 *
 * Returns the rate as a percentage (e.g. 7.35 for 7.35%/yr), or null if no
 * sensible root could be found (e.g. degenerate/empty cash flows).
 */
export function xirr(flows: CashFlow[]): number | null {
  if (flows.length < 2) return null;
  const anchor = flows[0].date;
  const hasOutflow = flows.some((f) => f.amount < 0);
  const hasInflow = flows.some((f) => f.amount > 0);
  if (!hasOutflow || !hasInflow) return null;

  // Newton-Raphson from a reasonable starting guess.
  let rate = 0.08;
  for (let i = 0; i < 60; i++) {
    const f = npv(rate, flows, anchor);
    const fPrime = dNpv(rate, flows, anchor);
    if (Math.abs(f) < 1e-6) return round(rate * 100);
    if (fPrime === 0) break;
    const next = rate - f / fPrime;
    if (!isFinite(next) || next <= -0.999999) break;
    rate = next;
  }

  // Bisection fallback over a wide, economically sane bound.
  let lo = -0.99;
  let hi = 5; // 500%/yr upper bound — anything beyond this is not a meaningful answer
  let fLo = npv(lo, flows, anchor);
  const fHi = npv(hi, flows, anchor);
  if (fLo === 0) return round(lo * 100);
  if (fHi === 0) return round(hi * 100);
  if ((fLo > 0 && fHi > 0) || (fLo < 0 && fHi < 0)) {
    // No sign change in bounds — cannot bracket a root reliably.
    return null;
  }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, flows, anchor);
    if (Math.abs(fMid) < 1e-6) return round(mid * 100);
    if ((fLo < 0 && fMid < 0) || (fLo > 0 && fMid > 0)) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }
  return round(((lo + hi) / 2) * 100);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
