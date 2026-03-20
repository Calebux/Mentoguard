import { Telegraf } from "telegraf";
import type { TickResult } from "@mentoguard/shared";
import { loadUserConfig } from "./memory";

let bot: Telegraf | null = null;

function getBot(): Telegraf {
  if (!bot && process.env.TELEGRAM_BOT_TOKEN) {
    bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  }
  return bot!;
}

export async function sendRebalanceAlert(result: TickResult): Promise<void> {
  const config = await loadUserConfig();
  if (!config?.telegramChatId) return;

  const topDrift = Object.entries(result.drift)
    .map(([token, drift]) => `${token}: ${(drift as number) > 0 ? "+" : ""}${(drift as number).toFixed(1)}%`)
    .join(", ");

  const message = [
    "🔄 *Rebalance Executed*",
    `Drift detected: ${topDrift}`,
    `Portfolio rebalanced to target allocation.`,
    `Check /history for details.`,
  ].join("\n");

  await getBot().telegram.sendMessage(config.telegramChatId, message, {
    parse_mode: "Markdown",
  });
}

export async function sendDriftAlert(
  result: TickResult,
  threshold: number
): Promise<void> {
  const config = await loadUserConfig();
  if (!config?.telegramChatId) return;

  const maxDrift = Math.max(...Object.values(result.drift).map(Math.abs));
  const message = [
    "⚠️ *FX Drift Warning*",
    `Max drift: ${maxDrift.toFixed(1)}% (threshold: ${threshold}%)`,
    `Rebalance may trigger soon.`,
  ].join("\n");

  await getBot().telegram.sendMessage(config.telegramChatId, message, {
    parse_mode: "Markdown",
  });
}
