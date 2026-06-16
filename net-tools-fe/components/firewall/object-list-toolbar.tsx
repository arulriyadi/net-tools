"use client"

import { Download, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type ObjectListFilters,
  type ObjectSortKey,
  type ObjectSortState,
} from "@/lib/firewall/object-list-utils"

const QUICK_SORTS: { key: ObjectSortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "address", label: "Address" },
  { key: "type", label: "Type" },
  { key: "networkCat", label: "Network" },
]

interface ObjectListToolbarProps {
  filters: ObjectListFilters
  sort: ObjectSortState
  types: string[]
  networks: string[]
  onFiltersChange: (filters: ObjectListFilters) => void
  onSortChange: (sort: ObjectSortState) => void
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

export function ObjectListToolbar({
  filters,
  sort,
  types,
  networks,
  onFiltersChange,
  onSortChange,
  onReset,
  onExport,
}: ObjectListToolbarProps) {
  const patch = (partial: Partial<ObjectListFilters>) =>
    onFiltersChange({ ...filters, ...partial })

  const toggleSort = (key: ObjectSortKey) => {
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
            placeholder="Name, address, tags, location..."
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <FilterSelect
          label="Type"
          value={filters.type}
          onChange={(value) => patch({ type: value })}
          options={[
            { value: "", label: "All" },
            ...types.map((item) => ({ value: item, label: item })),
          ]}
        />

        <FilterSelect
          label="Addr Kind"
          value={filters.addrKind}
          onChange={(value) => patch({ addrKind: value })}
          options={[
            { value: "", label: "All" },
            { value: "cidr", label: "CIDR / Netmask" },
            { value: "host", label: "Host /32" },
            { value: "fqdn", label: "FQDN" },
            { value: "range", label: "IP Range" },
            { value: "wildcard", label: "IP Wildcard" },
          ]}
        />

        <FilterSelect
          label="Network"
          value={filters.network}
          onChange={(value) => patch({ network: value })}
          options={[
            { value: "", label: "All" },
            ...networks.map((item) => ({ value: item, label: item })),
          ]}
        />

        <FilterSelect
          label="Tags"
          value={filters.tags}
          onChange={(value) => patch({ tags: value as ObjectListFilters["tags"] })}
          options={[
            { value: "", label: "All" },
            { value: "yes", label: "With tags" },
            { value: "no", label: "No tags" },
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
