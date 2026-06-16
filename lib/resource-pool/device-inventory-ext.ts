import type { DeviceCategory } from "@/lib/resource-pool/device-types-mock"
import { CATEGORY_LABELS, findDeviceType } from "@/lib/resource-pool/device-types-mock"
import type { DataConnectorRecord } from "@/lib/resource-pool/data-connectors-mock"

export type SshAuthMethod = "password" | "key"

export type InventoryCategory = "server" | DeviceCategory | "other"

export type DataMode = "datastore" | "live" | "hybrid"

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  server: "Server",
  ...CATEGORY_LABELS,
  other: "Other",
}

export const DATA_MODE_LABELS: Record<DataMode, string> = {
  datastore: "Datastore only",
  live: "Live",
  hybrid: "Hybrid",
}

export const DATA_MODE_HINTS: Record<DataMode, string> = {
  datastore: "Import CSV datasets on Device Overview — no live polling credentials needed.",
  live: "Poll device via mapped connectors. Configure credentials below.",
  hybrid: "Mix of live polling and CSV import — per-dataset binding on Device Overview.",
}

export function isNetworkCategory(category: InventoryCategory): category is DeviceCategory {
  return category === "firewall" || category === "router" || category === "switch"
}

export function defaultDataMode(
  deviceTypeId: string,
  connectors: DataConnectorRecord[],
): DataMode {
  const type = findDeviceType(deviceTypeId)
  if (!type || connectors.length === 0) return "datastore"
  return "hybrid"
}

export interface ConnectorAuthConfig {
  connectorId: string
  apiPort: string
  apiKey: string
  apiUser: string
  apiPassword: string
  snmpPort: string
  snmpVersion: "v2c" | "v3"
  snmpCommunity: string
  snmpV3User: string
  sshUser: string
  sshPort: string
  sshAuthMethod: SshAuthMethod
  sshKeyId: string
  sshPassword: string
}

export function emptyConnectorAuth(conn: DataConnectorRecord): ConnectorAuthConfig {
  return {
    connectorId: conn.id,
    apiPort: conn.defaultPort != null ? String(conn.defaultPort) : "443",
    apiKey: "",
    apiUser: "",
    apiPassword: "",
    snmpPort: conn.defaultPort != null ? String(conn.defaultPort) : "161",
    snmpVersion: "v2c",
    snmpCommunity: "",
    snmpV3User: "",
    sshUser: conn.protocol === "ssh" ? "admin" : "",
    sshPort: conn.defaultPort != null ? String(conn.defaultPort) : "22",
    sshAuthMethod: "key",
    sshKeyId: "",
    sshPassword: "",
  }
}

export interface NetworkDeviceRecord {
  id: string
  name: string
  hostname: string
  ip: string
  category: DeviceCategory
  deviceTypeId: string
  deviceTypeName: string
  dataMode: DataMode
  os: string
  notes: string
  connectorAuth: Record<string, ConnectorAuthConfig>
  datasetBindings: import("@/lib/resource-pool/device-overview-mock").DatasetBinding[]
  datasetData: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}

/** @deprecated use NetworkDeviceRecord */
export type NetworkDeviceMockRecord = NetworkDeviceRecord

export function networkDeviceFromForm(
  form: {
    name: string
    hostname: string
    ip: string
    category: DeviceCategory
    deviceTypeId: string
    dataMode: DataMode
    os: string
    notes: string
    connectorAuth: Record<string, ConnectorAuthConfig>
  },
  existing?: NetworkDeviceRecord,
  options?: {
    deviceTypeName?: string
    datasetBindings?: NetworkDeviceRecord["datasetBindings"]
  },
): NetworkDeviceRecord {
  const type = findDeviceType(form.deviceTypeId)
  return {
    id: existing?.id ?? "",
    name: form.name.trim(),
    hostname: form.hostname.trim(),
    ip: form.ip.trim(),
    category: form.category,
    deviceTypeId: form.deviceTypeId,
    deviceTypeName: options?.deviceTypeName ?? type?.name ?? existing?.deviceTypeName ?? "Unknown type",
    dataMode: form.dataMode,
    os: form.os.trim(),
    notes: form.notes.trim(),
    connectorAuth: { ...form.connectorAuth },
    datasetBindings: options?.datasetBindings ?? existing?.datasetBindings ?? [],
    datasetData: existing?.datasetData ?? {},
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: existing?.updatedAt,
  }
}

export function connectorAuthValid(
  conn: DataConnectorRecord,
  auth: ConnectorAuthConfig | undefined,
): boolean {
  if (!auth) return false

  if (conn.protocol === "api" || conn.protocol === "rest" || conn.protocol === "netconf") {
    if (conn.authMethods.includes("api_key") && auth.apiKey.trim()) return true
    if (
      (conn.authMethods.includes("basic") || conn.authMethods.includes("bearer")) &&
      auth.apiUser.trim()
    ) {
      return true
    }
    return false
  }

  if (conn.protocol === "snmp") {
    if (auth.snmpVersion === "v2c") return auth.snmpCommunity.trim().length > 0
    return auth.snmpV3User.trim().length > 0
  }

  if (conn.protocol === "ssh") {
    if (auth.sshAuthMethod === "key") return auth.sshKeyId.trim().length > 0
    return auth.sshUser.trim().length > 0
  }

  return false
}
