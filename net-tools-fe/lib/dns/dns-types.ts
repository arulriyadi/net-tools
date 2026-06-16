export type DnsDeviceStatus = "online" | "degraded" | "offline"
export type DnsDataSource = "live-api" | "csv-import" | "manual" | "none"

export type DnsZoneType = "primary" | "secondary" | "forward" | "stub" | "forwarder"
export type DnsZoneStatus = "active" | "inactive" | "syncing" | "disabled"

export type DnsRecordType = "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SOA" | "PTR" | "SRV" | "CAA"
export type DnsRecordStatus = "active" | "pending" | "error" | "disabled"

export interface DnsDevice {
  id: string
  name: string
  hostname: string
  ip: string
  vendor: string
  product: string
  version: string
  status: DnsDeviceStatus
  dataSource: DnsDataSource
  lastSync: string
  zoneCount: number
  recordCount: number
  roles: string[]
  site: string
}

export interface DnsZone {
  id: string
  name: string
  type: DnsZoneType
  status: DnsZoneStatus
  recordCount: number
  primaryNs: string
  serial: number
  lastModified: string
  ttl: number
  dnssecStatus: string
  disabled: boolean
  comment: string
}

export interface DnsRecord {
  id: string
  name: string
  type: DnsRecordType
  value: string
  ttl: number
  zone: string
  status: DnsRecordStatus
  lastModified: string
  disabled: boolean
}

export interface DnsQueryLog {
  id: string
  domain: string
  type: string
  result: string
  responseTimeMs: number
  status: "success" | "error" | "timeout" | "blocked"
  timestamp: string
  client: string
}

export interface DnsResolverStats {
  period: string
  totalQueries: number
  allowedQueries: number
  blockedQueries: number
  cachedEntries: number
  avgResponseMs: number
  topDomains: { name: string; hits: number }[]
  topClients: { name: string; hits: number }[]
  recentQueries: DnsQueryLog[]
}

export interface DnsDeviceDetailPayload {
  device: DnsDevice
  zones: DnsZone[]
  records: DnsRecord[]
  resolverStats: DnsResolverStats
}

export type DnsTab = "zones" | "records" | "resolver"
