"use client";

import { useFXRates } from "@/hooks/useFXRates";

const TOKENS = ["cUSD", "cEUR", "cBRL", "cREAL"] as const;

const PREV_RATES: Record<string, number> = {
  cUSD: 1.0,
  cEUR: 1.075,
  cBRL: 0.198,
  cREAL: 0.179,
};

export function FXRateHeatmap() {
  const { rates, isLoading } = useFXRates();

  return (
    <div className="rounded-xl bg-surface border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-secondary">FX Rate Heatmap</h3>
        <span className="text-xs text-text-secondary font-mono">
          {rates ? new Date(rates.updatedAt).toLocaleTimeString() : "—"}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {TOKENS.map((token) => {
          const rate = rates?.[token] ?? 0;
          const prev = PREV_RATES[token] ?? rate;
          const change = ((rate - prev) / prev) * 100;
          const isUp = change >= 0;

          return (
            <div
              key={token}
              className={`rounded-lg p-3 border text-center transition ${
                isLoading
                  ? "border-border"
                  : isUp
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <p className="text-xs text-text-secondary mb-1">{token}</p>
              <p className="font-mono text-base font-bold">
                {isLoading ? "—" : rate.toFixed(4)}
              </p>
              {!isLoading && (
                <p className={`text-xs mt-1 ${isUp ? "text-green-400" : "text-red-400"}`}>
                  {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
