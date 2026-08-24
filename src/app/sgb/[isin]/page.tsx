"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SgbDetailResponse } from "@/lib/clientTypes";
import { formatDate, formatInr, formatPct, formatUnits, formatYears } from "@/lib/format";
import { FreshnessBanner } from "@/components/FreshnessBanner";
import { DataQualityBadges, LiquidityBadge } from "@/components/DataQualityBadges";
import { GoldGrowthControl } from "@/components/GoldGrowthControl";
import { PriceGoldChart, HistoryPoint } from "@/components/PriceGoldChart";
import { PremiumChart, PremiumPoint } from "@/components/PremiumChart";

export default function SgbDetailPage() {
  const params = useParams<{ isin: string }>();
  const isin = params.isin;

  const [goldGrowth, setGoldGrowth] = useState(8);
  const [detail, setDetail] = useState<SgbDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/sgbs/${encodeURIComponent(isin)}?goldGrowth=${goldGrowth}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Failed to load ${isin}`);
        }
        const json: SgbDetailResponse = await res.json();
        if (!cancelled) setDetail(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isin, goldGrowth]);

  const priceGoldSeries: HistoryPoint[] = useMemo(() => {
    if (!detail) return [];
    return detail.priceHistory.map((p) => {
      const gold = closestGold(detail.goldHistory, p.asOf);
      return { date: formatDate(p.asOf), price: p.lastTradedPrice, gold: gold?.pricePerGram ?? null };
    });
  }, [detail]);

  const premiumSeries: PremiumPoint[] = useMemo(() => {
    if (!detail) return [];
    return detail.priceHistory.map((p) => {
      const gold = closestGold(detail.goldHistory, p.asOf);
      const premiumPct =
        p.lastTradedPrice !== null && gold ? ((p.lastTradedPrice - gold.pricePerGram) / gold.pricePerGram) * 100 : null;
      return { date: formatDate(p.asOf), premiumPct };
    });
  }, [detail]);

  if (loading) return <div className="rounded-xl border p-10 text-center" style={{ color: "var(--muted)" }}>Loading…</div>;
  if (error || !detail) {
    return (
      <div className="space-y-3">
        <Link href="/" className="text-sm hover:underline">
          ← Back to dashboard
        </Link>
        <div className="rounded-xl border p-6" style={{ borderColor: "var(--negative)" }}>
          <p style={{ color: "var(--negative)" }}>{error ?? "Not found"}</p>
        </div>
      </div>
    );
  }

  const { data: s, tranche } = detail;

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm hover:underline" style={{ color: "var(--muted)" }}>
        ← Back to dashboard
      </Link>

      <FreshnessBanner freshness={detail.freshness} />

      <div className="rounded-xl border p-6" style={{ background: "var(--surface)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{s.seriesName}</h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {s.isin} · Issued {formatDate(tranche.issueDate)} · Matures {formatDate(tranche.maturityDate)}
              {s.isMatured && " (matured)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LiquidityBadge tier={s.liquidityTier} />
            <DataQualityBadges flags={s.dataQualityFlags} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          <Stat label="Market price" value={formatInr(s.marketPrice)} />
          <Stat label="Bid / Ask" value={`${formatInr(s.bidPrice, { decimals: 0 })} / ${formatInr(s.askPrice, { decimals: 0 })}`} />
          <Stat label="Gold value / gram" value={formatInr(s.goldPricePerGram)} />
          <Stat label="Discount/Premium" value={formatPct(s.discountPremiumPct)} />
          <Stat label="Remaining tenure" value={formatYears(s.yearsToMaturity)} />
          <Stat label="Coupon rate" value={`${s.couponRatePct.toFixed(2)}%/yr`} />
          <Stat label="Next coupon" value={s.nextCouponDate ? formatDate(s.nextCouponDate) : "—"} />
          <Stat label="Coupons remaining" value={String(s.numCouponsRemaining)} />
        </div>
      </div>

      <GoldGrowthControl value={goldGrowth} onChange={setGoldGrowth} />

      <div className="grid lg:grid-cols-3 gap-4">
        <YtmCard
          title="YTM — gold flat"
          value={s.ytmFlatPct}
          note="Gold price held at today's reference value. This is the primary, apples-to-apples ranking metric used across all tranches."
          primary
        />
        <YtmCard
          title={`YTM — gold @ ${goldGrowth.toFixed(1)}%/yr`}
          value={s.ytmProjectedPct}
          note="Speculative: assumes the gold price compounds at the rate you set above until maturity."
        />
        <YtmCard
          title="YTM — net of costs"
          value={s.ytmNetOfCostsFlatPct}
          note="Gold flat, after assumed brokerage + other charges on the purchase price (see Methodology)."
        />
      </div>

      <div className="rounded-xl border p-4" style={{ background: "var(--surface)" }}>
        <h2 className="font-semibold mb-3">Price history vs. gold reference</h2>
        <PriceGoldChart data={priceGoldSeries} />
      </div>

      <div className="rounded-xl border p-4" style={{ background: "var(--surface)" }}>
        <h2 className="font-semibold mb-3">Premium/discount to gold — history</h2>
        <PremiumChart data={premiumSeries} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border p-4" style={{ background: "var(--surface)" }}>
          <h2 className="font-semibold mb-3">Expected cash-flow timeline</h2>
          <CashFlowTable cashFlows={s.cashFlowsFlat} />
        </div>
        <div className="rounded-xl border p-4 space-y-3" style={{ background: "var(--surface)" }}>
          <h2 className="font-semibold">Income & liquidity</h2>
          <Row label="Semi-annual coupon" value={formatInr(s.semiAnnualCouponInr)} />
          <Row label="Accrued interest (informational)" value={formatInr(s.accruedInterestInr)} />
          <Row label="Remaining coupon income" value={formatInr(s.remainingCouponIncomeInr)} />
          <Row label="Expected redemption (gold flat)" value={formatInr(s.redemptionValueFlatInr)} />
          <Row label={`Expected redemption (@ ${goldGrowth.toFixed(1)}%/yr)`} value={formatInr(s.redemptionValueProjectedInr)} />
          <Row label="Total expected cash flows (gold flat)" value={formatInr(s.totalExpectedCashFlowsFlatInr)} />
          <Row label="Avg daily volume" value={`${formatUnits(s.avgDailyVolumeUnits)} g/day`} />
          <Row label="Sessions traded (window)" value={`${s.tradedSessionsInWindow} / ${s.windowSessions}`} />
          <Row label="Bid/ask spread" value={s.spreadPct !== null ? `${formatInr(s.spread)} (${formatPct(s.spreadPct)})` : "—"} />
        </div>
      </div>

      <RisksPanel />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function YtmCard({ title, value, note, primary }: { title: string; value: number | null; note: string; primary?: boolean }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: primary ? "color-mix(in srgb, var(--accent) 10%, var(--surface))" : "var(--surface)",
        borderColor: primary ? "var(--accent)" : "var(--border)",
      }}
    >
      <div className="text-xs font-medium" style={{ color: "var(--muted)" }}>
        {title}
      </div>
      <div className="text-2xl font-bold mt-1" style={{ color: primary ? "var(--accent-strong)" : "var(--foreground)" }}>
        {formatPct(value)}
      </div>
      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        {note}
      </p>
    </div>
  );
}

function CashFlowTable({ cashFlows }: { cashFlows: { date: string; amount: number; kind: string }[] }) {
  if (cashFlows.length === 0) {
    return <p className="text-sm" style={{ color: "var(--muted)" }}>No cash-flow data available.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className="py-1.5 font-medium" style={{ color: "var(--muted)" }}>
            Date
          </th>
          <th className="py-1.5 font-medium" style={{ color: "var(--muted)" }}>
            Type
          </th>
          <th className="py-1.5 font-medium text-right" style={{ color: "var(--muted)" }}>
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {cashFlows.map((cf, i) => (
          <tr key={i} className="border-b last:border-0">
            <td className="py-1.5">{formatDate(cf.date)}</td>
            <td className="py-1.5">
              {cf.kind === "PURCHASE" ? "Purchase (outflow)" : cf.kind === "REDEMPTION" ? "Final coupon + redemption" : "Coupon"}
            </td>
            <td className="py-1.5 text-right font-medium" style={{ color: cf.amount < 0 ? "var(--negative)" : "var(--positive)" }}>
              {formatInr(cf.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RisksPanel() {
  return (
    <div className="rounded-xl border p-4 text-sm space-y-2" style={{ background: "var(--surface)" }}>
      <h2 className="font-semibold">Risks & assumptions</h2>
      <ul className="list-disc pl-5 space-y-1" style={{ color: "var(--muted)" }}>
        <li>Redemption value is unknowable in advance — the &ldquo;gold flat&rdquo; figure assumes today&apos;s gold reference price holds until maturity; the &ldquo;projected&rdquo; figure is a speculative scenario you control.</li>
        <li>Coupon dates are approximated as exact 6-month steps from issue date; real RBI-notified dates can differ by a few days around weekends/holidays.</li>
        <li>No separate accrued-interest settlement is modeled — consistent with how SGBs actually trade on NSE/BSE, where the coupon goes in full to whoever holds units on the record date.</li>
        <li>Transaction costs (brokerage, other charges) are illustrative defaults, not your broker&apos;s actual rates — see Methodology.</li>
        <li>Secondary-market liquidity can be thin; a quoted price with low recent volume may not be achievable for a real trade at that size.</li>
        <li>This tool is for research/education only and is not investment advice.</li>
      </ul>
      <Link href="/methodology" className="inline-block text-sm hover:underline" style={{ color: "var(--accent-strong)" }}>
        Read the full calculation methodology →
      </Link>
    </div>
  );
}

function closestGold(goldHistory: { asOf: string; pricePerGram: number }[], asOf: string) {
  if (goldHistory.length === 0) return null;
  const target = new Date(asOf).getTime();
  let best = goldHistory[0];
  let bestDiff = Math.abs(new Date(best.asOf).getTime() - target);
  for (const g of goldHistory) {
    const diff = Math.abs(new Date(g.asOf).getTime() - target);
    if (diff < bestDiff) {
      best = g;
      bestDiff = diff;
    }
  }
  return best;
}
