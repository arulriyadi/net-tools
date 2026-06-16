"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Info,
  Search,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  parseCommandLog,
  type CommandLogEntry,
  type CommandLogLevel,
} from "@/lib/command-tasks/parse-command-log"

const levelStyles: Record<
  CommandLogLevel,
  { badge: string; text: string; label: string }
> = {
  success: {
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    text: "text-emerald-400",
    label: "SUCCESS",
  },
  info: {
    badge: "bg-sky-500/15 text-sky-400 border-sky-500/25",
    text: "text-sky-300",
    label: "INFO",
  },
  warning: {
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    text: "text-amber-400",
    label: "WARNING",
  },
  error: {
    badge: "bg-red-500/15 text-red-400 border-red-500/25",
    text: "text-red-400",
    label: "ERROR",
  },
}

function LevelIcon({ level }: { level: CommandLogLevel }) {
  const className = "h-3.5 w-3.5 shrink-0"
  switch (level) {
    case "success":
      return <CheckCircle2 className={cn(className, "text-emerald-400")} />
    case "warning":
      return <AlertTriangle className={cn(className, "text-amber-400")} />
    case "error":
      return <CircleAlert className={cn(className, "text-red-400")} />
    default:
      return <Info className={cn(className, "text-sky-400")} />
  }
}

function LogLine({ entry }: { entry: CommandLogEntry }) {
  const styles = levelStyles[entry.level]
  const isSection = /^===/.test(entry.raw.trim())

  const formattedTime = new Date(entry.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })

  if (isSection) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 px-3 py-2"
      >
        <div className="h-px flex-1 bg-zinc-700/80" />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          {entry.message.replace(/^===|===$/g, "")}
        </span>
        <div className="h-px flex-1 bg-zinc-700/80" />
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="group flex items-start gap-2.5 px-3 py-1.5 hover:bg-zinc-900/60"
    >
      <time className="w-[92px] shrink-0 pt-0.5 font-mono text-[10px] text-zinc-500">
        {formattedTime}
      </time>

      <Badge
        variant="outline"
        className={cn(
          "h-5 shrink-0 gap-1 border px-1.5 font-mono text-[9px] font-semibold tracking-wide",
          styles.badge,
        )}
      >
        <LevelIcon level={entry.level} />
        {styles.label}
      </Badge>

      <div className="min-w-0 flex-1">
        {entry.section && entry.level === "info" && entry.message.startsWith(">>>") ? (
          <span className="mr-2 font-mono text-[10px] text-zinc-600">
            {entry.section}
          </span>
        ) : null}
        <span
          className={cn(
            "font-mono text-[11px] leading-relaxed break-all",
            entry.level === "info" && !entry.message.startsWith(">>>")
              ? "text-zinc-300"
              : styles.text,
          )}
        >
          {entry.message}
        </span>
      </div>
    </motion.div>
  )
}

interface InteractiveCommandLogsProps {
  log: string
  startedAt: number
  isRunning?: boolean
  className?: string
  maxHeight?: string
}

export function InteractiveCommandLogs({
  log,
  startedAt,
  isRunning = false,
  className,
  maxHeight = "max-h-80",
}: InteractiveCommandLogsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const timestampsRef = useRef<Map<number, number>>(new Map())
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const lines = log.split("\n")
    const now = Date.now()
    lines.forEach((_, index) => {
      if (!timestampsRef.current.has(index)) {
        timestampsRef.current.set(index, now)
      }
    })
  }, [log])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [log])

  const entries = useMemo(
    () => parseCommandLog(log, timestampsRef.current, startedAt),
    [log, startedAt],
  )

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (entry) =>
        entry.message.toLowerCase().includes(q) ||
        (entry.section?.toLowerCase().includes(q) ?? false),
    )
  }, [entries, searchQuery])

  const levelCounts = useMemo(() => {
    const counts = { success: 0, info: 0, warning: 0, error: 0 }
    for (const entry of entries) counts[entry.level]++
    return counts
  }, [entries])

  const empty = !log.trim() || log === "Waiting for output…"

  return (
    <div className={cn("flex flex-col bg-zinc-950", className)}>
      <div className="flex items-center gap-2 border-b border-zinc-800/80 px-3 py-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search log…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 border-zinc-800 bg-zinc-900/80 pl-8 font-mono text-[11px] text-zinc-200 placeholder:text-zinc-600"
          />
        </div>
        <div className="hidden shrink-0 gap-1 sm:flex">
          {levelCounts.error > 0 && (
            <Badge variant="outline" className={cn("h-5 text-[9px]", levelStyles.error.badge)}>
              {levelCounts.error} err
            </Badge>
          )}
          {levelCounts.warning > 0 && (
            <Badge variant="outline" className={cn("h-5 text-[9px]", levelStyles.warning.badge)}>
              {levelCounts.warning} warn
            </Badge>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className={cn("overflow-y-auto font-mono", maxHeight)}
      >
        {empty ? (
          <div className="flex items-center gap-2 px-4 py-6 text-zinc-500">
            {isRunning && (
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-sky-400" />
            )}
            <span className="text-xs">
              {isRunning ? "Waiting for remote output…" : "No log output"}
            </span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-zinc-500">
            No lines match your search.
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {filteredEntries.map((entry) => (
              <LogLine key={entry.id} entry={entry} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {isRunning && !empty && (
        <div className="flex items-center gap-2 border-t border-zinc-800/80 px-3 py-1.5">
          <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="font-mono text-[10px] text-zinc-500">Streaming…</span>
        </div>
      )}
    </div>
  )
}
