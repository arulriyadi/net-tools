"use client"

import { Download, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SortDir } from "@/lib/router/router-list-utils"

export function RouterFilterSelect({
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

interface RouterListToolbarProps<K extends string> {
  searchValue: string
  searchPlaceholder: string
  sortKey: K
  sortDir: SortDir
  quickSorts: { key: K; label: string }[]
  onSearchChange: (value: string) => void
  onSortChange: (key: K, dir: SortDir) => void
  onReset: () => void
  onExport: () => void
  children?: React.ReactNode
}

export function RouterListToolbar<K extends string>({
  searchValue,
  searchPlaceholder,
  sortKey,
  sortDir,
  quickSorts,
  onSearchChange,
  onSortChange,
  onReset,
  onExport,
  children,
}: RouterListToolbarProps<K>) {
  const toggleSort = (key: K) => {
    if (sortKey === key) {
      onSortChange(key, sortDir === "asc" ? "desc" : "asc")
      return
    }
    onSortChange(key, "asc")
  }

  return (
    <div className="space-y-3 border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-[240px] flex-1 gap-1 text-xs text-muted-foreground">
          <span>Search</span>
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        {children}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Quick sort:</span>
        {quickSorts.map((item) => {
          const active = sortKey === item.key
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
              {active && (sortDir === "asc" ? " ↑" : " ↓")}
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

export function SortableHeader<K extends string>({
  label,
  columnKey,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string
  columnKey: K
  sortKey: K
  sortDir: SortDir
  onSort: (key: K) => void
  className?: string
}) {
  const active = sortKey === columnKey
  return (
    <th
      className={cn(
        "cursor-pointer select-none px-3 py-2 text-left font-medium hover:text-primary",
        active && "text-primary",
        className,
      )}
      onClick={() => onSort(columnKey)}
    >
      {label}
      {active && (sortDir === "asc" ? " ↑" : " ↓")}
    </th>
  )
}
