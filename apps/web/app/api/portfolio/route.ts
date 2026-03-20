import { NextResponse } from "next/server";
import { DEFAULT_TARGET_ALLOCATION, MENTO_TOKENS } from "@mentoguard/shared";

export async function GET() {
  // In production: read from Redis / chain
  const mockBalances = [
    { token: "cUSD", address: MENTO_TOKENS.cUSD, balance: "52000000000000000000", balanceUSD: 52 },
    { token: "cEUR", address: MENTO_TOKENS.cEUR, balance: "31000000000000000000", balanceUSD: 33.48 },
    { token: "cBRL", address: MENTO_TOKENS.cBRL, balance: "75000000000000000000", balanceUSD: 15 },
    { token: "cREAL", address: MENTO_TOKENS.cREAL, balance: "27700000000000000000", balanceUSD: 4.99 },
  ];

  return NextResponse.json({
    balances: mockBalances,
    targetAllocation: DEFAULT_TARGET_ALLOCATION,
    totalUSD: mockBalances.reduce((s, b) => s + b.balanceUSD, 0),
  });
}
