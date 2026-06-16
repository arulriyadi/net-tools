"use client"

import { cn } from "@/lib/utils"
import type { RouteInsights } from "@/lib/firewall/route-summary"
import { formatNumber } from "@/lib/format"

function InsightStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[118px] rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">
        {formatNumber(value)}
      </div>
    </div>
  )
}

interface RouteListInsightsProps {
  insights: RouteInsights
  activeInterface: string | null
  onInterfaceSelect: (iface: string | null) => void
}

export function RouteListInsights({
  insights,
  activeInterface,
  onInterfaceSelect,
}: RouteListInsightsProps) {
  return (
    <div className="space-y-3 border-b border-border px-4 py-3">
      <div className="flex flex-wrap gap-2">
        <InsightStat label="Total" value={insights.total} />
        <InsightStat label="Shown" value={insights.shown} />
        <InsightStat label="Dst. CIDR literal" value={insights.destCidrLiteral} />
        <InsightStat label="Dst. CIDR resolved" value={insights.destCidrResolved} />
        <InsightStat label="Dst. CIDR unresolved" value={insights.destCidrUnresolved} />
        <InsightStat label="Next VR" value={insights.nextVr} />
      </div>

      {insights.interfaceCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {insights.interfaceCounts.map(({ name, count }) => {
            const active = activeInterface === name
            return (
              <button
                key={name}
                type="button"
                onClick={() => onInterfaceSelect(active ? null : name)}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-xs transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                <span className="font-medium text-foreground">{name}</span>
                <span className="mx-1.5 text-muted-foreground">·</span>
                <span className="tabular-nums">{count}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
