export type RouterDeviceStatus = "online" | "offline" | "degraded"
export type DataSourceType = "live-api" | "csv-import" | "manual" | "none"
export type FilterChain = "input" | "forward" | "output"
export type FilterAction = "accept" | "drop" | "reject" | "jump" | "log"

export interface RouterDevice {
  id: string
  name: string
  hostname: string
  ip: string
  vendor: string
  model: string
  os: string
  status: RouterDeviceStatus
  dataSource: DataSourceType
  lastSync: string
  routeCount: number
  interfaceCount: number
  firewallRuleCount: number
  natRuleCount: number
  addressListCount: number
  routingTable: string
  site: string
}

export interface RouterRoute {
  id: string
  dstAddress: string
  gateway: string
  distance: number
  scope: number
  routingTable: string
  active: boolean
  dynamic: boolean
  comment: string
}

export interface RouterInterface {
  id: string
  name: string
  type: string
  mtu: number
  macAddress: string
  ipAddress: string
  status: "up" | "down" | "disabled"
  comment: string
}

export interface RouterFirewallRule {
  id: string
  chain: FilterChain
  action: FilterAction
  srcAddress: string
  dstAddress: string
  protocol: string
  dstPort: string
  comment: string
  disabled: boolean
}

export interface RouterAddressListEntry {
  id: string
  list: string
  address: string
  timeout: string
  dynamic: boolean
  comment: string
}

export interface RouterDeviceDetailPayload {
  device: RouterDevice
  routes: RouterRoute[]
  interfaces: RouterInterface[]
  firewallRules: RouterFirewallRule[]
  natRules: RouterFirewallRule[]
  addressLists: RouterAddressListEntry[]
}
