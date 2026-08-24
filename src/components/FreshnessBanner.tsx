import { FreshnessMetaDto } from "@/lib/clientTypes";
import { formatDate, formatRelativeDays } from "@/lib/format";

export function FreshnessBanner({ freshness }: { freshness: FreshnessMetaDto }) {
  const tone = freshness.isStale ? "warning" : "ok";
  return (
    <div
      className="rounded-lg border px-4 py-2.5 text-sm flex flex-wrap items-center gap-x-4 gap-y-1"
      style={{
        background:
          tone === "warning"
            ? "color-mix(in srgb, var(--warning) 10%, var(--surface))"
            : "var(--surface)",
      }}
    >
      <span className="font-medium" style={{ color: tone === "warning" ? "var(--warning)" : "var(--muted)" }}>
        {tone === "warning" ? "⚠ Data may be stale" : "● Data source"}
      </span>
      <span style={{ color: "var(--muted)" }}>{freshness.providerLabel}</span>
      <span style={{ color: "var(--muted)" }}>
        Gold reference as of {formatDate(freshness.goldPriceAsOf)}
        {freshness.dataAgeDays !== null && ` (${formatRelativeDays(freshness.dataAgeDays)})`}
      </span>
      {freshness.latestRun && (
        <span style={{ color: "var(--muted)" }}>
          Last refresh: {freshness.latestRun.status.toLowerCase()} · {freshness.latestRun.tranchesUpdated} tranches
        </span>
      )}
    </div>
  );
}
