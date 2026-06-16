/**
 * Deprecated — network devices are persisted in PostgreSQL via network-devices-api.
 * Kept temporarily for type re-exports only.
 */
import type { NetworkDeviceRecord } from "@/lib/resource-pool/device-inventory-ext"
import type { DatasetBinding } from "@/lib/resource-pool/device-overview-mock"

export function listMockDevices(): NetworkDeviceRecord[] {
  return []
}

export function getMockDevice(_id: string): NetworkDeviceRecord | undefined {
  return undefined
}

export function upsertMockDevice(_record: NetworkDeviceRecord): void {}

export function removeMockDevice(_id: string): void {}

export function getDatasetBindings(_deviceId: string): DatasetBinding[] {
  return []
}

export function updateDatasetBinding(
  _deviceId: string,
  _capabilityKey: string,
  _patch: Partial<DatasetBinding>,
): DatasetBinding[] {
  return []
}

export function setDatasetBindings(_deviceId: string, _bindings: DatasetBinding[]): void {}
