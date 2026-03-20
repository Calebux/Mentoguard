import axios from "axios";

const OLAS_API_URL = "https://registry.olas.network/api";
const OLAS_API_KEY = process.env.OLAS_API_KEY ?? "";

export async function heartbeat(): Promise<void> {
  const serviceId = process.env.OLAS_SERVICE_ID;
  if (!serviceId) {
    console.warn("[olas] OLAS_SERVICE_ID not set — skipping heartbeat");
    return;
  }

  try {
    await axios.post(
      `${OLAS_API_URL}/service/${serviceId}/heartbeat`,
      { timestamp: Date.now() },
      { headers: { Authorization: `Bearer ${OLAS_API_KEY}` } }
    );
    console.log("[olas] Heartbeat sent");
  } catch (err) {
    console.warn("[olas] Heartbeat failed:", err);
  }
}

export async function registerAgent(): Promise<void> {
  console.log("[olas] Registering agent on Olas registry...");

  const payload = {
    name: "MentoGuard",
    description: "Autonomous FX hedging agent for Mento stablecoins on Celo",
    version: "1.0.0",
    capabilities: ["fx-hedging", "stablecoin-rebalancing", "celo"],
    serviceUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://mentoguard.xyz",
  };

  try {
    const res = await axios.post(`${OLAS_API_URL}/component`, payload, {
      headers: { Authorization: `Bearer ${OLAS_API_KEY}` },
    });
    console.log("[olas] Registered:", res.data);
  } catch (err) {
    console.error("[olas] Registration failed:", err);
  }
}

// Run registration if called directly
if (process.argv[2] === "register") {
  registerAgent().catch(console.error);
}
