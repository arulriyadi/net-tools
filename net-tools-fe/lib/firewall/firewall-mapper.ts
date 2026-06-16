import type { NetworkDeviceRecord } from "@/lib/resource-pool/device-inventory-ext"
import type { DatasetBinding } from "@/lib/resource-pool/device-overview-mock"
import type {
  AddressObject,
  DataSourceType,
  FirewallDatasetPayload,
  FwDevice,
  FwDeviceStatus,
  NatRule,
  SecurityRule,
  ServiceObject,
  StaticRoute,
} from "@/lib/firewall/firewall-types"

function bindingCount(bindings: DatasetBinding[], key: string): number {
  return bindings.find((b) => b.capabilityKey === key)?.rowCount ?? 0
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function latestSync(bindings: DatasetBinding[]): string {
  const times = bindings
    .map((b) => b.lastSyncAt)
    .filter((t): t is string => Boolean(t))
    .sort()
  return formatSyncTime(times.at(-1) ?? null)
}

function mapVendor(deviceTypeName: string): string {
  const lower = deviceTypeName.toLowerCase()
  if (lower.includes("palo")) return "Palo Alto"
  if (lower.includes("forti")) return "Fortinet"
  if (lower.includes("cisco")) return "Cisco"
  if (lower.includes("juniper")) return "Juniper"
  if (lower.includes("mikrotik")) return "MikroTik"
  const first = deviceTypeName.split(" ")[0]
  return first || "Unknown"
}

function mapDataSource(record: NetworkDeviceRecord): DataSourceType {
  const bindings = record.datasetBindings ?? []
  const sources = bindings.map((b) => b.source)
  if (sources.length === 0 || sources.every((s) => s === "unset")) {
    if (record.dataMode === "live") return "manual"
    return "none"
  }
  if (sources.some((s) => s === "live")) return "live-api"
  if (sources.some((s) => s === "import")) return "csv-import"
  return "manual"
}

function extractZones(data: Record<string, unknown>): string[] {
  const rules = (data.security_rules ?? []) as import("@/lib/firewall/firewall-types").SecurityRule[]
  const zones = new Set<string>()
  for (const rule of rules) {
    for (const part of [...rule.srcZone.split(";"), ...rule.dstZone.split(";")]) {
      const zone = part.trim()
      if (zone && zone.toLowerCase() !== "any") zones.add(zone)
    }
  }
  return [...zones].sort((a, b) => a.localeCompare(b))
}

function datasetCount(data: Record<string, unknown>, key: string): number {
  const rows = data[key]
  return Array.isArray(rows) ? rows.length : 0
}

function mapStatus(record: NetworkDeviceRecord): FwDeviceStatus {
  const bindings = record.datasetBindings ?? []
  if (bindings.length === 0) return "degraded"
  const configured = bindings.filter((b) => b.source !== "unset")
  if (configured.length === 0) return "degraded"
  if (configured.some((b) => b.syncStatus === "error")) return "offline"
  if (configured.some((b) => b.syncStatus === "ok")) return "online"
  return "degraded"
}

export function mapNetworkDeviceToFwDevice(record: NetworkDeviceRecord): FwDevice {
  const bindings = record.datasetBindings ?? []
  const datasetData = record.datasetData ?? {}
  const secCount =
    datasetCount(datasetData, "security_rules") || bindingCount(bindings, "security_rules")
  const natCount =
    datasetCount(datasetData, "nat_rules") || bindingCount(bindings, "nat_rules")
  const routeCount =
    datasetCount(datasetData, "static_routes") || bindingCount(bindings, "static_routes")
  const objectCount =
    datasetCount(datasetData, "address_objects") || bindingCount(bindings, "address_objects")
  const serviceObjectCount =
    datasetCount(datasetData, "service_objects") || bindingCount(bindings, "service_objects")

  return {
    id: record.id,
    name: record.name,
    hostname: record.hostname,
    ip: record.ip,
    vendor: mapVendor(record.deviceTypeName),
    model: record.deviceTypeName,
    os: record.os || "—",
    status: mapStatus(record),
    dataSource: mapDataSource(record),
    lastSync: latestSync(bindings),
    securityRuleCount: secCount,
    natRuleCount: natCount,
    routeCount,
    objectCount,
    serviceObjectCount,
    virtualRouter: routeCount > 0 ? "default" : "—",
    zones: extractZones(datasetData),
    site: record.notes.trim() || "—",
  }
}

export function extractFirewallDatasets(data: Record<string, unknown> = {}) {
  const payload = data as import("@/lib/firewall/firewall-types").FirewallDatasetPayload
  return {
    securityRules: (payload.security_rules ?? []) as SecurityRule[],
    natRules: (payload.nat_rules ?? []) as NatRule[],
    staticRoutes: (payload.static_routes ?? []) as StaticRoute[],
    addressObjects: (payload.address_objects ?? []) as AddressObject[],
    serviceObjects: (payload.service_objects ?? []) as ServiceObject[],
  }
}

export function computeFirewallSummary(devices: FwDevice[]) {
  const totalSec = devices.reduce((a, d) => a + d.securityRuleCount, 0)
  const totalNat = devices.reduce((a, d) => a + d.natRuleCount, 0)
  const totalRoutes = devices.reduce((a, d) => a + d.routeCount, 0)
  const totalObjects = devices.reduce((a, d) => a + d.objectCount, 0)
  const online = devices.filter((d) => d.status === "online").length
  const needSource = devices.filter(
    (d) => d.dataSource === "none" || d.dataSource === "manual",
  ).length
  return { totalSec, totalNat, totalRoutes, totalObjects, online, needSource }
}
