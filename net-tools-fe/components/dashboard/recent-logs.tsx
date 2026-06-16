"use client"

import { cn } from "@/lib/utils"
import { AlertCircle, Info, AlertTriangle, CheckCircle } from "lucide-react"

interface LogEntry {
  id: string
  timestamp: string
  level: "info" | "warning" | "error" | "success"
  message: string
  source: string
}

const logs: LogEntry[] = [
  {
    id: "1",
    timestamp: "2024-01-15 14:32:15",
    level: "info",
    message: "Nginx configuration reloaded successfully",
    source: "nginx",
  },
  {
    id: "2",
    timestamp: "2024-01-15 14:30:42",
    level: "warning",
    message: "High memory usage detected (85%)",
    source: "system",
  },
  {
    id: "3",
    timestamp: "2024-01-15 14:28:10",
    level: "error",
    message: "Connection timeout to upstream server 192.168.1.50",
    source: "nginx",
  },
  {
    id: "4",
    timestamp: "2024-01-15 14:25:33",
    level: "success",
    message: "SSL certificate renewed for domain.com",
    source: "certbot",
  },
  {
    id: "5",
    timestamp: "2024-01-15 14:20:18",
    level: "info",
    message: "New device connected: 192.168.1.105",
    source: "dhcp",
  },
]

const levelConfig = {
  info: {
    icon: Info,
    className: "text-chart-2",
    bgClassName: "bg-chart-2/10",
  },
  warning: {
    icon: AlertTriangle,
    className: "text-warning",
    bgClassName: "bg-warning/10",
  },
  error: {
    icon: AlertCircle,
    className: "text-destructive",
    bgClassName: "bg-destructive/10",
  },
  success: {
    icon: CheckCircle,
    className: "text-success",
    bgClassName: "bg-success/10",
  },
}

export function RecentLogs() {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-semibold text-card-foreground">Recent Logs</h2>
        <button className="text-sm text-primary hover:underline">View All</button>
      </div>
      <div className="divide-y divide-border">
        {logs.map((log) => {
          const config = levelConfig[log.level]
          const Icon = config.icon
          return (
            <div key={log.id} className="flex items-start gap-3 p-4">
              <div className={cn("rounded-md p-1.5", config.bgClassName)}>
                <Icon className={cn("h-4 w-4", config.className)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-card-foreground truncate">{log.message}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <span className="font-medium">{log.source}</span> · {log.timestamp}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
