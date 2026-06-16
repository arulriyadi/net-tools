"use client"

import { Download, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type SecurityListFilters,
  type SecuritySortKey,
  type SecuritySortState,
} from "@/lib/firewall/security-list-utils"

const QUICK_SORTS: { key: SecuritySortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "srcZone", label: "Src Zone" },
  { key: "dstZone", label: "Dst Zone" },
  { key: "action", label: "Action" },
  { key: "hitCount", label: "Hits" },
  { key: "service", label: "Service" },
]

interface SecurityListToolbarProps {
  filters: SecurityListFilters
  sort: SecuritySortState
  srcZones: string[]
  dstZones: string[]
  onFiltersChange: (filters: SecurityListFilters) => void
  onSortChange: (sort: SecuritySortState) => void
  onReset: () => void
  onExport: () => void
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-[130px] rounded-md border border-input bg-background px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function SecurityListToolbar({
  filters,
  sort,
  srcZones,
  dstZones,
  onFiltersChange,
  onSortChange,
  onReset,
  onExport,
}: SecurityListToolbarProps) {
  const patch = (partial: Partial<SecurityListFilters>) =>
    onFiltersChange({ ...filters, ...partial })

  const toggleSort = (key: SecuritySortKey) => {
    if (sort.key === key) {
      onSortChange({ key, dir: sort.dir === "asc" ? "desc" : "asc" })
      return
    }
    onSortChange({ key, dir: "asc" })
  }

  return (
    <div className="space-y-3 border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-[240px] flex-1 gap-1 text-xs text-muted-foreground">
          <span>Search</span>
          <input
            value={filters.q}
            onChange={(e) => patch({ q: e.target.value })}
            placeholder="Name, zone, address, service, application..."
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <FilterSelect
          label="Action"
          value={filters.action}
          onChange={(value) => patch({ action: value as SecurityListFilters["action"] })}
          options={[
            { value: "", label: "All" },
            { value: "allow", label: "Allow" },
            { value: "deny", label: "Deny" },
            { value: "drop", label: "Drop" },
          ]}
        />

        <FilterSelect
          label="Src Zone"
          value={filters.srcZone}
          onChange={(value) => patch({ srcZone: value })}
          options={[
            { value: "", label: "All" },
            ...srcZones.map((item) => ({ value: item, label: item })),
          ]}
        />

        <FilterSelect
          label="Dst Zone"
          value={filters.dstZone}
          onChange={(value) => patch({ dstZone: value })}
          options={[
            { value: "", label: "All" },
            ...dstZones.map((item) => ({ value: item, label: item })),
          ]}
        />

        <FilterSelect
          label="Status"
          value={filters.enabled}
          onChange={(value) => patch({ enabled: value as SecurityListFilters["enabled"] })}
          options={[
            { value: "", label: "All" },
            { value: "yes", label: "Enabled" },
            { value: "no", label: "Disabled" },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Quick sort:</span>
        {QUICK_SORTS.map((item) => {
          const active = sort.key === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleSort(item.key)}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {item.label}
              {active && (sort.dir === "asc" ? " ↑" : " ↓")}
            </button>
          )
        })}

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>

        <button
          type="button"
          onClick={onExport}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>
    </div>
  )
}
