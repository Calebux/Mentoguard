"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: "info" | "success" | "warning";
}

const MOCK_LOGS: LogEntry[] = [
  { id: "1", time: "14:22:01", message: "FX tick complete — no rebalance needed", type: "info" },
  { id: "2", time: "14:21:00", message: "FX tick complete — no rebalance needed", type: "info" },
  { id: "3", time: "14:10:33", message: "Swap executed: cUSD → cEUR $47.20 ✓", type: "success" },
  { id: "4", time: "14:10:31", message: "Drift 6.2% detected — triggering rebalance", type: "warning" },
  { id: "5", time: "14:09:00", message: "FX tick complete — no rebalance needed", type: "info" },
];

export function AgentActivityFeed() {
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_LOGS);

  // In production: use SSE stream from /api/agent/events
  useEffect(() => {
    const interval = setInterval(() => {
      setLogs((prev) => [
        {
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString(),
          message: "FX tick complete — no rebalance needed",
          type: "info",
        },
        ...prev.slice(0, 19),
      ]);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const colorMap = {
    info: "text-text-secondary",
    success: "text-green-400",
    warning: "text-accent-gold",
  };

  return (
    <div className="rounded-xl bg-surface border border-border p-5">
      <h3 className="text-sm font-medium text-text-secondary mb-3">Agent Activity Feed</h3>
      <div className="space-y-1.5 font-mono text-xs overflow-y-auto max-h-48">
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${colorMap[log.type]}`}
            >
              <span className="text-text-secondary shrink-0">{log.time}</span>
              <span>— {log.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
