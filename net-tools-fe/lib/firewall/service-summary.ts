import type { ServiceObject } from "@/lib/firewall/firewall-types"

export interface ServiceInsights {
  total: number
  shown: number
  tcp: number
  udp: number
  predefined: number
  custom: number
  protocolCounts: { name: string; count: number }[]
}

export function computeServiceInsights(
  total: number,
  shown: ServiceObject[],
): ServiceInsights {
  const byProtocol: Record<string, number> = {}
  let tcp = 0
  let udp = 0
  let predefined = 0
  let custom = 0

  for (const service of shown) {
    const protocolKey = service.protocol || "(none)"
    byProtocol[protocolKey] = (byProtocol[protocolKey] || 0) + 1

    const upper = service.protocol.toUpperCase()
    if (upper === "TCP") tcp++
    else if (upper === "UDP") udp++

    if (service.isPredefined) predefined++
    else custom++
  }

  const protocolCounts = Object.entries(byProtocol)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return {
    total,
    shown: shown.length,
    tcp,
    udp,
    predefined,
    custom,
    protocolCounts,
  }
}
