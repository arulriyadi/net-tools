"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const DEFAULT_LIMIT = 3
const DISABLED_PREFIX = /^\[Disabled\]\s*/i

export function isDisabledEntry(text: string): boolean {
  return DISABLED_PREFIX.test(text.trim())
}

export function stripDisabledPrefix(text: string): string {
  return text.replace(DISABLED_PREFIX, "").trim()
}

export function splitMultiValue(value: string): string[] {
  if (!value.trim()) return []
  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
}

interface MultiValueCellProps {
  value: string
  limit?: number
  mono?: boolean
  /** Keep each entry on a single line (no mid-word wrap). */
  nowrap?: boolean
  dialogTitle?: string
  dialogDescription?: string
}

function MultiValueEntry({
  item,
  className,
}: {
  item: string
  className?: string
}) {
  const disabled = isDisabledEntry(item)
  return (
    <span
      className={cn(
        className,
        disabled && "text-muted-foreground opacity-45 line-through decoration-muted-foreground/40"
      )}
    >
      {disabled ? stripDisabledPrefix(item) : item}
    </span>
  )
}

export function MultiValueCell({
  value,
  limit = DEFAULT_LIMIT,
  mono = true,
  nowrap = false,
  dialogTitle = "All values",
  dialogDescription,
}: MultiValueCellProps) {
  const [open, setOpen] = useState(false)
  const items = useMemo(() => splitMultiValue(value), [value])
  const visible = items.slice(0, limit)
  const hiddenCount = items.length - visible.length
  const itemClass = cn("leading-snug", mono && "font-mono", "text-xs", nowrap && "whitespace-nowrap")

  if (items.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }

  if (items.length === 1) {
    return <MultiValueEntry item={items[0]} className={itemClass} />
  }

  return (
    <>
      <div className={cn("w-max text-xs", nowrap && "whitespace-nowrap")}>
        <ul className="space-y-0.5">
          {visible.map((item, index) => (
            <li key={`${index}-${item}`}>
              <MultiValueEntry item={item} className={itemClass} />
            </li>
          ))}
        </ul>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-1 text-[11px] font-medium text-primary hover:underline"
          >
            View more ({hiddenCount})
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-hidden">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            {dialogDescription && (
              <DialogDescription>{dialogDescription}</DialogDescription>
            )}
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-md border border-border bg-muted/20 p-3">
            <ul className="space-y-1.5 text-xs">
              {items.map((item, index) => {
                const disabled = isDisabledEntry(item)
                return (
                  <li
                    key={`${index}-${item}`}
                    className={cn(
                      "leading-snug",
                      mono && "font-mono",
                      nowrap && "whitespace-nowrap",
                      disabled && "opacity-45"
                    )}
                  >
                    <span className="mr-2 text-muted-foreground tabular-nums">{index + 1}.</span>
                    {disabled && (
                      <span className="mr-1.5 rounded border border-muted-foreground/25 bg-muted px-1 py-px text-[9px] font-medium uppercase text-muted-foreground">
                        off
                      </span>
                    )}
                    <MultiValueEntry
                      item={item}
                      className={cn(mono && "font-mono", nowrap && "whitespace-nowrap")}
                    />
                  </li>
                )
              })}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
