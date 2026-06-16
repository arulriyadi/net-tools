export type CommandTaskStatus = "running" | "success" | "failed"

export type CommandTaskKind = "nginx_upgrade"

export interface CommandTask {
  id: string
  kind: CommandTaskKind
  jobId: number
  serverId: string
  serverName: string
  title: string
  subtitle: string
  status: CommandTaskStatus
  log: string
  panelOpen: boolean
  startedAt: number
  finishedAt?: number
  resultMessage?: string
}
