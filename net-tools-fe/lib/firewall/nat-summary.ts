import type { NatRule } from "@/lib/firewall/firewall-types"

export interface NatInsights {
  total: number
  shown: number
  source: number
  destination: number
  static: number
  disabled: number
  typeCounts: { name: string; count: number }[]
}

export function computeNatInsights(total: number, shown: NatRule[]): NatInsights {
  const byType: Record<string, number> = {}
  let source = 0
  let destination = 0
  let staticCount = 0
  let disabled = 0

  for (const rule of shown) {
    byType[rule.type] = (byType[rule.type] || 0) + 1
    if (rule.type === "source") source++
    else if (rule.type === "destination") destination++
    else if (rule.type === "static") staticCount++
    if (!rule.enabled) disabled++
  }

  const typeCounts = Object.entries(byType)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return {
    total,
    shown: shown.length,
    source,
    destination,
    static: staticCount,
    disabled,
    typeCounts,
  }
}
