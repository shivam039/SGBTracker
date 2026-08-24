import Link from "next/link";
import { SgbEconomicsDto } from "@/lib/clientTypes";

export function RankingPanel({
  title,
  items,
  valueLabel,
  valueFor,
  emptyText = "No qualifying tranches right now.",
}: {
  title: string;
  items: SgbEconomicsDto[];
  valueLabel: string;
  valueFor: (s: SgbEconomicsDto) => string;
  emptyText?: string;
}) {
  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--surface)" }}>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-[11px]" style={{ color: "var(--muted)" }}>
          {valueLabel}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs py-4" style={{ color: "var(--muted)" }}>
          {emptyText}
        </p>
      ) : (
        <ol className="space-y-1.5">
          {items.map((s, i) => (
            <li key={s.isin}>
              <Link
                href={`/sgb/${s.isin}`}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-xs w-4 shrink-0" style={{ color: "var(--muted)" }}>
                    {i + 1}
                  </span>
                  <span className="text-sm truncate">{s.seriesName}</span>
                </span>
                <span className="text-sm font-semibold shrink-0" style={{ color: "var(--accent-strong)" }}>
                  {valueFor(s)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
