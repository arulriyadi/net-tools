export type FwDeviceStatus = "online" | "offline" | "degraded"
export type DataSourceType = "live-api" | "csv-import" | "manual" | "none"
export type RuleAction = "allow" | "deny" | "drop"
export type NatType = "source" | "destination" | "static"
export type NatFlowKind = "bidirectional" | "outbound-only" | "inbound-only" | "multiple-nat"

export interface NatFlowAddress {
  ip: string
  label: string
}
export type RouteDestKind = "cidr" | "object"
export type RouteNextHopType = "ip-address" | "next-vr" | "discard" | "none"
export type AddressObjectType = "IP Netmask" | "IP Range" | "IP Wildcard" | "FQDN"
export type AddressKind = "host" | "cidr" | "range" | "wildcard" | "fqdn"
export type NetworkCategory = "10-private" | "172-private" | "192-private" | "public" | "link-local" | "other"

export interface FwDevice {
  id: string
  name: string
  hostname: string
  ip: string
  vendor: string
  model: string
  os: string
  status: FwDeviceStatus
  dataSource: DataSourceType
  lastSync: string
  securityRuleCount: number
  natRuleCount: number
  routeCount: number
  objectCount: number
  serviceObjectCount: number
  virtualRouter: string
  zones: string[]
  site: string
}

export interface SecurityRule {
  id: string
  name: string
  srcZone: string
  srcAddr: string
  dstZone: string
  dstAddr: string
  service: string
  application: string
  action: RuleAction
  log: boolean
  hitCount: number
  enabled: boolean
}

export interface NatRule {
  id: string
  name: string
  type: NatType
  srcZone: string
  dstZone: string
  origSrc: string
  origDst: string
  service: string
  translatedSrc: string
  translatedDst: string
  enabled: boolean
}

/** Simplified NAT view: internal private IP mapped to external public IP. */
export interface NatFlow {
  id: string
  kind: NatFlowKind
  internalIp: string
  internalLabel: string
  externalIp: string
  externalLabel: string
  /** e.g. 10.110.32.249 <--> 202.58.242.227 */
  flowLabel: string
  /** Plain-language summary for non-technical users */
  summary: string
  inboundRuleName?: string
  outboundRuleName?: string
  inboundRuleId?: string
  outboundRuleId?: string
  /** DNAT target for multiple-nat (inbound leg). */
  inboundInternal?: NatFlowAddress
  /** SNAT sources for multiple-nat (outbound leg). */
  outboundInternals?: NatFlowAddress[]
  /** Original destinations from the outbound NAT rule (when grouped). */
  outboundDestinations?: NatFlowAddress[]
  enabled: boolean
}

export interface StaticRoute {
  id: string
  name: string
  destination: string
  destKind: RouteDestKind
  interface: string
  nextHopType: RouteNextHopType
  nextHop: string
  adminDistance: string
  metric: string
  routeTable: string
}

export interface AddressObject {
  id: string
  name: string
  location: string
  type: AddressObjectType
  address: string
  addrKind: AddressKind
  networkCat: NetworkCategory
  tags: string
}

export interface ServiceObject {
  id: string
  name: string
  location: string
  protocol: string
  destinationPort: string
  tags: string
  isPredefined: boolean
}

export interface FirewallDatasetPayload {
  security_rules?: SecurityRule[]
  nat_rules?: NatRule[]
  static_routes?: StaticRoute[]
  address_objects?: AddressObject[]
  service_objects?: ServiceObject[]
}

export interface FirewallDeviceDetailPayload {
  device: FwDevice
  securityRules: SecurityRule[]
  natRules: NatRule[]
  staticRoutes: StaticRoute[]
  addressObjects: AddressObject[]
  serviceObjects: ServiceObject[]
}
