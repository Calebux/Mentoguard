import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  // In production: verify the Self Protocol ZK proof
  // using @selfxyz/core SelfBackendVerifier
  console.log("[self-verify] Received proof:", body);

  // Placeholder — store verified status in Redis
  return NextResponse.json({ verified: true });
}
