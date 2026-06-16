"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { AssetNameSuggestion } from "@/lib/nginx/fleet-display-label"

export type { AssetNameSuggestion }

interface AssetNameInputProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  suggestions: AssetNameSuggestion[]
  placeholder?: string
}

export function AssetNameInput({
  id = "fleet-label-input",
  label = "Asset name",
  value,
  onChange,
  suggestions: allSuggestions,
  placeholder = "Ketik atau pilih suggestion",
}: AssetNameInputProps) {
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const blurTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (blurTimer.current) window.clearTimeout(blurTimer.current)
    }
  }, [])

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase()
    if (!query) return allSuggestions
    return allSuggestions.filter(
      (item) =>
        item.value.toLowerCase().includes(query) ||
        item.hint.toLowerCase().includes(query),
    )
  }, [allSuggestions, value])

  const pickSuggestion = (next: string) => {
    onChange(next)
    setSuggestionsOpen(false)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (blurTimer.current) window.clearTimeout(blurTimer.current)
            setSuggestionsOpen(true)
          }}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setSuggestionsOpen(false), 150)
          }}
          placeholder={placeholder}
          maxLength={128}
          autoComplete="off"
        />
        {suggestionsOpen && suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md">
            {suggestions.map((item) => (
              <button
                key={item.hint}
                type="button"
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm",
                  "hover:bg-accent hover:text-accent-foreground",
                  value === item.value && "bg-accent/60",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSuggestion(item.value)}
              >
                <span className="font-medium">{item.value}</span>
                <span className="text-xs text-muted-foreground">{item.hint}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
