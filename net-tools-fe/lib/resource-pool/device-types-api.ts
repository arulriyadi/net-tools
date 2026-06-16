import type { DeviceCategory, DeviceTypeFormData, DeviceTypeRecord } from "@/lib/resource-pool/device-types-mock"
import { recordFromForm } from "@/lib/resource-pool/device-types-mock"

export interface DeviceTypeApiRecord {
  id: string
  name: string
  vendor: string
  category: DeviceCategory
  description: string
  capabilities: DeviceTypeRecord["capabilities"]
  connector_ids: string[]
  device_count: number
  created_at: string
  updated_at: string
}

export interface DeviceTypeCreatePayload {
  id?: string
  name: string
  vendor: string
  category: DeviceCategory
  description?: string
  capabilities: DeviceTypeRecord["capabilities"]
  connector_ids: string[]
}

export function mapDeviceTypeFromApi(record: DeviceTypeApiRecord): DeviceTypeRecord {
  return {
    id: record.id,
    name: record.name,
    vendor: record.vendor,
    category: record.category,
    description: record.description,
    capabilities: record.capabilities,
    connectorIds: record.connector_ids,
    deviceCount: record.device_count,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

export function deviceTypePayloadFromRecord(record: DeviceTypeRecord): DeviceTypeCreatePayload {
  return {
    name: record.name,
    vendor: record.vendor,
    category: record.category,
    description: record.description,
    capabilities: record.capabilities,
    connector_ids: record.connectorIds,
  }
}

export function mapDeviceTypeFormToPayload(
  form: DeviceTypeFormData,
  existing?: DeviceTypeRecord,
): DeviceTypeCreatePayload {
  return deviceTypePayloadFromRecord(recordFromForm(form, existing))
}

export async function fetchDeviceTypes(): Promise<DeviceTypeRecord[]> {
  const res = await fetch("/api/resource-pool/device-types", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load device types")
  const data = (await res.json()) as DeviceTypeApiRecord[]
  return data.map(mapDeviceTypeFromApi)
}

export async function createDeviceType(
  payload: DeviceTypeCreatePayload,
): Promise<DeviceTypeRecord> {
  const res = await fetch("/api/resource-pool/device-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to create device type")
  return mapDeviceTypeFromApi(data as DeviceTypeApiRecord)
}

export async function updateDeviceType(
  id: string,
  payload: DeviceTypeCreatePayload,
): Promise<DeviceTypeRecord> {
  const res = await fetch(`/api/resource-pool/device-types/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to update device type")
  return mapDeviceTypeFromApi(data as DeviceTypeApiRecord)
}

export async function deleteDeviceType(id: string): Promise<void> {
  const res = await fetch(`/api/resource-pool/device-types/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? "Failed to delete device type")
  }
}
