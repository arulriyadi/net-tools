import type { NatFlow, NatFlowKind } from "@/lib/firewall/firewall-types"
import { NAT_FLOW_KIND_LABELS } from "@/lib/firewall/nat-flow"

export type NatFlowSortKey =
  | "no"
  | "flowLabel"
  | "kind"
  | "internalIp"
  | "externalIp"
  | "summary"

export interface NatFlowListFilters {
  q: string
  kind: "" | NatFlowKind
  enabled: "" | "yes" | "no"
}

export const emptyNatFlowListFilters: NatFlowListFilters = {
  q: "",
  kind: "",
  enabled: "",
}

export interface NatFlowSortState {
  key: NatFlowSortKey
  dir: "asc" | "desc"
}

export const defaultNatFlowSort: NatFlowSortState = { key: "internalIp", dir: "asc" }

export function filterNatFlows(flows: NatFlow[], filters: NatFlowListFilters): NatFlow[] {
  const q = filters.q.toLowerCase().trim()

  return flows.filter((flow) => {
    if (filters.kind && flow.kind !== filters.kind) return false
    if (filters.enabled === "yes" && !flow.enabled) return false
    if (filters.enabled === "no" && flow.enabled) return false
    if (!q) return true

    const hay = [
      flow.flowLabel,
      flow.summary,
      flow.internalIp,
      flow.externalIp,
      flow.internalLabel,
      flow.externalLabel,
      NAT_FLOW_KIND_LABELS[flow.kind],
      flow.inboundRuleName,
      flow.outboundRuleName,
      flow.inboundInternal?.ip,
      flow.inboundInternal?.label,
      ...(flow.outboundInternals?.flatMap((item) => [item.ip, item.label]) ?? []),
      ...(flow.outboundDestinations?.flatMap((item) => [item.ip, item.label]) ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return hay.includes(q)
  })
}

function compareFlows(a: NatFlow, b: NatFlow, key: NatFlowSortKey): number {
  switch (key) {
    case "flowLabel":
      return a.flowLabel.localeCompare(b.flowLabel, undefined, { numeric: true })
    case "kind":
      return a.kind.localeCompare(b.kind)
    case "internalIp":
      return a.internalIp.localeCompare(b.internalIp, undefined, { numeric: true })
    case "externalIp":
      return a.externalIp.localeCompare(b.externalIp, undefined, { numeric: true })
    case "summary":
      return a.summary.localeCompare(b.summary)
    case "no":
    default:
      return a.internalIp.localeCompare(b.internalIp, undefined, { numeric: true })
  }
}

export function sortNatFlows(flows: NatFlow[], sort: NatFlowSortState): NatFlow[] {
  const sorted = [...flows].sort((a, b) => compareFlows(a, b, sort.key))
  return sort.dir === "desc" ? sorted.reverse() : sorted
}

export function filterAndSortNatFlows(
  flows: NatFlow[],
  filters: NatFlowListFilters,
  sort: NatFlowSortState,
): NatFlow[] {
  return sortNatFlows(filterNatFlows(flows, filters), sort)
}

export function exportNatFlowsCsv(flows: NatFlow[], filename: string): void {
  const header = [
    "Flow",
    "Kind",
    "Internal IP",
    "Internal Label",
    "External IP",
    "External Label",
    "Summary",
    "Inbound Rule",
    "Outbound Rule",
    "Enabled",
  ]
  const rows = flows.map((flow) => [
    flow.flowLabel,
    NAT_FLOW_KIND_LABELS[flow.kind],
    flow.internalIp,
    flow.internalLabel,
    flow.externalIp,
    flow.externalLabel,
    flow.summary,
    flow.inboundRuleName ?? "",
    flow.outboundRuleName ?? "",
    flow.enabled ? "yes" : "no",
  ])

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const csv = [header, ...rows].map((line) => line.map(escape).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function computeNatFlowInsights(all: NatFlow[], filtered: NatFlow[]) {
  const countByKind = (items: NatFlow[], kind: NatFlowKind) =>
    items.filter((item) => item.kind === kind).length

  return {
    total: all.length,
    shown: filtered.length,
    bidirectional: countByKind(filtered, "bidirectional"),
    outboundOnly: countByKind(filtered, "outbound-only"),
    inboundOnly: countByKind(filtered, "inbound-only"),
    multipleNat: countByKind(filtered, "multiple-nat"),
  }
}
