"use client";

export function GoldGrowthControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border p-4 flex flex-wrap items-center gap-4" style={{ background: "var(--surface)" }}>
      <div>
        <div className="text-sm font-medium">Projected gold price growth</div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>
          Scenario-only: changes the &ldquo;projected&rdquo; return figures shown on detail pages.
          The primary YTM ranking always uses a flat gold price, so it stays a neutral,
          apples-to-apples comparison regardless of this slider.
        </div>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <input
          type="range"
          min={-5}
          max={15}
          step={0.5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-40"
        />
        <span className="text-sm font-semibold tabular-nums w-14 text-right">{value.toFixed(1)}%/yr</span>
      </div>
    </div>
  );
}
