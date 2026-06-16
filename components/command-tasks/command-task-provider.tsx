"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { CommandTask, CommandTaskStatus } from "@/lib/command-tasks/types"
import { fetchActiveUpgradeJob, fetchNginxJob } from "@/lib/nginx/job-api"
import {
  runNginxUpgrade,
  type NginxUpgradePayload,
} from "@/lib/nginx/service-api"

interface StartUpgradeInput {
  serverId: string
  serverName: string
  serverIp: string
  payload: NginxUpgradePayload
}

interface CommandTaskContextValue {
  tasks: CommandTask[]
  activeTaskId: string | null
  runningCount: number
  startNginxUpgrade: (input: StartUpgradeInput) => Promise<void>
  openTask: (taskId: string) => void
  minimizeTask: (taskId: string) => void
  closeTask: (taskId: string) => void
  registerOnComplete: (fn: (task: CommandTask) => void) => () => void
  resumeActiveUpgradeForServer: (input: {
    serverId: string
    serverName: string
    serverIp: string
  }) => Promise<void>
}

const CommandTaskContext = createContext<CommandTaskContextValue | null>(null)

function mapJobStatus(raw: string): CommandTaskStatus {
  if (raw === "success") return "success"
  if (raw === "failed") return "failed"
  return "running"
}

function newTaskId() {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function CommandTaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<CommandTask[]>([])
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const pollTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())
  const onCompleteRef = useRef<Set<(task: CommandTask) => void>>(new Set())

  const registerOnComplete = useCallback((fn: (task: CommandTask) => void) => {
    onCompleteRef.current.add(fn)
    return () => onCompleteRef.current.delete(fn)
  }, [])

  const updateTask = useCallback((taskId: string, patch: Partial<CommandTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)))
  }, [])

  const stopPolling = useCallback((taskId: string) => {
    const timer = pollTimers.current.get(taskId)
    if (timer) {
      clearInterval(timer)
      pollTimers.current.delete(taskId)
    }
  }, [])

  const startPolling = useCallback(
    (taskId: string, jobId: number) => {
      stopPolling(taskId)

      const poll = async () => {
        try {
          const job = await fetchNginxJob(jobId)
          const status = mapJobStatus(job.status)
          const log = job.log ?? ""
          const result = job.result as Record<string, unknown> | null
          const message =
            typeof result?.message === "string" ? result.message : undefined

          setTasks((prev) => {
            const existing = prev.find((t) => t.id === taskId)
            if (!existing) return prev
            const next: CommandTask = {
              ...existing,
              status,
              log,
              resultMessage: message,
            }
            if (status !== "running") {
              next.finishedAt = Date.now()
              stopPolling(taskId)
              for (const fn of onCompleteRef.current) fn(next)
            }
            return prev.map((t) => (t.id === taskId ? next : t))
          })
        } catch {
          /* keep polling */
        }
      }

      void poll()
      const timer = setInterval(() => void poll(), 1200)
      pollTimers.current.set(taskId, timer)
    },
    [stopPolling],
  )

  useEffect(() => {
    return () => {
      for (const timer of pollTimers.current.values()) clearInterval(timer)
      pollTimers.current.clear()
    }
  }, [])

  const startNginxUpgrade = useCallback(
    async (input: StartUpgradeInput) => {
      const taskId = newTaskId()
      const title = `Upgrade ${input.serverName}`
      const subtitle = `${input.payload.channel} ${input.payload.target_version} · ${input.serverIp}`

      const task: CommandTask = {
        id: taskId,
        kind: "nginx_upgrade",
        jobId: 0,
        serverId: input.serverId,
        serverName: input.serverName,
        title,
        subtitle,
        status: "running",
        log: ">>> Starting upgrade job…\n",
        panelOpen: true,
        startedAt: Date.now(),
      }

      setTasks((prev) => [task, ...prev])
      setActiveTaskId(taskId)

      try {
        const started = await runNginxUpgrade(input.serverId, input.payload)
        updateTask(taskId, { jobId: started.job_id })
        startPolling(taskId, started.job_id)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to start upgrade"
        updateTask(taskId, {
          status: "failed",
          log: `${task.log}\n>>> ${msg}`,
          finishedAt: Date.now(),
          resultMessage: msg,
        })
      }
    },
    [startPolling, updateTask],
  )

  const openTask = useCallback((taskId: string) => {
    setActiveTaskId(taskId)
    updateTask(taskId, { panelOpen: true })
  }, [updateTask])

  const minimizeTask = useCallback((taskId: string) => {
    setActiveTaskId(null)
    updateTask(taskId, { panelOpen: false })
  }, [updateTask])

  const closeTask = useCallback(
    (taskId: string) => {
      stopPolling(taskId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      setActiveTaskId((id) => (id === taskId ? null : id))
    },
    [stopPolling],
  )

  const resumeActiveUpgradeForServer = useCallback(
    async (input: { serverId: string; serverName: string; serverIp: string }) => {
      const already = tasks.some(
        (t) => t.serverId === input.serverId && t.status === "running",
      )
      if (already) return

      try {
        const job = await fetchActiveUpgradeJob(input.serverId)
        if (!job || job.status !== "running") return

        const taskId = newTaskId()
        const result = job.result as Record<string, unknown> | null
        const channel = String(result?.channel ?? "stable")
        const target = String(result?.target_version ?? "?")

        const task: CommandTask = {
          id: taskId,
          kind: "nginx_upgrade",
          jobId: job.id,
          serverId: input.serverId,
          serverName: input.serverName,
          title: `Upgrade ${input.serverName}`,
          subtitle: `${channel} ${target} · ${input.serverIp}`,
          status: "running",
          log: job.log ?? ">>> Resuming live output…\n",
          panelOpen: false,
          startedAt: new Date(job.created_at).getTime(),
        }

        setTasks((prev) => [task, ...prev])
        startPolling(taskId, job.id)
      } catch {
        /* ignore */
      }
    },
    [tasks, startPolling],
  )

  const runningCount = useMemo(
    () => tasks.filter((t) => t.status === "running").length,
    [tasks],
  )

  const value = useMemo(
    () => ({
      tasks,
      activeTaskId,
      runningCount,
      startNginxUpgrade,
      openTask,
      minimizeTask,
      closeTask,
      registerOnComplete,
      resumeActiveUpgradeForServer,
    }),
    [
      tasks,
      activeTaskId,
      runningCount,
      startNginxUpgrade,
      openTask,
      minimizeTask,
      closeTask,
      registerOnComplete,
      resumeActiveUpgradeForServer,
    ],
  )

  return (
    <CommandTaskContext.Provider value={value}>{children}</CommandTaskContext.Provider>
  )
}

export function useCommandTasks() {
  const ctx = useContext(CommandTaskContext)
  if (!ctx) {
    throw new Error("useCommandTasks must be used within CommandTaskProvider")
  }
  return ctx
}
