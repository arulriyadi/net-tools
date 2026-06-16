"use client"

import { Download, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  emptyRouteListFilters,
  type RouteListFilters,
  type RouteSortKey,
  type RouteSortState,
} from "@/lib/firewall/route-list-utils"

const QUICK_SORTS: { key: RouteSortKey; label: string }[] = [
  { key: "interface", label: "Interface" },
  { key: "destination", label: "Destination" },
  { key: "destCidr", label: "Dst. CIDR" },
  { key: "gateway", label: "Gateway" },
  { key: "name", label: "Name" },
  { key: "metric", label: "Metric" },
]

interface RouteListToolbarProps {
  filters: RouteListFilters
  sort: RouteSortState
  interfaces: string[]
  routeTables: string[]
  onFiltersChange: (filters: RouteListFilters) => void
  onSortChange: (sort: RouteSortState) => void
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

export function RouteListToolbar({
  filters,
  sort,
  interfaces,
  routeTables,
  onFiltersChange,
  onSortChange,
  onReset,
  onExport,
}: RouteListToolbarProps) {
  const patch = (partial: Partial<RouteListFilters>) =>
    onFiltersChange({ ...filters, ...partial })

  const toggleSort = (key: RouteSortKey) => {
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
            placeholder="Name, destination, interface, gateway..."
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <FilterSelect
          label="Interface"
          value={filters.interface}
          onChange={(value) => patch({ interface: value })}
          options={[
            { value: "", label: "All" },
            ...interfaces.map((item) => ({ value: item, label: item })),
          ]}
        />

        <FilterSelect
          label="Destination"
          value={filters.destKind}
          onChange={(value) => patch({ destKind: value })}
          options={[
            { value: "", label: "All" },
            { value: "cidr", label: "CIDR / IP" },
            { value: "object", label: "Address Object" },
          ]}
        />

        <FilterSelect
          label="Dst. CIDR"
          value={filters.destCidrStatus}
          onChange={(value) => patch({ destCidrStatus: value })}
          options={[
            { value: "", label: "All" },
            { value: "literal", label: "Literal CIDR" },
            { value: "resolved", label: "Resolved (object)" },
            { value: "unresolved", label: "Unresolved" },
          ]}
        />

        <FilterSelect
          label="Gateway"
          value={filters.gwKind}
          onChange={(value) => patch({ gwKind: value })}
          options={[
            { value: "", label: "All" },
            { value: "ip", label: "IP Gateway" },
            { value: "object", label: "Gateway Object" },
            { value: "next-vr", label: "Next VR" },
            { value: "unresolved", label: "Not exported" },
          ]}
        />

        <FilterSelect
          label="Route Table"
          value={filters.routeTable}
          onChange={(value) => patch({ routeTable: value })}
          options={[
            { value: "", label: "All" },
            ...routeTables.map((item) => ({ value: item, label: item })),
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

export { emptyRouteListFilters }
