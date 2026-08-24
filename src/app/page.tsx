"use client";

import { useEffect, useState } from "react";
import { RankingsResponse, SgbEconomicsDto } from "@/lib/clientTypes";
import { formatPct } from "@/lib/format";
import { FreshnessBanner } from "@/components/FreshnessBanner";
import { CheapestHero } from "@/components/CheapestHero";
import { RankingPanel } from "@/components/RankingPanel";
import { SgbTable } from "@/components/SgbTable";

export default function DashboardPage() {
  const [rankings, setRankings] = useState<RankingsResponse | null>(null);
  const [allTranches, setAllTranches] = useState<SgbEconomicsDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rankRes, allRes] = await Promise.all([
          fetch("/api/rankings"),
          fetch("/api/sgbs?includeMatured=false"),
        ]);
        if (!rankRes.ok || !allRes.ok) throw new Error("Failed to load SGB data");
        const rankJson: RankingsResponse = await rankRes.json();
        const allJson: { data: SgbEconomicsDto[] } = await allRes.json();
        if (!cancelled) {
          setRankings(rankJson);
          setAllTranches(allJson.data);
        }
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
  }, []);

  if (loading) return <LoadingState />;
  if (error || !rankings) return <ErrorState message={error ?? "No data available."} />;

  return (
    <div className="space-y-6">
      <FreshnessBanner freshness={rankings.freshness} />

      <div>
        <h1 className="text-xl font-semibold mb-3">Cheapest SGB right now</h1>
        <CheapestHero cheapest={rankings.cheapest} />
        <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
          Ranked by YTM (annualized return on buying today, holding to maturity, with gold price
          held flat) among tranches with reliable current price data. {rankings.unreliableCount} of{" "}
          {rankings.totalTracked} active tranches are currently excluded for data-quality reasons —
          see the table below.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <RankingPanel
          title="Top 5 by YTM"
          items={rankings.topByYtm}
          valueLabel="annualized"
          valueFor={(s) => formatPct(s.ytmFlatPct)}
        />
        <RankingPanel
          title="Top 5 by discount to gold"
          items={rankings.topByDiscountToGold}
          valueLabel="vs gold"
          valueFor={(s) => formatPct(s.discountPremiumPct)}
        />
        <RankingPanel
          title="Top 5 by expected return"
          items={rankings.topByExpectedReturn}
          valueLabel="simple annualized"
          valueFor={(s) => formatPct(s.simpleAnnualizedReturnFlatPct)}
        />
        <RankingPanel
          title="Most liquid"
          items={rankings.mostLiquid}
          valueLabel="avg vol"
          valueFor={(s) => (s.avgDailyVolumeUnits !== null ? `${Math.round(s.avgDailyVolumeUnits)} g/day` : "—")}
        />
        <RankingPanel
          title="Trading at a premium"
          items={rankings.tradingAtPremium}
          valueLabel="vs gold"
          valueFor={(s) => formatPct(s.discountPremiumPct)}
          emptyText="No active tranche is currently trading above its gold value."
        />
        <RankingPanel
          title="Trading at a discount"
          items={rankings.tradingAtDiscount}
          valueLabel="vs gold"
          valueFor={(s) => formatPct(s.discountPremiumPct)}
          emptyText="No active tranche is currently trading below its gold value."
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">All tracked tranches</h2>
        <SgbTable items={allTranches} />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-xl border p-10 text-center" style={{ color: "var(--muted)" }}>
      Loading SGB market data…
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border p-6" style={{ borderColor: "var(--negative)" }}>
      <p style={{ color: "var(--negative)" }} className="font-medium">
        {message}
      </p>
      <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
        If this is a fresh install, run <code>npm run db:seed</code> to load sample data.
      </p>
    </div>
  );
}
