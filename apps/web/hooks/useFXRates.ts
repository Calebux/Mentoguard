"use client";

import { useQuery } from "@tanstack/react-query";
import type { FXRates } from "@mentoguard/shared";

export function useFXRates() {
  const { data, isLoading } = useQuery<FXRates>({
    queryKey: ["fx-rates"],
    queryFn: async () => {
      // In production: fetch from agent API or Mento oracle directly
      return {
        cUSD: 1.0,
        cEUR: 1.08,
        cBRL: 0.2,
        cREAL: 0.18,
        updatedAt: Date.now(),
      };
    },
    refetchInterval: 30_000,
  });

  return { rates: data, isLoading };
}
