import { createPublicClient, http, parseAbi, formatUnits } from "viem";
import { celo } from "viem/chains";
import Redis from "ioredis";
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

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

// Frankfurter is a free, no-key-required forex API backed by the ECB
// cUSD=USD, cEUR≈EUR/USD, cBRL≈BRL/USD, cREAL≈BRL/USD (same peg)
export async function fetchFXRates(): Promise<FXRates> {
  const res = await fetch(
    "https://api.frankfurter.app/latest?base=USD&symbols=EUR,BRL"
  );
  if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`);
  const data = (await res.json()) as { rates: { EUR: number; BRL: number } };

  const eurUSD  = 1 / data.rates.EUR; // EUR per USD → USD per EUR
  const brlUSD  = 1 / data.rates.BRL; // BRL per USD → USD per BRL

  const rates: FXRates = {
    cUSD:  1.0,
    cEUR:  eurUSD,
    cBRL:  brlUSD,
    cREAL: brlUSD, // cREAL also tracks Brazilian Real
    updatedAt: Date.now(),
  };

  await redis.set("mentoguard:fx_rates", JSON.stringify(rates), "EX", 120);
  console.log(
    `[monitor] FX rates — cEUR: $${rates.cEUR.toFixed(4)}  cBRL: $${rates.cBRL.toFixed(4)}`
  );
  return rates;
}

export async function fetchPortfolioBalances(
  smartAccount: `0x${string}`
): Promise<TokenBalance[]> {
  const tokens = Object.entries(MENTO_TOKENS) as [MentoToken, `0x${string}`][];

  const results = await Promise.all(
    tokens.map(async ([token, address]) => {
      try {
        const balance = await client.readContract({
          address,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [smartAccount],
        });
        return { token, address, balance, balanceUSD: 0 };
      } catch {
        // Token contract may not exist on mainnet — skip with zero balance
        return { token, address, balance: 0n, balanceUSD: 0 };
      }
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

  const balancesWithUSD = balances.map((b) => ({
    ...b,
    balanceUSD: Number(formatUnits(b.balance, 18)) * ((rates[b.token as keyof FXRates] as number) ?? 0),
  }));

  const result: TickResult = {
    rates,
    balances: balancesWithUSD,
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
