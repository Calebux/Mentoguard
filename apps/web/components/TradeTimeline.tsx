"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useTradeHistory } from "@/hooks/useTradeHistory";

export function TradeTimeline() {
  const { trades } = useTradeHistory();

  const chartData = trades.slice(0, 10).reverse().map((t, i) => ({
    time: new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    amount: parseFloat(t.fromAmount),
    index: i,
  }));

  return (
    <div className="rounded-xl bg-surface border border-border p-5">
      <h3 className="text-sm font-medium text-text-secondary mb-3">Trade Timeline</h3>
      {chartData.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-text-secondary text-sm">
          No trades yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Area type="monotone" dataKey="amount" stroke="#00d4aa" fill="url(#colorAmt)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
