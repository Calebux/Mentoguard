import { createWalletClient, createPublicClient, http, parseAbi, parseUnits, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

const BROKER_ADDRESS = "0x777A8255cA72412f0d706dc03C9D1987306B4CaD" as const;
// Wrapped CELO (ERC-20) — used as intermediary for two-hop swaps
const CELO_TOKEN = "0x471EcE3750Da237f93B8E339c536989b8978a438" as const;

const BROKER_ABI = parseAbi([
  "function getAmountOut(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn) view returns (uint256)",
  "function swapIn(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) returns (uint256)",
  "function getExchangeProviders() view returns (address[])",
]);

const EXCHANGE_PROVIDER_ABI = parseAbi([
  "function getExchanges() view returns ((bytes32 exchangeId, address[] assets)[])",
]);

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);

const publicClient = createPublicClient({
  chain: celo,
  transport: http(process.env.CELO_RPC_URL ?? "https://forno.celo.org"),
});

/** Returns first exchange where the oracle can quote the amount, or throws. */
async function findWorkingExchange(
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountIn: bigint
): Promise<{ provider: `0x${string}`; exchangeId: `0x${string}`; amountOut: bigint }> {
  const providers = await publicClient.readContract({
    address: BROKER_ADDRESS,
    abi: BROKER_ABI,
    functionName: "getExchangeProviders",
  }) as `0x${string}`[];

  for (const provider of providers) {
    const exchanges = await publicClient.readContract({
      address: provider,
      abi: EXCHANGE_PROVIDER_ABI,
      functionName: "getExchanges",
    }) as { exchangeId: `0x${string}`; assets: `0x${string}`[] }[];

    for (const ex of exchanges) {
      const hasIn  = ex.assets.some(a => a.toLowerCase() === tokenIn.toLowerCase());
      const hasOut = ex.assets.some(a => a.toLowerCase() === tokenOut.toLowerCase());
      if (!hasIn || !hasOut) continue;
      try {
        const amountOut = await publicClient.readContract({
          address: BROKER_ADDRESS,
          abi: BROKER_ABI,
          functionName: "getAmountOut",
          args: [provider, ex.exchangeId, tokenIn, tokenOut, amountIn],
        }) as bigint;
        console.log(`[mento] Oracle OK: ${ex.exchangeId} → ${formatUnits(amountIn, 18)} in, ~${formatUnits(amountOut, 18)} out`);
        return { provider, exchangeId: ex.exchangeId, amountOut };
      } catch {
        console.warn(`[mento] Exchange ${ex.exchangeId} oracle stale, skipping`);
      }
    }
  }
  throw new Error(`no valid median — oracle stale for ${tokenIn} → ${tokenOut}`);
}

async function approveIfNeeded(
  token: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint,
  owner: `0x${string}`,
  walletClient: ReturnType<typeof createWalletClient>
) {
  const allowance = await publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, spender],
  }) as bigint;
  if (allowance < amount) {
    const tx = await walletClient.writeContract({
      address: token, abi: ERC20_ABI, functionName: "approve",
      args: [spender, amount],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    console.log(`[mento] Approved ${token}: ${tx}`);
  }
}

export async function executeMentoSwap(
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountUSD: number
): Promise<string> {
  const privateKey = process.env.CELO_PRIVATE_KEY as `0x${string}`;
  if (!privateKey) throw new Error("CELO_PRIVATE_KEY not set");

  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account, chain: celo,
    transport: http(process.env.CELO_RPC_URL ?? "https://forno.celo.org"),
  });

  const amountIn = parseUnits(amountUSD.toFixed(6), 18);

  // ── Attempt 1: direct swap ──────────────────────────────────────────────────
  try {
    const { provider, exchangeId, amountOut } = await findWorkingExchange(tokenIn, tokenOut, amountIn);
    const minOut = (amountOut * 995n) / 1000n;
    await approveIfNeeded(tokenIn, BROKER_ADDRESS, amountIn, account.address, walletClient);
    const txHash = await walletClient.writeContract({
      address: BROKER_ADDRESS, abi: BROKER_ABI, functionName: "swapIn",
      args: [provider, exchangeId, tokenIn, tokenOut, amountIn, minOut],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`[mento] Direct swap confirmed: ${txHash}`);
    return txHash;
  } catch (err) {
    console.warn(`[mento] Direct swap failed (${(err as Error).message}), trying two-hop via CELO...`);
  }

  // ── Attempt 2: two-hop tokenIn → CELO → tokenOut ───────────────────────────
  if (tokenIn === CELO_TOKEN || tokenOut === CELO_TOKEN) {
    throw new Error("no valid median — oracle stale and no two-hop path available");
  }

  // Hop 1: tokenIn → CELO
  const hop1 = await findWorkingExchange(tokenIn, CELO_TOKEN, amountIn);
  const minCelo = (hop1.amountOut * 995n) / 1000n;
  await approveIfNeeded(tokenIn, BROKER_ADDRESS, amountIn, account.address, walletClient);
  const tx1 = await walletClient.writeContract({
    address: BROKER_ADDRESS, abi: BROKER_ABI, functionName: "swapIn",
    args: [hop1.provider, hop1.exchangeId, tokenIn, CELO_TOKEN, amountIn, minCelo],
  });
  await publicClient.waitForTransactionReceipt({ hash: tx1 });
  console.log(`[mento] Hop 1 confirmed (→ CELO): ${tx1}`);

  // Read actual CELO balance (avoids estimating hop-1 output)
  const celoReceived = await publicClient.readContract({
    address: CELO_TOKEN, abi: ERC20_ABI,
    functionName: "balanceOf", args: [account.address],
  }) as bigint;
  console.log(`[mento] CELO received: ${formatUnits(celoReceived, 18)}`);

  // Hop 2: CELO → tokenOut
  const hop2 = await findWorkingExchange(CELO_TOKEN, tokenOut, celoReceived);
  const minOut2 = (hop2.amountOut * 995n) / 1000n;
  await approveIfNeeded(CELO_TOKEN, BROKER_ADDRESS, celoReceived, account.address, walletClient);
  const tx2 = await walletClient.writeContract({
    address: BROKER_ADDRESS, abi: BROKER_ABI, functionName: "swapIn",
    args: [hop2.provider, hop2.exchangeId, CELO_TOKEN, tokenOut, celoReceived, minOut2],
  });
  await publicClient.waitForTransactionReceipt({ hash: tx2 });
  console.log(`[mento] Hop 2 confirmed (→ ${tokenOut}): ${tx2}`);
  return tx2;
}
