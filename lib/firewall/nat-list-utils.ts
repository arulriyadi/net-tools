import type { NatRule, NatType } from "@/lib/firewall/firewall-types"

export type NatSortKey =
  | "no"
  | "name"
  | "type"
  | "srcZone"
  | "dstZone"
  | "origSrc"
  | "origDst"
  | "service"
  | "translatedSrc"
  | "translatedDst"

export interface NatListFilters {
  q: string
  type: "" | NatType
  srcZone: string
  dstZone: string
  enabled: "" | "yes" | "no"
}

export const emptyNatListFilters: NatListFilters = {
  q: "",
  type: "",
  srcZone: "",
  dstZone: "",
  enabled: "",
}

export interface NatSortState {
  key: NatSortKey
  dir: "asc" | "desc"
}

export const defaultNatSort: NatSortState = { key: "no", dir: "asc" }

function splitZones(value: string): string[] {
  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
}

export function uniqueNatValues(rules: NatRule[]) {
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

export function filterNatRules(rules: NatRule[], filters: NatListFilters): NatRule[] {
  const q = filters.q.toLowerCase().trim()

  return rules.filter((rule) => {
    if (filters.type && rule.type !== filters.type) return false
    if (!zoneMatches(rule.srcZone, filters.srcZone)) return false
    if (!zoneMatches(rule.dstZone, filters.dstZone)) return false
    if (filters.enabled === "yes" && !rule.enabled) return false
    if (filters.enabled === "no" && rule.enabled) return false

    if (!q) return true

    const hay = [
      rule.name,
      rule.type,
      rule.srcZone,
      rule.dstZone,
      rule.origSrc,
      rule.origDst,
      rule.service,
      rule.translatedSrc,
      rule.translatedDst,
    ]
      .join(" ")
      .toLowerCase()

    return hay.includes(q)
  })
}

function compareNatRules(
  a: NatRule,
  b: NatRule,
  key: NatSortKey,
  indexA: number,
  indexB: number,
): number {
  if (key === "no") return indexA - indexB

  const va = a[key as keyof NatRule] as string | undefined
  const vb = b[key as keyof NatRule] as string | undefined

  return String(va ?? "").localeCompare(String(vb ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

export function sortNatRules(rules: NatRule[], sort: NatSortState): NatRule[] {
  const indexed = rules.map((rule, index) => ({ rule, index }))
  indexed.sort((a, b) => {
    const result = compareNatRules(a.rule, b.rule, sort.key, a.index, b.index)
    return sort.dir === "asc" ? result : -result
  })
  return indexed.map((item) => item.rule)
}

export function filterAndSortNatRules(
  rules: NatRule[],
  filters: NatListFilters,
  sort: NatSortState,
): NatRule[] {
  return sortNatRules(filterNatRules(rules, filters), sort)
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

export function exportNatRulesCsv(rules: NatRule[], filename: string) {
  const headers = [
    "No",
    "Name",
    "Type",
    "Src Zone",
    "Dst Zone",
    "Orig Src",
    "Orig Dst",
    "Service",
    "Translated Src",
    "Translated Dst",
    "Enabled",
  ]

  const lines = [
    headers.join(","),
    ...rules.map((rule, index) =>
      [
        index + 1,
        rule.name,
        rule.type,
        rule.srcZone,
        rule.dstZone,
        rule.origSrc,
        rule.origDst,
        rule.service,
        rule.translatedSrc,
        rule.translatedDst,
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
