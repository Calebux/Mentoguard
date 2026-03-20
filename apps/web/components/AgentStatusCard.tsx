"use client";

import { motion } from "framer-motion";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import { formatUptime } from "@mentoguard/shared";

export function AgentStatusCard() {
  const { status, start, stop } = useAgentStatus();

  const isActive = status?.status === "active";

  return (
    <div className="rounded-xl bg-surface border border-border p-5">
      <h3 className="text-sm font-medium text-text-secondary mb-3">Agent Status</h3>

      <div className="flex items-center gap-2 mb-4">
        <motion.div
          className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-accent-primary" : "bg-red-500"}`}
          animate={isActive ? { opacity: [1, 0.3, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
        <span className={`font-bold text-lg ${isActive ? "text-accent-primary" : "text-red-400"}`}>
          {status?.status?.toUpperCase() ?? "LOADING"}
        </span>
      </div>

      <div className="space-y-1 text-sm text-text-secondary mb-4">
        <p>Uptime: <span className="text-text-primary">{formatUptime(status?.uptime ?? 0)}</span></p>
        <p>Trades: <span className="text-text-primary">{status?.totalTrades ?? 0}</span></p>
        <p>Fees: <span className="text-text-primary">${(status?.totalFeesUSD ?? 0).toFixed(4)}</span></p>
      </div>

      <button
        onClick={() => isActive ? stop() : start()}
        className={`w-full py-2 rounded-lg text-sm font-medium transition ${
          isActive
            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
            : "bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 border border-accent-primary/20"
        }`}
      >
        {isActive ? "Pause Agent" : "Start Agent"}
      </button>
    </div>
  );
}
