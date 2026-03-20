import cron from "node-cron";
import { monitorTick } from "./monitor";
import { loadUserConfig, saveAgentState } from "./memory";
import { sendRebalanceAlert, sendDriftAlert } from "./notifications";
import { MONITOR_INTERVAL_SECONDS } from "@mentoguard/shared";
import type { AgentState } from "@mentoguard/shared";

let isRunning = false;
let startedAt: number | null = null;
let totalTrades = 0;
let totalFeesUSD = 0;
let cronJob: cron.ScheduledTask | null = null;

export function getAgentState(): AgentState {
  return {
    status: isRunning ? "active" : "stopped",
    startedAt,
    lastTickAt: null,
    totalTrades,
    totalFeesUSD,
    uptime: startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0,
  };
}

export async function startAgent(): Promise<void> {
  if (isRunning) return;

  isRunning = true;
  startedAt = Date.now();

  console.log("[MentoGuard] Agent starting...");

  await saveAgentState({ status: "active", startedAt, totalTrades, totalFeesUSD, lastTickAt: null, uptime: 0 });

  cronJob = cron.schedule(`*/${MONITOR_INTERVAL_SECONDS} * * * * *`, async () => {
    try {
      const config = await loadUserConfig();
      if (!config) return;

      const result = await monitorTick(config);

      if (result.shouldRebalance) {
        totalTrades++;
        await sendRebalanceAlert(result);
      }

      const maxDrift = Math.max(...Object.values(result.drift).map(Math.abs));
      if (maxDrift > config.driftThreshold * 0.8) {
        await sendDriftAlert(result, config.driftThreshold);
      }

      await saveAgentState({
        status: "active",
        startedAt,
        lastTickAt: result.tickAt,
        totalTrades,
        totalFeesUSD,
        uptime: Math.floor((Date.now() - (startedAt ?? Date.now())) / 1000),
      });
    } catch (err) {
      console.error("[MentoGuard] Tick error:", err);
    }
  });

  console.log(`[MentoGuard] Running — checking every ${MONITOR_INTERVAL_SECONDS}s`);
}

export async function stopAgent(): Promise<void> {
  if (!isRunning) return;
  cronJob?.stop();
  isRunning = false;
  await saveAgentState({
    status: "stopped",
    startedAt,
    lastTickAt: null,
    totalTrades,
    totalFeesUSD,
    uptime: startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0,
  });
  console.log("[MentoGuard] Agent stopped.");
}

// Auto-start if run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  startAgent().catch(console.error);
}
