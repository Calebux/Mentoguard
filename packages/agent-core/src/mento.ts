import { createWalletClient, createPublicClient, http, parseAbi, parseUnits, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

const BROKER_ADDRESS = "0x777A8255cA72412f0d706dc03C9D1987306B4CaD" as const;

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
]);

const publicClient = createPublicClient({
  chain: celo,
  transport: http(process.env.CELO_RPC_URL ?? "https://forno.celo.org"),
});

async function findExchange(tokenIn: `0x${string}`, tokenOut: `0x${string}`): Promise<{ provider: `0x${string}`; exchangeId: `0x${string}` }> {
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
      if (hasIn && hasOut) return { provider, exchangeId: ex.exchangeId };
    }
  }
  throw new Error(`No Mento exchange found for ${tokenIn} → ${tokenOut}`);
}

export async function executeMentoSwap(
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountUSD: number
): Promise<string> {
  const privateKey = process.env.CELO_PRIVATE_KEY as `0x${string}`;
  if (!privateKey) throw new Error("CELO_PRIVATE_KEY not set");

  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({ account, chain: celo, transport: http(process.env.CELO_RPC_URL ?? "https://forno.celo.org") });

  const amountIn = parseUnits(amountUSD.toFixed(6), 18);

  // Find the exchange
  const { provider, exchangeId } = await findExchange(tokenIn, tokenOut);
  console.log(`[mento] Found exchange ${exchangeId} on provider ${provider}`);

  // Get expected output — if oracle is unavailable, swapIn will also revert, so bail early
  const amountOut = await publicClient.readContract({
    address: BROKER_ADDRESS,
    abi: BROKER_ABI,
    functionName: "getAmountOut",
    args: [provider, exchangeId, tokenIn, tokenOut, amountIn],
  }) as bigint;
  const minOut = (amountOut * 995n) / 1000n; // 0.5% slippage
  console.log(`[mento] Quote: ${formatUnits(amountIn, 18)} → ${formatUnits(amountOut, 18)}`);

  // Approve broker to spend tokenIn
  const allowance = await publicClient.readContract({
    address: tokenIn,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [account.address, BROKER_ADDRESS],
  }) as bigint;

  if (allowance < amountIn) {
    const approveTx = await walletClient.writeContract({
      address: tokenIn,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [BROKER_ADDRESS, amountIn],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
    console.log(`[mento] Approved: ${approveTx}`);
  }

  // Execute swap
  const txHash = await walletClient.writeContract({
    address: BROKER_ADDRESS,
    abi: BROKER_ABI,
    functionName: "swapIn",
    args: [provider, exchangeId, tokenIn, tokenOut, amountIn, minOut],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`[mento] Swap confirmed: ${txHash}`);
  return txHash;
}
