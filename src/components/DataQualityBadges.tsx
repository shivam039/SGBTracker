import { DataQualityFlag, LiquidityTier } from "@/lib/clientTypes";

const FLAG_LABELS: Record<DataQualityFlag, string> = {
  STALE: "Stale price",
  NO_RECENT_TRADE: "No recent trade",
  WIDE_SPREAD: "Wide spread",
  LOW_LIQUIDITY: "Low liquidity",
  MISSING_PRICE: "Missing price",
  SUSPECT_MOVE: "Suspect move",
};

export function DataQualityBadges({ flags }: { flags: DataQualityFlag[] }) {
  if (flags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <span
          key={f}
          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{ background: "color-mix(in srgb, var(--warning) 18%, transparent)", color: "var(--warning)" }}
          title="This tranche's latest data has a quality issue — see Methodology for details."
        >
          {FLAG_LABELS[f]}
        </span>
      ))}
    </div>
  );
}

const LIQUIDITY_COLORS: Record<LiquidityTier, string> = {
  LIQUID: "var(--positive)",
  MODERATE: "var(--accent)",
  LOW: "var(--warning)",
  ILLIQUID: "var(--negative)",
  UNKNOWN: "var(--muted)",
};

export function LiquidityBadge({ tier }: { tier: LiquidityTier }) {
  return (
    <span
      className="text-[10px] font-medium px-1.5 py-0.5 rounded inline-block"
      style={{
        background: `color-mix(in srgb, ${LIQUIDITY_COLORS[tier]} 16%, transparent)`,
        color: LIQUIDITY_COLORS[tier],
      }}
    >
      {tier}
    </span>
  );
}
