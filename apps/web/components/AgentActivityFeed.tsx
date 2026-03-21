"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LogEntry { id: string; time: string; message: string; type: "info" | "success" | "warning"; }

const MOCK_LOGS: LogEntry[] = [
  { id: "1", time: "14:22:01", message: "FX tick complete — no rebalance needed", type: "info"    },
  { id: "2", time: "14:21:00", message: "FX tick complete — no rebalance needed", type: "info"    },
  { id: "3", time: "14:10:33", message: "Swap executed: cUSD → cEUR $47.20 ✓",   type: "success" },
  { id: "4", time: "14:10:31", message: "Drift 6.2% detected — triggering rebalance", type: "warning" },
  { id: "5", time: "14:09:00", message: "FX tick complete — no rebalance needed", type: "info"    },
];

const COLOR = { info: "rgba(25,25,24,0.4)", success: "#16a34a", warning: "#c48c5a" };

export function AgentActivityFeed() {
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_LOGS);

  useEffect(() => {
    const id = setInterval(() => {
      setLogs((prev) => [
        { id: Date.now().toString(), time: new Date().toLocaleTimeString(), message: "FX tick complete — no rebalance needed", type: "info" },
        ...prev.slice(0, 19),
      ]);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="m-card">
      <p className="m-label" style={{ marginBottom: "1rem" }}>Agent Activity Feed</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", fontFamily: "var(--font-mono, monospace)", fontSize: "0.7rem", maxHeight: 192, overflowY: "auto" }}>
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div key={log.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", gap: "0.75rem", color: COLOR[log.type] }}>
              <span style={{ color: "rgba(25,25,24,0.3)", flexShrink: 0 }}>{log.time}</span>
              <span>— {log.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
