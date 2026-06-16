import type { DatasetBinding } from "@/lib/resource-pool/device-overview-mock"
import { formatSyncTime } from "@/lib/resource-pool/device-overview-mock"
import type { NetworkDeviceRecord } from "@/lib/resource-pool/device-inventory-ext"
import type { DeviceTypeRecord } from "@/lib/resource-pool/device-types-mock"
import {
  mapMikrotikAddressLists,
  mapMikrotikFilterRules,
  mapMikrotikInterfaces,
  mapMikrotikNatRules,
  mapMikrotikRoutes,
} from "@/lib/router/mikrotik-rest-mapper"
import type {
  MikrotikRestAddressList,
  MikrotikRestFirewallFilter,
  MikrotikRestFirewallNat,
  MikrotikRestInterface,
  MikrotikRestIpAddress,
  MikrotikRestRoute,
} from "@/lib/router/mikrotik-rest-types"
import type {
  DataSourceType,
  RouterDevice,
  RouterDeviceDetailPayload,
  RouterDeviceStatus,
} from "@/lib/router/router-types"

interface InterfaceDataset {
  primary: MikrotikRestInterface[]
  companion?: MikrotikRestIpAddress[]
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function datasetRowCount(value: unknown): number {
  if (Array.isArray(value)) return value.length
  if (value && typeof value === "object" && "primary" in value) {
    return asArray((value as InterfaceDataset).primary).length
  }
  return 0
}

function extractInterfaces(value: unknown): {
  rows: MikrotikRestInterface[]
  addresses: MikrotikRestIpAddress[]
} {
  if (value && typeof value === "object" && "primary" in value) {
    const payload = value as InterfaceDataset
    return {
      rows: asArray(payload.primary),
      addresses: asArray(payload.companion),
    }
  }
  return { rows: asArray(value), addresses: [] }
}

function deriveDataSource(record: NetworkDeviceRecord): DataSourceType {
  const bindings = record.datasetBindings ?? []
  const hasLive = bindings.some((b) => b.source === "live")
  const hasImport = bindings.some((b) => b.source === "import")
  if (record.dataMode === "live" || hasLive) return "live-api"
  if (record.dataMode === "hybrid" && hasImport) return "csv-import"
  if (hasImport || record.dataMode === "datastore") return "csv-import"
  if (bindings.some((b) => b.source === "unset")) return "manual"
  return "none"
}

function deriveStatus(record: NetworkDeviceRecord): RouterDeviceStatus {
  const bindings = record.datasetBindings ?? []
  const liveBindings = bindings.filter((b) => b.source === "live")
  if (liveBindings.length === 0) {
    return deriveDataSource(record) === "csv-import" ? "degraded" : "offline"
  }
  const synced = liveBindings.filter((b) => b.syncStatus === "ok" && (b.rowCount ?? 0) > 0)
  if (synced.length === liveBindings.length) return "online"
  if (synced.length > 0) return "degraded"
  return "offline"
}

function latestSyncAt(bindings: DatasetBinding[]): string {
  const times = bindings
    .map((b) => b.lastSyncAt)
    .filter((t): t is string => Boolean(t))
    .sort()
  return times.length ? formatSyncTime(times[times.length - 1]) : "Never"
}

function primaryRoutingTable(data: Record<string, unknown>): string {
  const routes = asArray<MikrotikRestRoute>(data.routing_table)
  const main = routes.find((r) => r["routing-table"] === "main" && r["dst-address"] === "0.0.0.0/0")
  if (main) return "main"
  return routes[0]?.["routing-table"] ?? "—"
}

export function mapNetworkDeviceToRouterDevice(
  record: NetworkDeviceRecord,
  deviceType?: DeviceTypeRecord,
): RouterDevice {
  const data = record.datasetData ?? {}
  const bindings = record.datasetBindings ?? []

  return {
    id: record.id,
    name: record.name,
    hostname: record.hostname,
    ip: record.ip,
    vendor: deviceType?.vendor ?? record.deviceTypeName.split(" ")[0] ?? "—",
    model: deviceType?.name ?? record.deviceTypeName,
    os: record.os || "RouterOS",
    status: deriveStatus(record),
    dataSource: deriveDataSource(record),
    lastSync: latestSyncAt(bindings),
    routeCount: datasetRowCount(data.routing_table),
    interfaceCount: datasetRowCount(data.interfaces),
    firewallRuleCount: datasetRowCount(data.firewall_filter),
    natRuleCount: datasetRowCount(data.firewall_nat),
    addressListCount: datasetRowCount(data.address_lists),
    routingTable: primaryRoutingTable(data),
    site: record.notes?.trim() || "—",
  }
}

export function mapNetworkDeviceToRouterDetail(
  record: NetworkDeviceRecord,
  deviceType?: DeviceTypeRecord,
): RouterDeviceDetailPayload {
  const data = record.datasetData ?? {}
  const { rows: ifaceRows, addresses } = extractInterfaces(data.interfaces)

  return {
    device: mapNetworkDeviceToRouterDevice(record, deviceType),
    routes: mapMikrotikRoutes(asArray<MikrotikRestRoute>(data.routing_table)),
    interfaces: mapMikrotikInterfaces(ifaceRows, addresses),
    firewallRules: mapMikrotikFilterRules(asArray<MikrotikRestFirewallFilter>(data.firewall_filter)),
    natRules: mapMikrotikNatRules(asArray<MikrotikRestFirewallNat>(data.firewall_nat)),
    addressLists: mapMikrotikAddressLists(asArray<MikrotikRestAddressList>(data.address_lists)),
  }
}
