"use client"

import { useCallback, useState } from "react"
import {
  Loader2,
  Minus,
  X,
  CheckCircle2,
  XCircle,
  Terminal,
  Copy,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { InteractiveCommandLogs } from "@/components/ui/interactive-command-logs"
import { cn } from "@/lib/utils"
import type { CommandTask } from "@/lib/command-tasks/types"

function buildLogClipboardText(task: CommandTask): string {
  const lines = [
    "=== NetTools command log ===",
    `Task: ${task.title}`,
    task.subtitle,
    task.jobId > 0 ? `Job ID: ${task.jobId}` : null,
    `Status: ${task.status}`,
    task.resultMessage ? `Message: ${task.resultMessage}` : null,
    "---",
    task.log || "(empty)",
  ]
  return lines.filter(Boolean).join("\n")
}

interface CommandExecutionPanelProps {
  task: CommandTask
  onMinimize: () => void
  onClose: () => void
}

export function CommandExecutionPanel({
  task,
  onMinimize,
  onClose,
}: CommandExecutionPanelProps) {
  const [copied, setCopied] = useState(false)

  const copyLog = useCallback(async () => {
    const text = buildLogClipboardText(task)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.left = "-9999px"
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }, [task])

  const hasLog = Boolean(task.log?.trim()) && task.log !== "Waiting for output…"
  const copyLabel =
    task.status === "failed" ? "Copy error log" : "Copy log"

  const StatusIcon =
    task.status === "running"
      ? Loader2
      : task.status === "success"
        ? CheckCircle2
        : XCircle

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[60] flex w-[min(580px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl",
        task.status === "running" && "ring-1 ring-primary/30",
      )}
      role="dialog"
      aria-label={task.title}
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <Terminal className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{task.title}</div>
          <div className="truncate text-xs text-muted-foreground">{task.subtitle}</div>
        </div>
        <StatusIcon
          className={cn(
            "h-4 w-4 shrink-0",
            task.status === "running" && "animate-spin text-primary",
            task.status === "success" && "text-success",
            task.status === "failed" && "text-destructive",
          )}
        />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMinimize} title="Minimize">
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
          title="Dismiss"
          disabled={task.status === "running"}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
        {task.status === "running" && "Live remote command output"}
        {task.status === "success" && (task.resultMessage ?? "Completed successfully")}
        {task.status === "failed" && (task.resultMessage ?? "Failed")}
        {task.jobId > 0 && (
          <span className="ml-2 font-mono text-[10px]">job #{task.jobId}</span>
        )}
      </div>

      <InteractiveCommandLogs
        log={task.log || "Waiting for output…"}
        startedAt={task.startedAt}
        isRunning={task.status === "running"}
        maxHeight="max-h-80"
      />

      <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-3 py-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={!hasLog}
          onClick={() => void copyLog()}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-success" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              {copyLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
