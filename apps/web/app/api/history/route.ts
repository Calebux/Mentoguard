import { NextResponse } from "next/server";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

export async function GET() {
  const cids = await redis.lrange("mentoguard:rebalance_cids", 0, 9);

  // Return CIDs + mock trade metadata
  // In production: fetch from Filecoin/Lighthouse using CIDs
  const trades = cids.map((cid, i) => ({
    id: `trade-${i}`,
    timestamp: Date.now() - i * 3600_000,
    fromToken: i % 2 === 0 ? "cUSD" : "cEUR",
    toToken: i % 2 === 0 ? "cEUR" : "cBRL",
    fromAmount: (50 + i * 10).toString(),
    toAmount: (46 + i * 9).toString(),
    txHash: "0x" + "a".repeat(64),
    feesUSD: 0.12,
    filecoinCid: cid,
  }));

  return NextResponse.json({ trades });
}
