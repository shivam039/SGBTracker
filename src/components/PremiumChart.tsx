"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface PremiumPoint {
  date: string;
  premiumPct: number | null;
}

export function PremiumChart({ data }: { data: PremiumPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
        <YAxis tick={{ fontSize: 11 }} width={50} tickFormatter={(v) => `${v}%`} />
        <ReferenceLine y={0} stroke="var(--foreground)" strokeOpacity={0.3} />
        <Tooltip
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12 }}
          formatter={(value) => `${Number(value).toFixed(2)}%`}
        />
        <Line
          type="monotone"
          dataKey="premiumPct"
          name="Premium/discount to gold"
          stroke="var(--accent-strong)"
          dot={false}
          strokeWidth={2}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
