"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SgbEconomicsDto } from "@/lib/clientTypes";
import { formatInr, formatPct, formatYears } from "@/lib/format";
import { DataQualityBadges, LiquidityBadge } from "./DataQualityBadges";

type SortKey = "seriesName" | "marketPrice" | "discountPremiumPct" | "ytmFlatPct" | "yearsToMaturity" | "avgDailyVolumeUnits";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "seriesName", label: "Tranche" },
  { key: "marketPrice", label: "Price" },
  { key: "discountPremiumPct", label: "Disc/Prem to gold" },
  { key: "ytmFlatPct", label: "YTM (gold flat)" },
  { key: "yearsToMaturity", label: "Tenure left" },
  { key: "avgDailyVolumeUnits", label: "Avg volume" },
];

export function SgbTable({ items }: { items: SgbEconomicsDto[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("ytmFlatPct");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [onlyReliable, setOnlyReliable] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = items;
    if (q) {
      rows = rows.filter(
        (s) => s.isin.toLowerCase().includes(q) || s.seriesName.toLowerCase().includes(q)
      );
    }
    if (onlyReliable) rows = rows.filter((s) => s.isReliable);
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "string" && typeof bv === "string") return sortDir * av.localeCompare(bv);
      return sortDir * ((av as number) - (bv as number));
    });
  }, [items, query, sortKey, sortDir, onlyReliable]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  return (
    <div className="rounded-xl border" style={{ background: "var(--surface)" }}>
      <div className="p-4 flex flex-wrap items-center gap-3 border-b">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by series name or ISIN…"
          className="flex-1 min-w-[200px] rounded-md border px-3 py-1.5 text-sm bg-transparent"
        />
        <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
          <input type="checkbox" checked={onlyReliable} onChange={(e) => setOnlyReliable(e.target.checked)} />
          Reliable data only
        </label>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {filtered.length} of {items.length} tranches
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className="px-3 py-2 font-medium cursor-pointer select-none whitespace-nowrap"
                  style={{ color: "var(--muted)" }}
                >
                  {c.label}
                  {sortKey === c.key && (sortDir === 1 ? " ▲" : " ▼")}
                </th>
              ))}
              <th className="px-3 py-2 font-medium" style={{ color: "var(--muted)" }}>
                Liquidity
              </th>
              <th className="px-3 py-2 font-medium" style={{ color: "var(--muted)" }}>
                Flags
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.isin} className="border-b last:border-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                <td className="px-3 py-2">
                  <Link href={`/sgb/${s.isin}`} className="font-medium hover:underline">
                    {s.seriesName}
                  </Link>
                  <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                    {s.isin}
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{formatInr(s.marketPrice)}</td>
                <td
                  className="px-3 py-2 whitespace-nowrap font-medium"
                  style={{
                    color:
                      s.discountPremiumPct === null
                        ? "var(--muted)"
                        : s.discountPremiumPct < 0
                          ? "var(--positive)"
                          : "var(--negative)",
                  }}
                >
                  {formatPct(s.discountPremiumPct)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap font-semibold" style={{ color: "var(--accent-strong)" }}>
                  {formatPct(s.ytmFlatPct)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{formatYears(s.yearsToMaturity)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {s.avgDailyVolumeUnits !== null ? Math.round(s.avgDailyVolumeUnits) + " g/day" : "—"}
                </td>
                <td className="px-3 py-2">
                  <LiquidityBadge tier={s.liquidityTier} />
                </td>
                <td className="px-3 py-2">
                  <DataQualityBadges flags={s.dataQualityFlags} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
