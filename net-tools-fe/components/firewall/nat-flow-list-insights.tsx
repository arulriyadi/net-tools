"use client"

import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/format"
import type { NatFlowKind } from "@/lib/firewall/firewall-types"
import { NAT_FLOW_KIND_LABELS } from "@/lib/firewall/nat-flow"

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

export interface NatFlowInsights {
  total: number
  shown: number
  bidirectional: number
  outboundOnly: number
  inboundOnly: number
  multipleNat: number
}

interface NatFlowListInsightsProps {
  insights: NatFlowInsights
  activeKind: NatFlowKind | "" | null
  onKindSelect: (kind: NatFlowKind | null) => void
}

export function NatFlowListInsights({
  insights,
  activeKind,
  onKindSelect,
}: NatFlowListInsightsProps) {
  const kinds: NatFlowKind[] = ["bidirectional", "multiple-nat", "outbound-only", "inbound-only"]
  const counts: Record<NatFlowKind, number> = {
    bidirectional: insights.bidirectional,
    "multiple-nat": insights.multipleNat,
    "outbound-only": insights.outboundOnly,
    "inbound-only": insights.inboundOnly,
  }

  return (
    <div className="space-y-3 border-b border-border px-4 py-3">
      <p className="text-xs text-muted-foreground">
        Maps inbound and outbound NAT rules into simple IP flows — e.g. internal{" "}
        <span className="font-mono">10.110.32.249</span> exposed as public{" "}
        <span className="font-mono">202.58.242.227</span>.
      </p>
      <div className="flex flex-wrap gap-2">
        <InsightStat label="Total flows" value={insights.total} />
        <InsightStat label="Shown" value={insights.shown} />
        <InsightStat label="1:1 NAT" value={insights.bidirectional} />
        <InsightStat label="Multiple NAT" value={insights.multipleNat} />
        <InsightStat label="Outbound only" value={insights.outboundOnly} />
        <InsightStat label="Inbound only" value={insights.inboundOnly} />
      </div>

      <div className="flex flex-wrap gap-2">
        {kinds.map((kind) => {
          const active = activeKind === kind
          const count = counts[kind]
          if (count === 0 && !active) return null
          return (
            <button
              key={kind}
              type="button"
              onClick={() => onKindSelect(active ? null : kind)}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1.5 text-xs transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <span className="font-medium text-foreground">{NAT_FLOW_KIND_LABELS[kind]}</span>
              <span className="mx-1.5 text-muted-foreground">·</span>
              <span className="tabular-nums">{formatNumber(count)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
