"use client"

import { Download, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NatFlowKind } from "@/lib/firewall/firewall-types"
import { NAT_FLOW_KIND_LABELS } from "@/lib/firewall/nat-flow"
import {
  type NatFlowListFilters,
  type NatFlowSortKey,
  type NatFlowSortState,
} from "@/lib/firewall/nat-flow-list-utils"

const QUICK_SORTS: { key: NatFlowSortKey; label: string }[] = [
  { key: "internalIp", label: "Internal IP" },
  { key: "externalIp", label: "Public IP" },
  { key: "kind", label: "Kind" },
  { key: "flowLabel", label: "Flow" },
]

interface NatFlowListToolbarProps {
  filters: NatFlowListFilters
  sort: NatFlowSortState
  onFiltersChange: (filters: NatFlowListFilters) => void
  onSortChange: (sort: NatFlowSortState) => void
  onReset: () => void
  onExport: () => void
}

export function NatFlowListToolbar({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  onReset,
  onExport,
}: NatFlowListToolbarProps) {
  const patch = (partial: Partial<NatFlowListFilters>) =>
    onFiltersChange({ ...filters, ...partial })

  const toggleSort = (key: NatFlowSortKey) => {
    if (sort.key === key) {
      onSortChange({ key, dir: sort.dir === "asc" ? "desc" : "asc" })
      return
    }
    onSortChange({ key, dir: "asc" })
  }

  const kindOptions: { value: "" | NatFlowKind; label: string }[] = [
    { value: "", label: "All kinds" },
    { value: "bidirectional", label: NAT_FLOW_KIND_LABELS.bidirectional },
    { value: "multiple-nat", label: NAT_FLOW_KIND_LABELS["multiple-nat"] },
    { value: "outbound-only", label: NAT_FLOW_KIND_LABELS["outbound-only"] },
    { value: "inbound-only", label: NAT_FLOW_KIND_LABELS["inbound-only"] },
  ]

  return (
    <div className="space-y-3 border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-[200px] flex-1 gap-1 text-xs text-muted-foreground">
          <span>Search</span>
          <input
            type="search"
            placeholder="IP, label, rule name, summary…"
            value={filters.q}
            onChange={(e) => patch({ q: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="grid gap-1 text-xs text-muted-foreground">
          <span>Kind</span>
          <select
            value={filters.kind}
            onChange={(e) => patch({ kind: e.target.value as NatFlowListFilters["kind"] })}
            className="h-9 min-w-[140px] rounded-md border border-input bg-background px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            {kindOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs text-muted-foreground">
          <span>Enabled</span>
          <select
            value={filters.enabled}
            onChange={(e) => patch({ enabled: e.target.value as NatFlowListFilters["enabled"] })}
            className="h-9 min-w-[110px] rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All</option>
            <option value="yes">Yes</option>
            <option value="no">Disabled</option>
          </select>
        </label>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>

        <button
          type="button"
          onClick={onExport}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Quick sort
        </span>
        {QUICK_SORTS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleSort(key)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              sort.key === key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {sort.key === key && (sort.dir === "asc" ? " ↑" : " ↓")}
          </button>
        ))}
      </div>
    </div>
  )
}
