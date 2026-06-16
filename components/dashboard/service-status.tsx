"use client"

import { cn } from "@/lib/utils"
import { 
  Server, 
  Database, 
  Shield, 
  Globe,
  Play,
  Pause,
  RotateCcw,
  MoreVertical
} from "lucide-react"

interface Service {
  name: string
  status: "running" | "stopped" | "warning"
  uptime: string
  port: number
  icon: React.ComponentType<{ className?: string }>
}

const services: Service[] = [
  { name: "Nginx", status: "running", uptime: "15d 4h 32m", port: 80, icon: Server },
  { name: "MySQL", status: "running", uptime: "15d 4h 32m", port: 3306, icon: Database },
  { name: "Firewall", status: "running", uptime: "15d 4h 32m", port: 0, icon: Shield },
  { name: "DNS Server", status: "warning", uptime: "2d 12h 5m", port: 53, icon: Globe },
]

const statusConfig = {
  running: { label: "Running", className: "bg-success/10 text-success" },
  stopped: { label: "Stopped", className: "bg-destructive/10 text-destructive" },
  warning: { label: "Warning", className: "bg-warning/10 text-warning" },
}

export function ServiceStatus() {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-semibold text-card-foreground">Service Status</h2>
        <button className="text-sm text-primary hover:underline">View All</button>
      </div>
      <div className="divide-y divide-border">
        {services.map((service) => {
          const status = statusConfig[service.status]
          return (
            <div key={service.name} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-muted p-2">
                  <service.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-card-foreground">{service.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {service.port > 0 ? `Port ${service.port}` : "System"} · Uptime: {service.uptime}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    status.className
                  )}
                >
                  {status.label}
                </span>
                <div className="flex items-center gap-1">
                  <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                    {service.status === "running" ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                  <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
