export {
  StatCard,
  StatusDot,
  DataSourceBadge,
  ServiceProtocolBadge,
} from "@/components/firewall/firewall-ui"

export { computeRouterSummary } from "@/lib/router/router-mapper"

import type { FilterAction, FilterChain } from "@/lib/router/router-types"

export function FilterChainBadge({ chain }: { chain: FilterChain }) {
  const cls =
    chain === "input"
      ? "bg-primary/15 text-primary border-primary/30"
      : chain === "forward"
        ? "bg-chart-2/15 text-chart-2 border-chart-2/30"
        : "bg-muted text-muted-foreground border-border"
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase ${cls}`}>
      {chain}
    </span>
  )
}

export function FilterActionBadge({ action }: { action: FilterAction }) {
  const cls =
    action === "accept"
      ? "bg-success/15 text-success border-success/30"
      : action === "drop" || action === "reject"
        ? "bg-danger/15 text-danger border-danger/30"
        : action === "jump"
          ? "bg-warning/15 text-warning border-warning/30"
          : "bg-muted text-muted-foreground border-border"
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase ${cls}`}>
      {action}
    </span>
  )
}

export function InterfaceStatusBadge({ status }: { status: "up" | "down" | "disabled" }) {
  const cls =
    status === "up"
      ? "bg-success/15 text-success border-success/30"
      : status === "down"
        ? "bg-danger/15 text-danger border-danger/30"
        : "bg-muted text-muted-foreground border-border"
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase ${cls}`}>
      {status}
    </span>
  )
}

export function RouteDynamicBadge({ dynamic, active }: { dynamic: boolean; active: boolean }) {
  if (!dynamic && active) {
    return (
      <span className="inline-flex items-center rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
        static
      </span>
    )
  }
  if (dynamic && active) {
    return (
      <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
        dynamic
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      inactive
    </span>
  )
}
