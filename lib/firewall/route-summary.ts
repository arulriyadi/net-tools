import type { ResolvedStaticRoute } from "@/lib/firewall/route-object-resolve"

export interface RouteInsights {
  total: number
  shown: number
  destCidrLiteral: number
  destCidrResolved: number
  destCidrUnresolved: number
  nextVr: number
  interfaceCounts: { name: string; count: number }[]
}

export function routeInterfaceKey(iface: string): string {
  const trimmed = (iface || "").trim()
  return trimmed || "(none)"
}

export function computeRouteInsights(
  total: number,
  shown: ResolvedStaticRoute[],
): RouteInsights {
  const byIface: Record<string, number> = {}
  let destCidrLiteral = 0
  let destCidrResolved = 0
  let destCidrUnresolved = 0
  let nextVr = 0

  for (const route of shown) {
    const iface = routeInterfaceKey(route.interface)
    byIface[iface] = (byIface[iface] || 0) + 1

    if (route.destCidrStatus === "literal") destCidrLiteral++
    else if (route.destCidrStatus === "resolved") destCidrResolved++
    else if (route.destCidrStatus === "unresolved") destCidrUnresolved++

    if (route.gwKind === "next-vr") nextVr++
  }

  const interfaceCounts = Object.entries(byIface)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)

  return {
    total,
    shown: shown.length,
    destCidrLiteral,
    destCidrResolved,
    destCidrUnresolved,
    nextVr,
    interfaceCounts,
  }
}
