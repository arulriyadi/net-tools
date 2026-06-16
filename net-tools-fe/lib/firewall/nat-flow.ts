import type { NatFlow, NatFlowAddress, NatFlowKind, NatRule } from "@/lib/firewall/firewall-types"

function splitMultiValue(value: string): string[] {
  if (!value.trim()) return []
  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
}

interface ParsedAddress {
  ip: string
  label: string
}

function cleanNatField(value: string): string {
  return (value || "")
    .replace(/^\[Disabled\]\s*/i, "")
    .trim()
}

/** Extract host IP (+ optional object label) from Palo NAT address / translation fields. */
export function extractNatAddress(value: string): ParsedAddress | null {
  let text = cleanNatField(value)
  if (!text || text === "—" || /^none$/i.test(text) || /^any$/i.test(text)) return null

  const addressMatch = text.match(/address:\s*(.+)$/i)
  if (addressMatch) text = addressMatch[1].trim()

  text = text
    .replace(/^dynamic-ip(?:-and-port)?;\s*/i, "")
    .replace(/^static-ip;\s*/i, "")
    .trim()

  const labeled = text.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?\s*(?:-\s*(.+))?$/)
  if (labeled) {
    if (labeled[2] && labeled[2] !== "32") return null
    return { ip: labeled[1], label: labeled[3]?.trim() ?? "" }
  }

  const bare = text.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?/)
  if (bare) {
    if (bare[2] && bare[2] !== "32") return null
    return { ip: bare[1], label: "" }
  }

  const trailing = text.match(/(?:^|\s-\s)(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?\s*$/)
  if (trailing) {
    if (trailing[2] && trailing[2] !== "32") return null
    const labelPart = text.replace(/(?:\s-\s|\s)\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?\s*$/, "").trim()
    return { ip: trailing[1], label: labelPart.replace(/\s*-\s*$/, "") }
  }

  const embedded = text.match(/[-_\s](\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?\s*$/)
  if (embedded) {
    if (embedded[2] && embedded[2] !== "32") return null
    const labelPart = text.slice(0, text.length - embedded[0].length).replace(/[-_\s]+$/, "").trim()
    return { ip: embedded[1], label: labelPart }
  }

  return null
}

export function extractAllNatAddresses(value: string): ParsedAddress[] {
  const seen = new Set<string>()
  const results: ParsedAddress[] = []
  for (const part of splitMultiValue(value)) {
    const parsed = extractNatAddress(part)
    if (parsed && !seen.has(parsed.ip)) {
      seen.add(parsed.ip)
      results.push(parsed)
    }
  }
  return results
}


function ruleOrder(rule: NatRule): number {
  const match = rule.id.match(/^nat-(\d+)$/)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

/** First enabled inbound rule for a public IP (Palo rulebase order — top wins). */
function resolveWinningInbound(
  rules: NatRule[],
  publicIp: string,
): { internal: ParsedAddress; rule: NatRule } | null {
  const ordered = [...rules].sort((a, b) => ruleOrder(a) - ruleOrder(b))

  for (const rule of ordered) {
    if (!rule.enabled) continue
    if (rule.type !== "destination" && rule.type !== "static") continue

    const externals = extractAllNatAddresses(rule.origDst)
    if (!externals.some((external) => external.ip === publicIp)) continue

    const internals = extractAllNatAddresses(rule.translatedDst)
    if (internals.length === 0) continue

    return { internal: internals[0], rule }
  }

  return null
}

function isWinningInboundEdge(rules: NatRule[], edge: NatEdge): boolean {
  if (edge.direction !== "inbound") return true
  const winner = resolveWinningInbound(rules, edge.externalIp)
  if (!winner) return edge.rule.enabled
  return winner.rule.id === edge.rule.id && winner.internal.ip === edge.internalIp
}

function toAddress(parsed: ParsedAddress): NatFlowAddress {
  return { ip: parsed.ip, label: parsed.label }
}

function buildFlowLabel(kind: NatFlowKind, internalIp: string, externalIp: string): string {
  if (kind === "bidirectional") return `${internalIp} <--> ${externalIp}`
  if (kind === "outbound-only") return `${internalIp} --> ${externalIp}`
  if (kind === "multiple-nat") return `${externalIp} (multiple NAT)`
  return `${externalIp} <-- ${internalIp}`
}

function buildMultipleNatSummary(
  external: ParsedAddress,
  inbound: ParsedAddress | undefined,
  outboundCount: number,
  destCount = 0,
): string {
  const externalName = external.label || external.ip

  if (inbound && outboundCount > 0) {
    const internalName = inbound.label || inbound.ip
    return `${externalName} (${external.ip}): inbound to ${internalName}, outbound from ${outboundCount} internal hosts.`
  }

  if (outboundCount > 0) {
    const destPart =
      destCount > 0
        ? ` when accessing ${destCount} destination host(s)`
        : ""
    return `${outboundCount} internal hosts share outbound NAT as ${externalName} (${external.ip})${destPart}.`
  }

  const internalName = inbound?.label || inbound?.ip || "—"
  return `${internalName} is exposed on the internet as ${externalName} (inbound only).`
}

function buildSummary(
  kind: NatFlowKind,
  internal: ParsedAddress,
  external: ParsedAddress,
  outboundCount = 0,
): string {
  const internalName = internal.label || internal.ip
  const externalName = external.label || external.ip

  if (kind === "multiple-nat") {
    return buildMultipleNatSummary(external, internal, outboundCount)
  }
  if (kind === "bidirectional") {
    return `${internalName} is exposed on the internet as ${externalName} (inbound and outbound).`
  }
  if (kind === "outbound-only") {
    return `${internalName} uses ${externalName} when accessing the internet (outbound only).`
  }
  return `${internalName} is exposed on the internet as ${externalName} (inbound only).`
}

interface NatEdge {
  internalIp: string
  internalLabel: string
  externalIp: string
  externalLabel: string
  direction: "inbound" | "outbound"
  rule: NatRule
}

interface EndpointEntry {
  label: string
  rule: NatRule
}

interface PublicIpGroup {
  externalIp: string
  externalLabel: string
  inbound: Map<string, EndpointEntry>
  outbound: Map<string, EndpointEntry>
}

function addEndpoint(
  map: Map<string, EndpointEntry>,
  parsed: ParsedAddress,
  rule: NatRule,
) {
  const existing = map.get(parsed.ip)
  if (!existing) {
    map.set(parsed.ip, { label: parsed.label, rule })
    return
  }
  if (!existing.label && parsed.label) existing.label = parsed.label
  if (rule.enabled && !existing.rule.enabled) existing.rule = rule
}

function collectEdges(rules: NatRule[]): NatEdge[] {
  const edges: NatEdge[] = []

  for (const rule of rules) {
    if (rule.type === "destination" || rule.type === "static") {
      const externals = extractAllNatAddresses(rule.origDst)
      const internals = extractAllNatAddresses(rule.translatedDst)
      for (const external of externals) {
        for (const internal of internals) {
          edges.push({
            internalIp: internal.ip,
            internalLabel: internal.label,
            externalIp: external.ip,
            externalLabel: external.label,
            direction: "inbound",
            rule,
          })
        }
      }
    }

    if (rule.type === "source" || rule.type === "static") {
      const internals = extractAllNatAddresses(rule.origSrc)
      const externals = extractAllNatAddresses(rule.translatedSrc)
      for (const internal of internals) {
        for (const external of externals) {
          edges.push({
            internalIp: internal.ip,
            internalLabel: internal.label,
            externalIp: external.ip,
            externalLabel: external.label,
            direction: "outbound",
            rule,
          })
        }
      }
    }
  }

  return edges
}

function groupByPublicIp(edges: NatEdge[]): Map<string, PublicIpGroup> {
  const groups = new Map<string, PublicIpGroup>()

  for (const edge of edges) {
    let group = groups.get(edge.externalIp)
    if (!group) {
      group = {
        externalIp: edge.externalIp,
        externalLabel: edge.externalLabel,
        inbound: new Map(),
        outbound: new Map(),
      }
      groups.set(edge.externalIp, group)
    }
    if (!group.externalLabel && edge.externalLabel) group.externalLabel = edge.externalLabel

    const parsed = { ip: edge.internalIp, label: edge.internalLabel }
    if (edge.direction === "inbound") addEndpoint(group.inbound, parsed, edge.rule)
    else addEndpoint(group.outbound, parsed, edge.rule)
  }

  return groups
}

function activeInternalIps(map: Map<string, EndpointEntry>): string[] {
  const enabled = [...map.entries()].filter(([, entry]) => entry.rule.enabled).map(([ip]) => ip)
  if (enabled.length > 0) return enabled.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  return [...map.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

function uniqueRuleNames(map: Map<string, EndpointEntry>, enabledOnly = false): string[] {
  const names = new Set<string>()
  for (const entry of map.values()) {
    if (enabledOnly && !entry.rule.enabled) continue
    names.add(entry.rule.name)
  }
  if (enabledOnly && names.size === 0) return uniqueRuleNames(map, false)
  return [...names].sort()
}

function primaryOutboundRule(group: PublicIpGroup, outboundIps: string[]): NatRule | undefined {
  const rules = new Map<string, NatRule>()
  for (const ip of outboundIps) {
    const entry = group.outbound.get(ip)
    if (entry) rules.set(entry.rule.id, entry.rule)
  }
  const enabled = [...rules.values()].filter((rule) => rule.enabled)
  if (enabled.length === 1) return enabled[0]
  if (enabled.length > 1) return enabled.sort((a, b) => ruleOrder(a) - ruleOrder(b))[0]
  return [...rules.values()].sort((a, b) => ruleOrder(a) - ruleOrder(b))[0]
}

function isMultipleNat(inboundIps: string[], outboundIps: string[]): boolean {
  if (inboundIps.length === 0 || outboundIps.length === 0) return false
  if (inboundIps.length > 1) return true
  if (outboundIps.length > 1) return true
  return inboundIps[0] !== outboundIps[0]
}

function isOutboundPool(inboundIp: string | undefined, outboundIps: string[]): boolean {
  return !inboundIp && outboundIps.length > 1
}

function sortAddresses(items: NatFlowAddress[]): NatFlowAddress[] {
  return [...items].sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }))
}

export function buildNatFlows(rules: NatRule[]): NatFlow[] {
  const edges = collectEdges(rules)
  const groups = groupByPublicIp(edges)
  const consumedPublicIps = new Set<string>()
  const flows: NatFlow[] = []
  let index = 0

  for (const group of groups.values()) {
    const winningInbound = resolveWinningInbound(rules, group.externalIp)
    const inboundIp = winningInbound?.internal.ip
    const outboundIps = activeInternalIps(group.outbound)

    if (!inboundIp && outboundIps.length === 0) continue

    const outboundInternals = sortAddresses(
      outboundIps.map((ip) => {
        const entry = group.outbound.get(ip)!
        return { ip, label: entry.label }
      }),
    )
    const external = {
      ip: group.externalIp,
      label: group.externalLabel,
    }

    if (inboundIp && isMultipleNat([inboundIp], outboundIps)) {
      consumedPublicIps.add(group.externalIp)
      index += 1

      const inboundEntry = winningInbound!
      const internal = inboundEntry.internal

      flows.push({
        id: `flow-${index}`,
        kind: "multiple-nat",
        internalIp: internal.ip,
        internalLabel: internal.label,
        externalIp: group.externalIp,
        externalLabel: group.externalLabel,
        flowLabel: buildFlowLabel("multiple-nat", internal.ip, group.externalIp),
        summary: buildMultipleNatSummary(external, internal, outboundInternals.length),
        inboundInternal: toAddress(internal),
        outboundInternals,
        inboundRuleName: inboundEntry.rule.name,
        outboundRuleName: uniqueRuleNames(group.outbound, true).join("; "),
        inboundRuleId: inboundEntry.rule.id,
        enabled:
          inboundEntry.rule.enabled &&
          outboundIps.every((ip) => group.outbound.get(ip)?.rule.enabled ?? false),
      })
      continue
    }

    if (isOutboundPool(inboundIp, outboundIps)) {
      consumedPublicIps.add(group.externalIp)
      index += 1

      const outboundRule = primaryOutboundRule(group, outboundIps)
      const outboundDestinations = sortAddresses(
        outboundRule ? extractAllNatAddresses(outboundRule.origDst).map(toAddress) : [],
      )
      const primaryInternal = outboundInternals[0]

      flows.push({
        id: `flow-${index}`,
        kind: "multiple-nat",
        internalIp: primaryInternal.ip,
        internalLabel: primaryInternal.label,
        externalIp: group.externalIp,
        externalLabel: group.externalLabel,
        flowLabel: buildFlowLabel("multiple-nat", primaryInternal.ip, group.externalIp),
        summary: buildMultipleNatSummary(
          external,
          undefined,
          outboundInternals.length,
          outboundDestinations.length,
        ),
        outboundInternals,
        outboundDestinations,
        outboundRuleName: outboundRule?.name,
        outboundRuleId: outboundRule?.id,
        enabled:
          outboundRule?.enabled ??
          outboundIps.every((ip) => group.outbound.get(ip)?.rule.enabled ?? false),
      })
    }
  }

  const pairMap = new Map<string, { inboundRule?: NatRule; outboundRule?: NatRule; internalLabel: string; externalLabel: string }>()

  for (const edge of edges) {
    if (consumedPublicIps.has(edge.externalIp)) continue
    if (!isWinningInboundEdge(rules, edge)) continue

    const key = `${edge.internalIp}|${edge.externalIp}`
    const existing = pairMap.get(key) ?? {
      internalLabel: edge.internalLabel,
      externalLabel: edge.externalLabel,
    }
    if (!existing.internalLabel && edge.internalLabel) existing.internalLabel = edge.internalLabel
    if (!existing.externalLabel && edge.externalLabel) existing.externalLabel = edge.externalLabel
    if (edge.direction === "inbound") existing.inboundRule = edge.rule
    else existing.outboundRule = edge.rule
    pairMap.set(key, existing)
  }

  for (const [key, entry] of pairMap) {
    const [internalIp, externalIp] = key.split("|")
    const hasInbound = Boolean(entry.inboundRule)
    const hasOutbound = Boolean(entry.outboundRule)
    const kind: NatFlowKind = hasInbound && hasOutbound
      ? "bidirectional"
      : hasOutbound
        ? "outbound-only"
        : "inbound-only"

    index += 1
    const internal = { ip: internalIp, label: entry.internalLabel }
    const external = { ip: externalIp, label: entry.externalLabel }

    flows.push({
      id: `flow-${index}`,
      kind,
      internalIp,
      internalLabel: entry.internalLabel,
      externalIp,
      externalLabel: entry.externalLabel,
      flowLabel: buildFlowLabel(kind, internalIp, externalIp),
      summary: buildSummary(kind, internal, external),
      inboundRuleName: entry.inboundRule?.name,
      outboundRuleName: entry.outboundRule?.name,
      inboundRuleId: entry.inboundRule?.id,
      outboundRuleId: entry.outboundRule?.id,
      enabled:
        (entry.inboundRule?.enabled ?? true) && (entry.outboundRule?.enabled ?? true),
    })
  }

  return flows.sort((a, b) => {
    const ext = a.externalIp.localeCompare(b.externalIp, undefined, { numeric: true })
    if (ext !== 0) return ext
    return a.internalIp.localeCompare(b.internalIp, undefined, { numeric: true })
  })
}

export const NAT_FLOW_KIND_LABELS: Record<NatFlowKind, string> = {
  bidirectional: "1:1 NAT",
  "outbound-only": "Outbound only",
  "inbound-only": "Inbound only",
  "multiple-nat": "Multiple NAT",
}
