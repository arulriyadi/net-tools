import type { SecurityRule } from "@/lib/firewall/firewall-types"

export interface SecurityInsights {
  total: number
  shown: number
  allow: number
  deny: number
  drop: number
  disabled: number
  actionCounts: { name: string; count: number }[]
}

export function computeSecurityInsights(
  total: number,
  shown: SecurityRule[],
): SecurityInsights {
  const byAction: Record<string, number> = {}
  let allow = 0
  let deny = 0
  let drop = 0
  let disabled = 0

  for (const rule of shown) {
    byAction[rule.action] = (byAction[rule.action] || 0) + 1
    if (rule.action === "allow") allow++
    else if (rule.action === "deny") deny++
    else if (rule.action === "drop") drop++
    if (!rule.enabled) disabled++
  }

  const actionCounts = Object.entries(byAction)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return {
    total,
    shown: shown.length,
    allow,
    deny,
    drop,
    disabled,
    actionCounts,
  }
}
