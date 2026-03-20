"use client";

import { AgentStatusCard } from "@/components/AgentStatusCard";
import { ExposureDonut } from "@/components/ExposureDonut";
import { FXRateHeatmap } from "@/components/FXRateHeatmap";
import { TradeTimeline } from "@/components/TradeTimeline";
import { AgentActivityFeed } from "@/components/AgentActivityFeed";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Top row: Status + Portfolio + Next Action */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AgentStatusCard />
        <ExposureDonut />
        <NextActionCard />
      </div>

      {/* FX Heatmap */}
      <FXRateHeatmap />

      {/* Bottom row: Timeline + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TradeTimeline />
        <AgentActivityFeed />
      </div>
    </div>
  );
}

function NextActionCard() {
  return (
    <div className="rounded-xl bg-surface border border-border p-5">
      <h3 className="text-sm font-medium text-text-secondary mb-3">Next Action</h3>
      <div className="space-y-2">
        <p className="font-semibold text-accent-primary">Monitoring...</p>
        <p className="text-sm text-text-secondary">Next check: 0:42</p>
        <p className="text-sm text-text-secondary">Drift: 2.1% <span className="text-green-400">(OK)</span></p>
      </div>
    </div>
  );
}
