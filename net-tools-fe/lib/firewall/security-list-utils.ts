import type { RuleAction, SecurityRule } from "@/lib/firewall/firewall-types"

export type SecuritySortKey =
  | "no"
  | "name"
  | "srcZone"
  | "dstZone"
  | "action"
  | "service"
  | "application"
  | "hitCount"

export interface SecurityListFilters {
  q: string
  action: "" | RuleAction
  srcZone: string
  dstZone: string
  enabled: "" | "yes" | "no"
}

export const emptySecurityListFilters: SecurityListFilters = {
  q: "",
  action: "",
  srcZone: "",
  dstZone: "",
  enabled: "",
}

export interface SecuritySortState {
  key: SecuritySortKey
  dir: "asc" | "desc"
}

export const defaultSecuritySort: SecuritySortState = { key: "no", dir: "asc" }

function splitZones(value: string): string[] {
  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
}

export function uniqueSecurityValues(rules: SecurityRule[]) {
  const srcZones = new Set<string>()
  const dstZones = new Set<string>()
  for (const rule of rules) {
    for (const zone of splitZones(rule.srcZone)) srcZones.add(zone)
    for (const zone of splitZones(rule.dstZone)) dstZones.add(zone)
  }
  const sort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })
  return {
    srcZones: [...srcZones].sort(sort),
    dstZones: [...dstZones].sort(sort),
  }
}

function zoneMatches(ruleZone: string, filterZone: string): boolean {
  if (!filterZone) return true
  return splitZones(ruleZone).includes(filterZone)
}

export function filterSecurityRules(
  rules: SecurityRule[],
  filters: SecurityListFilters,
): SecurityRule[] {
  const q = filters.q.toLowerCase().trim()

  return rules.filter((rule) => {
    if (filters.action && rule.action !== filters.action) return false
    if (!zoneMatches(rule.srcZone, filters.srcZone)) return false
    if (!zoneMatches(rule.dstZone, filters.dstZone)) return false
    if (filters.enabled === "yes" && !rule.enabled) return false
    if (filters.enabled === "no" && rule.enabled) return false

    if (!q) return true

    const hay = [
      rule.name,
      rule.srcZone,
      rule.srcAddr,
      rule.dstZone,
      rule.dstAddr,
      rule.service,
      rule.application,
      rule.action,
    ]
      .join(" ")
      .toLowerCase()

    return hay.includes(q)
  })
}

function compareSecurityRules(
  a: SecurityRule,
  b: SecurityRule,
  key: SecuritySortKey,
  indexA: number,
  indexB: number,
): number {
  if (key === "no") return indexA - indexB
  if (key === "hitCount") return a.hitCount - b.hitCount

  const va =
    key === "action"
      ? a.action
      : (a[key as keyof SecurityRule] as string | number | undefined)
  const vb =
    key === "action"
      ? b.action
      : (b[key as keyof SecurityRule] as string | number | undefined)

  return String(va ?? "").localeCompare(String(vb ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

export function sortSecurityRules(
  rules: SecurityRule[],
  sort: SecuritySortState,
): SecurityRule[] {
  const indexed = rules.map((rule, index) => ({ rule, index }))
  indexed.sort((a, b) => {
    const result = compareSecurityRules(a.rule, b.rule, sort.key, a.index, b.index)
    return sort.dir === "asc" ? result : -result
  })
  return indexed.map((item) => item.rule)
}

export function filterAndSortSecurityRules(
  rules: SecurityRule[],
  filters: SecurityListFilters,
  sort: SecuritySortState,
): SecurityRule[] {
  return sortSecurityRules(filterSecurityRules(rules, filters), sort)
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

export function exportSecurityRulesCsv(rules: SecurityRule[], filename: string) {
  const headers = [
    "No",
    "Name",
    "Src Zone",
    "Src Addr",
    "Dst Zone",
    "Dst Addr",
    "Service",
    "Application",
    "Action",
    "Log",
    "Hits",
    "Enabled",
  ]

  const lines = [
    headers.join(","),
    ...rules.map((rule, index) =>
      [
        index + 1,
        rule.name,
        rule.srcZone,
        rule.srcAddr,
        rule.dstZone,
        rule.dstAddr,
        rule.service,
        rule.application,
        rule.action,
        rule.log ? "yes" : "no",
        rule.hitCount,
        rule.enabled ? "yes" : "no",
      ]
        .map(csvCell)
        .join(","),
    ),
  ]

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
