import { addMonths, differenceInCalendarDays, isAfter, isBefore, isEqual } from "date-fns";

/** Actual/365 year fraction between two dates — the convention used throughout this engine. */
export function yearFraction(from: Date, to: Date): number {
  return differenceInCalendarDays(to, from) / 365;
}

/**
 * SGB coupons are paid semi-annually from the date of issuance through maturity
 * (8 years = 16 payments). Real RBI tranches sometimes fall on the nearest
 * preceding business day rather than the exact calendar date; we approximate
 * with exact 6-month steps, which is accurate to within a few days — see
 * README "Assumptions" for the full list of simplifications.
 */
export function generateCouponDates(issueDate: Date, maturityDate: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 1; i <= 32; i++) {
    const d = addMonths(issueDate, i * 6);
    if (isAfter(d, maturityDate)) break;
    dates.push(d);
    if (isEqual(d, maturityDate)) break;
  }
  return dates;
}

export function isBeforeOrEqual(a: Date, b: Date): boolean {
  return isBefore(a, b) || isEqual(a, b);
}
