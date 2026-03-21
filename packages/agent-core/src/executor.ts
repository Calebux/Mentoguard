import axios from "axios";
import { createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { CELO_CHAIN_ID } from "@mentoguard/shared";
import type { SwapInstruction } from "./strategy";
import { validateDelegationRules } from "./delegation";
import type { DelegationRules } from "@mentoguard/shared";
import { logRebalance } from "./memory";

const UNISWAP_API_URL =
  process.env.UNISWAP_API_URL ?? "https://trade-api.gateway.uniswap.org/v1";
const UNISWAP_API_KEY = process.env.UNISWAP_API_KEY ?? "";

interface UniswapQuote {
  quoteId: string;
  amountOut: string;
  routeString: string;
  gasUseEstimateUSD: string;
  calldata: `0x${string}`;
  to: `0x${string}`;
  value: string;
}

const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";

async function getUniswapQuote(swap: SwapInstruction): Promise<UniswapQuote> {
  // Only fall back to cUSD if neither side is already cUSD
  const tokenOuts: string[] = [swap.toAddress];
  if (swap.fromAddress !== CUSD_ADDRESS && swap.toAddress !== CUSD_ADDRESS) {
    tokenOuts.push(CUSD_ADDRESS);
  }

  for (const tokenOut of tokenOuts) {
    try {
      const response = await axios.get(`${UNISWAP_API_URL}/quote`, {
        headers: { "x-api-key": UNISWAP_API_KEY },
        params: {
          tokenIn: swap.fromAddress,
          tokenOut,
          amount: parseUnits(swap.amountUSD.toFixed(6), 18).toString(),
          chainId: CELO_CHAIN_ID,
          type: "EXACT_INPUT",
          slippageTolerance: "0.5",
        },
      });
      if (tokenOut !== swap.toAddress) {
        console.log(`[executor] No direct route, routing through cUSD`);
      }
      return response.data as UniswapQuote;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 404 && tokenOut !== tokenOuts[tokenOuts.length - 1]) {
        continue;
      }
      throw err;
    }
  }
  throw new Error(`No Uniswap route found for ${swap.fromToken} → ${swap.toToken}`);
}

async function submitUniswapOrder(
  quote: UniswapQuote,
  smartAccount: `0x${string}`
): Promise<string> {
  const response = await axios.post(
    `${UNISWAP_API_URL}/order`,
    {
      quoteId: quote.quoteId,
      offerer: smartAccount,
    },
    { headers: { "x-api-key": UNISWAP_API_KEY } }
  );
  return (response.data as { orderId: string }).orderId;
}

async function waitForFill(orderId: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await axios.get(`${UNISWAP_API_URL}/order/${orderId}`, {
      headers: { "x-api-key": UNISWAP_API_KEY },
    });
    const order = res.data as { status: string; txHash?: string };
    if (order.status === "filled" && order.txHash) return order.txHash;
    if (order.status === "failed") throw new Error(`Order ${orderId} failed`);
  }
  throw new Error(`Order ${orderId} timed out`);
}

export async function executeSwap(
  swap: SwapInstruction,
  smartAccount: `0x${string}`,
  rules: DelegationRules
): Promise<string> {
  // 1. Validate against delegation rules (throws if violated)
  validateDelegationRules(swap, rules);

  // 2. Get Uniswap quote
  const quote = await getUniswapQuote(swap);
  console.log(
    `[executor] Quote: ${swap.fromToken} → ${swap.toToken} | out: ${quote.amountOut} | gas: $${quote.gasUseEstimateUSD}`
  );

  // 3. Submit order
  const orderId = await submitUniswapOrder(quote, smartAccount);

  // 4. Wait for fill
  const txHash = await waitForFill(orderId);
  console.log(`[executor] Swap confirmed: ${txHash}`);

  // 5. Log to Filecoin (async)
  logRebalance({ swap, txHash, quote, timestamp: Date.now() }).catch(
    (err) => console.warn("[executor] Filecoin log failed:", err)
  );

  return txHash;
}
