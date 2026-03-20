"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { usePortfolio } from "@/hooks/usePortfolio";

const COLORS: Record<string, string> = {
  cUSD: "#00d4aa",
  cEUR: "#3b82f6",
  cBRL: "#f59e0b",
  cREAL: "#ec4899",
};

export function ExposureDonut() {
  const { balances, totalUSD, isLoading } = usePortfolio();

  const data = balances.map((b) => ({
    name: b.token,
    value: b.balanceUSD,
    pct: totalUSD > 0 ? ((b.balanceUSD / totalUSD) * 100).toFixed(1) : "0",
  }));

  return (
    <div className="rounded-xl bg-surface border border-border p-5">
      <h3 className="text-sm font-medium text-text-secondary mb-3">Portfolio</h3>
      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-text-secondary text-sm">
          Loading...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={65}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name] ?? "#888"} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, name: string) => [`$${v.toFixed(2)}`, name]}
              contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }}
            />
            <Legend
              formatter={(name) => {
                const d = data.find((e) => e.name === name);
                return `${name} ${d?.pct}%`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
