import type { AddressObject } from "@/lib/firewall/firewall-types"

export interface ObjectInsights {
  total: number
  shown: number
  cidr: number
  host: number
  fqdn: number
  range: number
  wildcard: number
  typeCounts: { name: string; count: number }[]
}

export function computeObjectInsights(
  total: number,
  shown: AddressObject[],
): ObjectInsights {
  const byType: Record<string, number> = {}
  let cidr = 0
  let host = 0
  let fqdn = 0
  let range = 0
  let wildcard = 0

  for (const object of shown) {
    const typeKey = object.type || "(none)"
    byType[typeKey] = (byType[typeKey] || 0) + 1

    if (object.addrKind === "cidr") cidr++
    else if (object.addrKind === "host") host++
    else if (object.addrKind === "fqdn") fqdn++
    else if (object.addrKind === "range") range++
    else if (object.addrKind === "wildcard") wildcard++
  }

  const typeCounts = Object.entries(byType)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return {
    total,
    shown: shown.length,
    cidr,
    host,
    fqdn,
    range,
    wildcard,
    typeCounts,
  }
}
