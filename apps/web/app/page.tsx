import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      {/* Logo / Headline */}
      <div className="mb-8">
        <span className="text-6xl">🛡️</span>
        <h1 className="mt-4 text-5xl font-bold tracking-tight">
          Mento<span className="text-accent-primary">Guard</span>
        </h1>
        <p className="mt-3 text-xl text-text-secondary max-w-lg mx-auto">
          Autonomous FX hedging &amp; stablecoin rebalancing on Celo.
          Set your rules once — the agent works 24/7.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {[
          "🔗 Celo Native",
          "🦄 Uniswap Execution",
          "🦊 MetaMask Delegation",
          "🗂 Filecoin Memory",
          "🪪 Self Protocol",
          "🌐 ENS Identity",
          "🤖 Olas Registry",
        ].map((f) => (
          <span
            key={f}
            className="px-3 py-1 rounded-full bg-surface border border-border text-sm text-text-secondary"
          >
            {f}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <ConnectButton />
        <Link
          href="/dashboard"
          className="px-6 py-3 rounded-xl bg-accent-primary text-background font-semibold hover:opacity-90 transition"
        >
          Open Dashboard →
        </Link>
      </div>
    </main>
  );
}
