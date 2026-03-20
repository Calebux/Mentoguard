import type { DelegationRules } from "@mentoguard/shared";
import type { SwapInstruction } from "./strategy";

/**
 * Validate a proposed swap against the user's delegation rules.
 * Throws if any rule is violated — mirrors the onchain caveat enforcement.
 */
export function validateDelegationRules(
  swap: SwapInstruction,
  rules: DelegationRules
): void {
  // 1. Max single swap amount
  if (swap.amountUSD > rules.maxSwapAmountUSD) {
    throw new Error(
      `Swap of $${swap.amountUSD.toFixed(2)} exceeds max single swap limit of $${rules.maxSwapAmountUSD}`
    );
  }

  // 2. Allowed tokens check
  const fromAllowed = rules.allowedTokens.includes(swap.fromAddress);
  const toAllowed = rules.allowedTokens.includes(swap.toAddress);
  if (!fromAllowed || !toAllowed) {
    throw new Error(
      `Token not in allowlist: ${!fromAllowed ? swap.fromToken : swap.toToken}`
    );
  }

  // 3. Time window check
  const hour = new Date().getUTCHours();
  if (hour < rules.timeWindow.startHour || hour >= rules.timeWindow.endHour) {
    throw new Error(
      `Outside operating hours: ${rules.timeWindow.startHour}–${rules.timeWindow.endHour} UTC (currently ${hour}:00 UTC)`
    );
  }

  // 4. Human approval required above threshold
  if (swap.amountUSD > rules.requireHumanApprovalAbove) {
    throw new Error(
      `Swap of $${swap.amountUSD.toFixed(2)} requires human approval (threshold: $${rules.requireHumanApprovalAbove})`
    );
  }
}

/**
 * Encode delegation rules as EIP-7710 caveat data.
 * Used when writing rules to the MetaMask Smart Account.
 */
export function encodeCaveats(rules: DelegationRules): `0x${string}` {
  // Placeholder — real implementation uses MetaMask Delegation Toolkit ABI encoding
  const encoded = JSON.stringify(rules);
  const hex = Buffer.from(encoded).toString("hex");
  return `0x${hex}`;
}
