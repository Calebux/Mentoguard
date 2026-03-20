import { createPublicClient, http, parseAbi, formatUnits } from "viem";
import { celo } from "viem/chains";
import {
  MENTO_TOKENS,
  DEFAULT_TARGET_ALLOCATION,
  computeDrift,
  exceedsThreshold,
} from "@mentoguard/shared";
import type {
  UserConfig,
  TickResult,
  FXRates,
  TokenBalance,
  TargetAllocation,
  MentoToken,
} from "@mentoguard/shared";
import { logTick } from "./memory";

const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

const client = createPublicClient({
  chain: celo,
  transport: http(process.env.CELO_RPC_URL ?? "https://forno.celo.org"),
});

export async function fetchFXRates(): Promise<FXRates> {
  // In production: fetch from Mento oracle + Redstone price feed
  // For now: return mock rates close to real values
  return {
    cUSD: 1.0,
    cEUR: 1.08,
    cBRL: 0.2,
    cREAL: 0.18,
    updatedAt: Date.now(),
  };
}

export async function fetchPortfolioBalances(
  smartAccount: `0x${string}`
): Promise<TokenBalance[]> {
  const tokens = Object.entries(MENTO_TOKENS) as [MentoToken, `0x${string}`][];

  const results = await Promise.all(
    tokens.map(async ([token, address]) => {
      const balance = await client.readContract({
        address,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [smartAccount],
      });
      return { token, address, balance, balanceUSD: 0 };
    })
  );

  return results;
}

export function computeAllocation(
  balances: TokenBalance[],
  rates: FXRates
): TargetAllocation {
  const usdValues = balances.map((b) => ({
    token: b.token,
    usd: Number(formatUnits(b.balance, 18)) * rates[b.token as keyof typeof rates],
  }));

  const totalUSD = usdValues.reduce((s, v) => s + (v.usd as number), 0);
  if (totalUSD === 0) return DEFAULT_TARGET_ALLOCATION;

  return {
    cUSD: ((usdValues.find((v) => v.token === "cUSD")?.usd ?? 0) as number / totalUSD) * 100,
    cEUR: ((usdValues.find((v) => v.token === "cEUR")?.usd ?? 0) as number / totalUSD) * 100,
    cBRL: ((usdValues.find((v) => v.token === "cBRL")?.usd ?? 0) as number / totalUSD) * 100,
    cREAL: ((usdValues.find((v) => v.token === "cREAL")?.usd ?? 0) as number / totalUSD) * 100,
  };
}

export async function monitorTick(config: UserConfig): Promise<TickResult> {
  const [rates, balances] = await Promise.all([
    fetchFXRates(),
    fetchPortfolioBalances(config.smartAccount),
  ]);

  const currentAllocation = computeAllocation(balances, rates);
  const drift = computeDrift(currentAllocation, config.targetAllocation);
  const shouldRebalance = exceedsThreshold(drift, config.driftThreshold);

  const result: TickResult = {
    rates,
    balances,
    currentAllocation,
    drift,
    shouldRebalance,
    tickAt: Date.now(),
  };

  // Fire-and-forget — non-blocking Filecoin log
  logTick(result).catch((err) =>
    console.warn("[monitor] Filecoin log failed:", err)
  );

  return result;
}
