"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, ListTodo, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCommandTasks } from "./command-task-provider"

export function CommandTaskTray() {
  const { tasks, runningCount, openTask, activeTaskId } = useCommandTasks()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  if (tasks.length === 0) return null

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors",
          runningCount > 0
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
        title="Background tasks"
        aria-haspopup="listbox"
      >
        <ListTodo className="h-4 w-4" />
        <span className="hidden sm:inline">Tasks</span>
        {runningCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {runningCount}
          </span>
        )}
      </button>

      {open && (
      <div className="absolute right-0 top-full z-[55] mt-2 w-72 rounded-lg border border-border bg-popover p-1 shadow-lg">
        <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Command tasks
        </div>
        {tasks.map((task) => {
          const Icon =
            task.status === "running"
              ? Loader2
              : task.status === "success"
                ? CheckCircle2
                : XCircle
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => {
                openTask(task.id)
                setOpen(false)
              }}
              className={cn(
                "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent",
                activeTaskId === task.id && task.panelOpen && "bg-accent",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  task.status === "running" && "animate-spin text-primary",
                  task.status === "success" && "text-success",
                  task.status === "failed" && "text-destructive",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{task.title}</div>
                <div className="truncate text-xs text-muted-foreground">{task.subtitle}</div>
              </div>
            </button>
          )
        })}
      </div>
      )}
    </div>
  )
}
