import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{title}</span>
          <span className="text-2xl font-semibold text-card-foreground">{value}</span>
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
          {trend && (
            <span
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}
            >
              {trend.isPositive ? "+" : ""}{trend.value}% from last hour
            </span>
          )}
        </div>
        <div className="rounded-md bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  )
}
