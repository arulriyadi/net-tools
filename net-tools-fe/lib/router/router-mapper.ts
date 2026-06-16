import type { RouterDevice } from "@/lib/router/router-types"

export interface RouterSummary {
  online: number
  totalRoutes: number
  totalInterfaces: number
  totalFirewallRules: number
  totalNatRules: number
  totalAddressLists: number
  needSource: number
}

export function computeRouterSummary(devices: RouterDevice[]): RouterSummary {
  return devices.reduce<RouterSummary>(
    (acc, d) => ({
      online: acc.online + (d.status === "online" ? 1 : 0),
      totalRoutes: acc.totalRoutes + d.routeCount,
      totalInterfaces: acc.totalInterfaces + d.interfaceCount,
      totalFirewallRules: acc.totalFirewallRules + d.firewallRuleCount,
      totalNatRules: acc.totalNatRules + d.natRuleCount,
      totalAddressLists: acc.totalAddressLists + d.addressListCount,
      needSource: acc.needSource + (d.dataSource === "none" || d.dataSource === "manual" ? 1 : 0),
    }),
    {
      online: 0,
      totalRoutes: 0,
      totalInterfaces: 0,
      totalFirewallRules: 0,
      totalNatRules: 0,
      totalAddressLists: 0,
      needSource: 0,
    },
  )
}
