"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface HistoryPoint {
  date: string;
  price: number | null;
  gold: number | null;
}

export function PriceGoldChart({ data }: { data: HistoryPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
        <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} width={70} />
        <Tooltip
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12 }}
          formatter={(value) => `₹${Number(value).toFixed(2)}`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="price" name="Market price" stroke="var(--accent-strong)" dot={false} strokeWidth={2} connectNulls />
        <Line type="monotone" dataKey="gold" name="Gold reference" stroke="var(--muted)" strokeDasharray="4 4" dot={false} strokeWidth={2} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
