import type {
  ConnectorAuthConfig,
  DataMode,
  InventoryCategory,
  NetworkDeviceRecord,
} from "@/lib/resource-pool/device-inventory-ext"
import type { DatasetBinding } from "@/lib/resource-pool/device-overview-mock"

export interface NetworkDeviceApiRecord {
  id: string
  name: string
  hostname: string
  ip: string
  category: Exclude<InventoryCategory, "server" | "other">
  device_type_id: string
  device_type_name: string
  data_mode: DataMode
  os: string
  notes: string
  connector_auth: Record<string, ConnectorAuthConfig>
  dataset_bindings: DatasetBinding[]
  dataset_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface NetworkDeviceCreatePayload {
  id?: string
  name: string
  hostname: string
  ip: string
  category: Exclude<InventoryCategory, "server" | "other">
  device_type_id: string
  device_type_name?: string
  data_mode: DataMode
  os?: string
  notes?: string
  connector_auth?: Record<string, ConnectorAuthConfig>
  dataset_bindings?: DatasetBinding[]
  dataset_data?: Record<string, unknown>
}

export interface NetworkDeviceUpdatePayload {
  name?: string
  hostname?: string
  ip?: string
  category?: Exclude<InventoryCategory, "server" | "other">
  device_type_id?: string
  device_type_name?: string
  data_mode?: DataMode
  os?: string
  notes?: string
  connector_auth?: Record<string, ConnectorAuthConfig>
  dataset_bindings?: DatasetBinding[]
  dataset_data?: Record<string, unknown>
}

export function mapNetworkDeviceFromApi(record: NetworkDeviceApiRecord): NetworkDeviceRecord {
  return {
    id: record.id,
    name: record.name,
    hostname: record.hostname,
    ip: record.ip,
    category: record.category,
    deviceTypeId: record.device_type_id,
    deviceTypeName: record.device_type_name,
    dataMode: record.data_mode,
    os: record.os,
    notes: record.notes,
    connectorAuth: record.connector_auth ?? {},
    datasetBindings: record.dataset_bindings ?? [],
    datasetData: record.dataset_data ?? {},
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

export function networkDevicePayloadFromRecord(record: NetworkDeviceRecord): NetworkDeviceCreatePayload {
  return {
    name: record.name,
    hostname: record.hostname,
    ip: record.ip,
    category: record.category,
    device_type_id: record.deviceTypeId,
    device_type_name: record.deviceTypeName,
    data_mode: record.dataMode,
    os: record.os,
    notes: record.notes,
    connector_auth: record.connectorAuth,
    dataset_bindings: record.datasetBindings,
    dataset_data: record.datasetData ?? {},
  }
}

export async function fetchNetworkDevices(
  category?: "firewall" | "router" | "switch",
): Promise<NetworkDeviceRecord[]> {
  const query = category ? `?category=${category}` : ""
  const res = await fetch(`/api/resource-pool/network-devices${query}`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load network devices")
  const data = (await res.json()) as NetworkDeviceApiRecord[]
  return data.map(mapNetworkDeviceFromApi)
}

export async function fetchNetworkDevice(id: string): Promise<NetworkDeviceRecord> {
  const res = await fetch(`/api/resource-pool/network-devices/${id}`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load network device")
  return mapNetworkDeviceFromApi((await res.json()) as NetworkDeviceApiRecord)
}

export async function createNetworkDevice(
  payload: NetworkDeviceCreatePayload,
): Promise<NetworkDeviceRecord> {
  const res = await fetch("/api/resource-pool/network-devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to create network device")
  return mapNetworkDeviceFromApi(data as NetworkDeviceApiRecord)
}

export async function updateNetworkDevice(
  id: string,
  payload: NetworkDeviceUpdatePayload,
): Promise<NetworkDeviceRecord> {
  const res = await fetch(`/api/resource-pool/network-devices/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to update network device")
  return mapNetworkDeviceFromApi(data as NetworkDeviceApiRecord)
}

export async function deleteNetworkDevice(id: string): Promise<void> {
  const res = await fetch(`/api/resource-pool/network-devices/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? "Failed to delete network device")
  }
}

export async function patchDatasetBinding(
  deviceId: string,
  capabilityKey: string,
  patch: Partial<DatasetBinding>,
  currentBindings: DatasetBinding[],
): Promise<NetworkDeviceRecord> {
  const nextBindings = currentBindings.map((binding) =>
    binding.capabilityKey === capabilityKey ? { ...binding, ...patch } : binding,
  )
  return updateNetworkDevice(deviceId, { dataset_bindings: nextBindings })
}

export async function importDatasetCsv(
  deviceId: string,
  capabilityKey: string,
  patch: Partial<DatasetBinding>,
  currentBindings: DatasetBinding[],
  currentDatasetData: Record<string, unknown>,
  parsedRows: unknown[],
): Promise<NetworkDeviceRecord> {
  const nextBindings = currentBindings.map((binding) =>
    binding.capabilityKey === capabilityKey ? { ...binding, ...patch } : binding,
  )
  const nextDatasetData = {
    ...currentDatasetData,
    [capabilityKey]: parsedRows,
  }
  return updateNetworkDevice(deviceId, {
    dataset_bindings: nextBindings,
    dataset_data: nextDatasetData,
  })
}
