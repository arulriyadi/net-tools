export { StatCard, StatusDot, DataSourceBadge } from "@/components/firewall/firewall-ui"

import type { DnsRecordType, DnsZoneStatus, DnsZoneType } from "@/lib/dns/dns-types"
import { cn } from "@/lib/utils"

export function MockDataBadge() {
  return (
    <span className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
      Mock data
    </span>
  )
}

export function ZoneTypeBadge({ type }: { type: DnsZoneType }) {
  const cls =
    type === "primary"
      ? "border-primary/30 bg-primary/10 text-primary"
      : type === "secondary"
        ? "border-chart-2/30 bg-chart-2/10 text-chart-2"
        : type === "forwarder" || type === "forward"
          ? "border-warning/30 bg-warning/10 text-warning"
          : "border-border bg-muted text-muted-foreground"
  return (
    <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize", cls)}>
      {type}
    </span>
  )
}

export function ZoneStatusBadge({ status }: { status: DnsZoneStatus }) {
  const cls =
    status === "active"
      ? "border-success/30 bg-success/10 text-success"
      : status === "syncing"
        ? "border-primary/30 bg-primary/10 text-primary"
        : status === "inactive" || status === "disabled"
          ? "border-border bg-muted text-muted-foreground"
          : "border-danger/30 bg-danger/10 text-danger"
  return (
    <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize", cls)}>
      {status}
    </span>
  )
}

const RECORD_TYPE_CLS: Partial<Record<DnsRecordType, string>> = {
  A: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  AAAA: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  CNAME: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  MX: "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  TXT: "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
  NS: "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  SOA: "border-pink-500/30 bg-pink-500/10 text-pink-600 dark:text-pink-400",
  PTR: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
}

export function RecordTypeBadge({ type }: { type: DnsRecordType }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold",
        RECORD_TYPE_CLS[type] ?? "border-border bg-muted text-muted-foreground",
      )}
    >
      {type}
    </span>
  )
}

export { computeDnsSummary } from "@/lib/dns/dns-mapper"
