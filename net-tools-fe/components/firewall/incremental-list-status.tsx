"use client"

import { Loader2 } from "lucide-react"
import { formatNumber } from "@/lib/format"

interface IncrementalListStatusProps {
  loaded: number
  total: number
  hasMore: boolean
}

export function IncrementalListStatus({
  loaded,
  total,
  hasMore,
}: IncrementalListStatusProps) {
  if (total === 0) return null

  return (
    <div className="sticky bottom-0 border-t border-border bg-card/95 px-4 py-2.5 text-xs text-muted-foreground backdrop-blur-sm">
      <div className="flex items-center justify-center gap-2">
        {hasMore ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>
              Showing {formatNumber(loaded)} of {formatNumber(total)} — scroll for more
            </span>
          </>
        ) : (
          <span>
            Showing all {formatNumber(total)} {total === 1 ? "item" : "items"}
          </span>
        )}
      </div>
    </div>
  )
}
