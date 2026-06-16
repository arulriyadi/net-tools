"use client"

import { cn } from "@/lib/utils"
import type { SecurityInsights } from "@/lib/firewall/security-summary"
import { formatNumber } from "@/lib/format"
import type { RuleAction } from "@/lib/firewall/firewall-types"

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

interface SecurityListInsightsProps {
  insights: SecurityInsights
  activeAction: RuleAction | "" | null
  onActionSelect: (action: RuleAction | null) => void
}

export function SecurityListInsights({
  insights,
  activeAction,
  onActionSelect,
}: SecurityListInsightsProps) {
  return (
    <div className="space-y-3 border-b border-border px-4 py-3">
      <div className="flex flex-wrap gap-2">
        <InsightStat label="Total" value={insights.total} />
        <InsightStat label="Shown" value={insights.shown} />
        <InsightStat label="Allow" value={insights.allow} />
        <InsightStat label="Deny" value={insights.deny} />
        <InsightStat label="Drop" value={insights.drop} />
        {insights.disabled > 0 && <InsightStat label="Disabled" value={insights.disabled} />}
      </div>

      {insights.actionCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {insights.actionCounts.map(({ name, count }) => {
            const active = activeAction === name
            return (
              <button
                key={name}
                type="button"
                onClick={() => onActionSelect(active ? null : (name as RuleAction))}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-xs capitalize transition-colors",
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
