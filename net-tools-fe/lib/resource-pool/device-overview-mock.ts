import type { ImportKind } from "@/lib/resource-pool/device-types-mock"
import {
  enabledCapabilities,
  findDeviceType,
  IMPORT_KIND_LABELS,
  type DeviceTypeRecord,
} from "@/lib/resource-pool/device-types-mock"
import {
  resolveConnectors,
  type DataConnectorRecord,
} from "@/lib/resource-pool/data-connectors-mock"
import type { DataMode, NetworkDeviceRecord } from "@/lib/resource-pool/device-inventory-ext"
import { datasetFileHint } from "@/lib/resource-pool/device-inventory-ext"

export type DatasetSourceType = "unset" | "import" | "live"

export type SyncStatus = "idle" | "syncing" | "ok" | "error"

export interface DatasetSyncLog {
  at: string
  status: "ok" | "error"
  message: string
  rowCount?: number | null
  connectorId?: string | null
  connectorName?: string | null
  deviceIp?: string | null
  durationMs?: number | null
  details?: string[]
}

export interface DatasetBinding {
  capabilityKey: string
  label: string
  importKind: ImportKind
  fileHint: string
  source: DatasetSourceType
  connectorId: string | null
  connectorName: string | null
  importFileName: string | null
  rowCount: number | null
  lastSyncAt: string | null
  syncStatus: SyncStatus
  syncMessage?: string
  lastSyncLog?: DatasetSyncLog
}

export const SOURCE_LABELS: Record<DatasetSourceType, string> = {
  unset: "Not configured",
  import: "CSV / Import",
  live: "Live connector",
}

const DEMO_IMPORT_ROWS: Record<string, number> = {
  security_rules: 752,
  nat_rules: 937,
  address_objects: 9398,
  static_routes: 757,
  service_objects: 149,
  routing_table: 142,
  interfaces: 28,
  firewall_filter: 28,
  firewall_nat: 14,
  address_lists: 16,
  vlans: 64,
}

function connectorForCapability(
  connectors: DataConnectorRecord[],
  capabilityKey: string,
): DataConnectorRecord | undefined {
  return connectors.find((conn) => conn.capabilityKeys.includes(capabilityKey))
}

function defaultSource(
  dataMode: DataMode,
  cap: { key: string; importKind: ImportKind },
  connector?: DataConnectorRecord,
): DatasetSourceType {
  if (dataMode === "datastore") return "import"
  if (dataMode === "live") return connector ? "live" : "unset"
  if (connector && cap.importKind === "api") return "live"
  if (cap.key === "static_routes" && connector) return "live"
  return "import"
}

function seedDemoBinding(
  device: NetworkDeviceRecord,
  binding: DatasetBinding,
): DatasetBinding {
  if (device.id !== "mock-palo-edge-01") return binding

  if (binding.capabilityKey === "security_rules" || binding.capabilityKey === "nat_rules") {
    return {
      ...binding,
      source: "import",
      importFileName:
        binding.capabilityKey === "security_rules"
          ? "export_policies_security_rulebase_06132026_005249gmt+7.csv"
          : "export_policies_nat_rulebase_06132026_005343gmt+7.csv",
      rowCount: DEMO_IMPORT_ROWS[binding.capabilityKey] ?? null,
      lastSyncAt: "2026-06-13T00:52:00Z",
      syncStatus: "ok",
    }
  }

  if (binding.capabilityKey === "address_objects") {
    return {
      ...binding,
      source: "import",
      importFileName: "export_objects_addresses_06112026_172544gmt+7.csv",
      rowCount: DEMO_IMPORT_ROWS.address_objects,
      lastSyncAt: "2026-06-11T17:25:00Z",
      syncStatus: "ok",
    }
  }

  if (binding.capabilityKey === "static_routes" && binding.connectorId) {
    return {
      ...binding,
      source: "live",
      rowCount: null,
      lastSyncAt: null,
      syncStatus: "idle",
    }
  }

  return binding
}

export function initDatasetBindings(
  device: NetworkDeviceRecord,
  options?: {
    types?: DeviceTypeRecord[]
    connectors?: DataConnectorRecord[]
    enabledKeys?: string[]
  },
): DatasetBinding[] {
  const types = options?.types
  const connectorsList = options?.connectors
  const type = findDeviceType(device.deviceTypeId, types)
  if (!type) return []

  const connectors = resolveConnectors(type.connectorIds, connectorsList)
  const keys =
    options?.enabledKeys ??
    (device.datasetBindings.length > 0
      ? device.datasetBindings.map((binding) => binding.capabilityKey)
      : enabledCapabilities(type).map((cap) => cap.key))

  const caps = enabledCapabilities(type).filter((cap) => keys.includes(cap.key))

  return caps.map((cap) => {
    const connector = connectorForCapability(connectors, cap.key)
    const source = defaultSource(device.dataMode, cap, connector)

    const binding: DatasetBinding = {
      capabilityKey: cap.key,
      label: cap.label,
      importKind: cap.importKind,
      fileHint: datasetFileHint(cap, connectors),
      source,
      connectorId: source === "live" && connector ? connector.id : connector?.id ?? null,
      connectorName: source === "live" && connector ? connector.name : connector?.name ?? null,
      importFileName: null,
      rowCount: null,
      lastSyncAt: null,
      syncStatus: "idle",
    }

    return seedDemoBinding(device, binding)
  })
}

export function rebuildDatasetBindings(
  device: NetworkDeviceRecord,
  enabledKeys: string[],
  existingBindings: DatasetBinding[],
  options?: {
    types?: DeviceTypeRecord[]
    connectors?: DataConnectorRecord[]
  },
): DatasetBinding[] {
  const next = initDatasetBindings(device, { ...options, enabledKeys })
  return next.map((binding) => {
    const previous = existingBindings.find(
      (item) => item.capabilityKey === binding.capabilityKey,
    )
    if (!previous) return binding

    const connectorChanged = previous.connectorId !== binding.connectorId
    if (connectorChanged) {
      if (previous.source === "import" && previous.importFileName) {
        return {
          ...binding,
          source: "import",
          importFileName: previous.importFileName,
          rowCount: previous.rowCount,
          lastSyncAt: previous.lastSyncAt,
          syncStatus: previous.syncStatus,
          syncMessage: previous.syncMessage,
        }
      }
      return binding
    }

    return {
      ...binding,
      source: previous.source,
      connectorId: previous.connectorId,
      connectorName: previous.connectorName,
      importFileName: previous.importFileName,
      rowCount: previous.rowCount,
      lastSyncAt: previous.lastSyncAt,
      syncStatus: previous.syncStatus,
      syncMessage: previous.syncMessage,
    }
  })
}

export function connectorsForCapability(
  deviceTypeId: string,
  capabilityKey: string,
  options?: {
    types?: DeviceTypeRecord[]
    connectors?: DataConnectorRecord[]
  },
): DataConnectorRecord[] {
  const type = findDeviceType(deviceTypeId, options?.types)
  if (!type) return []
  return resolveConnectors(type.connectorIds, options?.connectors).filter((conn) =>
    conn.capabilityKeys.includes(capabilityKey),
  )
}

export function formatSyncTime(iso: string | null): string {
  if (!iso) return "Never"
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export { IMPORT_KIND_LABELS }
