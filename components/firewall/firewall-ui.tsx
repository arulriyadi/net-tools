"use client"

import type { ComponentType } from "react"
import type {
  FwDevice,
  DataSourceType,
  RuleAction,
  RouteDestKind,
  AddressKind,
  NetworkCategory,
} from "@/lib/firewall/firewall-types"
import { computeFirewallSummary } from "@/lib/firewall/firewall-mapper"
import type { DestCidrStatus, GwKind } from "@/lib/firewall/route-object-resolve"

export { computeFirewallSummary }

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string | number
  hint?: string
  tone?: "default" | "success" | "warning" | "danger"
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "danger"
          ? "text-danger"
          : "text-primary"
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

export function StatusDot({ status }: { status: FwDevice["status"] }) {
  const color =
    status === "online"
      ? "bg-success"
      : status === "degraded"
        ? "bg-warning"
        : "bg-danger"
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
}

export function DataSourceBadge({ src }: { src: DataSourceType }) {
  const map: Record<DataSourceType, { label: string; cls: string }> = {
    "live-api": { label: "Live API", cls: "bg-success/15 text-success border-success/30" },
    "csv-import": { label: "CSV Import", cls: "bg-primary/15 text-primary border-primary/30" },
    manual: { label: "Manual", cls: "bg-warning/15 text-warning border-warning/30" },
    none: { label: "No Source", cls: "bg-muted text-muted-foreground border-border" },
  }
  const m = map[src]
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${m.cls}`}>
      {m.label}
    </span>
  )
}

export function ActionPill({ action }: { action: RuleAction }) {
  const cls =
    action === "allow"
      ? "bg-success/15 text-success border-success/30"
      : action === "deny"
        ? "bg-danger/15 text-danger border-danger/30"
        : "bg-warning/15 text-warning border-warning/30"
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase ${cls}`}>
      {action}
    </span>
  )
}

export function DestKindBadge({ kind }: { kind: RouteDestKind }) {
  const cls =
    kind === "cidr"
      ? "bg-success/15 text-success border-success/30"
      : "bg-warning/15 text-warning border-warning/30"
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase ${cls}`}>
      {kind}
    </span>
  )
}

export function AddrKindBadge({ kind }: { kind: AddressKind }) {
  const cls =
    kind === "host"
      ? "bg-primary/15 text-primary border-primary/30"
      : kind === "cidr"
        ? "bg-success/15 text-success border-success/30"
        : kind === "fqdn"
          ? "bg-chart-2/15 text-chart-2 border-chart-2/30"
          : "bg-muted text-muted-foreground border-border"
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase ${cls}`}>
      {kind}
    </span>
  )
}

export function NetworkCatBadge({ cat }: { cat: NetworkCategory }) {
  const label =
    cat === "10-private"
      ? "10.x"
      : cat === "172-private"
        ? "172.x"
        : cat === "192-private"
          ? "192.x"
          : cat === "link-local"
            ? "link-local"
            : cat
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium">
      {label}
    </span>
  )
}

export function DestCidrStatusBadge({ status }: { status: DestCidrStatus }) {
  if (status === "literal") return null
  const cls =
    status === "resolved"
      ? "bg-success/15 text-success border-success/30"
      : "bg-warning/15 text-warning border-warning/30"
  return (
    <span className={`ml-1.5 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase ${cls}`}>
      {status}
    </span>
  )
}

export function ServiceProtocolBadge({ protocol }: { protocol: string }) {
  const upper = protocol.toUpperCase()
  const cls =
    upper === "TCP"
      ? "bg-primary/15 text-primary border-primary/30"
      : upper === "UDP"
        ? "bg-chart-2/15 text-chart-2 border-chart-2/30"
        : "bg-muted text-muted-foreground border-border"
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase ${cls}`}>
      {protocol || "—"}
    </span>
  )
}

export function PredefinedBadge({ predefined }: { predefined: boolean }) {
  if (!predefined) return null
  return (
    <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
      Predefined
    </span>
  )
}

export function GwKindBadge({ kind }: { kind: GwKind }) {
  const cls =
    kind === "ip"
      ? "bg-success/15 text-success border-success/30"
      : kind === "object"
        ? "bg-warning/15 text-warning border-warning/30"
        : kind === "next-vr"
          ? "bg-primary/15 text-primary border-primary/30"
          : "bg-muted text-muted-foreground border-border"
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase ${cls}`}>
      {kind}
    </span>
  )
}
