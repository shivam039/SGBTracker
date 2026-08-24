import Link from "next/link";
import { SgbEconomicsDto } from "@/lib/clientTypes";
import { formatInr, formatPct, formatYears } from "@/lib/format";
import { DataQualityBadges, LiquidityBadge } from "./DataQualityBadges";

export function CheapestHero({ cheapest }: { cheapest: SgbEconomicsDto | null }) {
  if (!cheapest) {
    return (
      <div className="rounded-xl border p-6" style={{ background: "var(--surface)" }}>
        <p style={{ color: "var(--muted)" }}>
          No tranche currently qualifies as &ldquo;cheapest&rdquo; — every active tranche has a
          stale, missing, or otherwise unreliable price right now. Check the tranches with data
          warnings in the table below.
        </p>
      </div>
    );
  }

  return (
    <Link
      href={`/sgb/${cheapest.isin}`}
      className="block rounded-xl border p-6 transition-shadow hover:shadow-md"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--accent) 14%, var(--surface)), var(--surface))",
        borderColor: "var(--accent)",
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span
          className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded"
          style={{ background: "var(--accent)", color: "#1a1305" }}
        >
          Cheapest SGB right now
        </span>
        <LiquidityBadge tier={cheapest.liquidityTier} />
      </div>

      <h2 className="text-2xl font-semibold mt-3">{cheapest.seriesName}</h2>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        {cheapest.isin}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
        <Stat label="Market price" value={formatInr(cheapest.marketPrice)} />
        <Stat
          label="YTM (gold flat)"
          value={formatPct(cheapest.ytmFlatPct)}
          emphasize
        />
        <Stat label="Discount to gold" value={formatPct(cheapest.discountPremiumPct)} />
        <Stat label="Remaining tenure" value={formatYears(cheapest.yearsToMaturity)} />
      </div>

      <DataQualityBadges flags={cheapest.dataQualityFlags} />
    </Link>
  );
}

function Stat({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div>
      <div className="text-xs" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div
        className={emphasize ? "text-xl font-bold" : "text-lg font-semibold"}
        style={{ color: emphasize ? "var(--accent-strong)" : "var(--foreground)" }}
      >
        {value}
      </div>
    </div>
  );
}
