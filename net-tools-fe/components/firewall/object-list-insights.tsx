"use client"

import { cn } from "@/lib/utils"
import type { ObjectInsights } from "@/lib/firewall/object-summary"
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

interface ObjectListInsightsProps {
  insights: ObjectInsights
  activeType: string | null
  onTypeSelect: (type: string | null) => void
}

export function ObjectListInsights({
  insights,
  activeType,
  onTypeSelect,
}: ObjectListInsightsProps) {
  return (
    <div className="space-y-3 border-b border-border px-4 py-3">
      <div className="flex flex-wrap gap-2">
        <InsightStat label="Total" value={insights.total} />
        <InsightStat label="Shown" value={insights.shown} />
        <InsightStat label="CIDR" value={insights.cidr} />
        <InsightStat label="Host" value={insights.host} />
        <InsightStat label="FQDN" value={insights.fqdn} />
        {insights.range > 0 && <InsightStat label="Range" value={insights.range} />}
        {insights.wildcard > 0 && <InsightStat label="Wildcard" value={insights.wildcard} />}
      </div>

      {insights.typeCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {insights.typeCounts.map(({ name, count }) => {
            const filterValue = name === "(none)" ? "" : name
            const active = activeType === filterValue
            return (
              <button
                key={name}
                type="button"
                onClick={() => onTypeSelect(active ? null : filterValue)}
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
