import { Telegraf } from "telegraf";
import { startCommand } from "./commands/start";
import { statusCommand } from "./commands/status";
import { portfolioCommand } from "./commands/portfolio";
import { pauseCommand } from "./commands/pause";
import { resumeCommand } from "./commands/resume";
import { historyCommand } from "./commands/history";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is required");

export const bot = new Telegraf(token);

// Commands
bot.start(startCommand);
bot.command("status", statusCommand);
bot.command("portfolio", portfolioCommand);
bot.command("pause", pauseCommand);
bot.command("resume", resumeCommand);
bot.command("history", historyCommand);

bot.command("help", (ctx) => {
  ctx.reply(
    [
      "🛡️ *MentoGuard Commands*",
      "",
      "/status — Agent health & uptime",
      "/portfolio — Current allocation + drift",
      "/rules — Active delegation rules",
      "/pause — Halt the agent",
      "/resume — Restart the agent",
      "/history — Last 10 swaps",
      "/ens — Agent ENS identity",
    ].join("\n"),
    { parse_mode: "Markdown" }
  );
});

bot.launch();
console.log("[MentoGuard Bot] Running...");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
