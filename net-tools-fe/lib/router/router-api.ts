import { fetchDeviceTypes } from "@/lib/resource-pool/device-types-api"
import {
  fetchNetworkDevice,
  fetchNetworkDevices,
  syncDatasetLive,
} from "@/lib/resource-pool/network-devices-api"
import {
  mapNetworkDeviceToRouterDetail,
  mapNetworkDeviceToRouterDevice,
} from "@/lib/router/inventory-router-mapper"
import type { RouterDevice, RouterDeviceDetailPayload } from "@/lib/router/router-types"

async function loadRouterRecords() {
  const [devices, types] = await Promise.all([
    fetchNetworkDevices("router"),
    fetchDeviceTypes(),
  ])
  const typeById = new Map(types.map((type) => [type.id, type]))
  return devices.map((device) => ({
    device,
    type: typeById.get(device.deviceTypeId),
  }))
}

export async function fetchRouterDevices(): Promise<RouterDevice[]> {
  const records = await loadRouterRecords()
  return records.map(({ device, type }) => mapNetworkDeviceToRouterDevice(device, type))
}

export async function fetchRouterDeviceDetail(id: string): Promise<RouterDeviceDetailPayload> {
  const [device, types] = await Promise.all([fetchNetworkDevice(id), fetchDeviceTypes()])
  if (device.category !== "router") {
    throw new Error("Device is not a router")
  }
  const type = types.find((item) => item.id === device.deviceTypeId)
  return mapNetworkDeviceToRouterDetail(device, type)
}

export async function syncRouterDevice(id: string): Promise<RouterDeviceDetailPayload> {
  let record = await fetchNetworkDevice(id)
  if (record.category !== "router") {
    throw new Error("Device is not a router")
  }

  const liveBindings = (record.datasetBindings ?? []).filter(
    (binding) => binding.source === "live" && binding.connectorId,
  )

  for (const binding of liveBindings) {
    const result = await syncDatasetLive(id, binding.capabilityKey)
    record = result.device
  }

  const types = await fetchDeviceTypes()
  const type = types.find((item) => item.id === record.deviceTypeId)
  return mapNetworkDeviceToRouterDetail(record, type)
}

export async function syncAllRouterDevices(): Promise<RouterDevice[]> {
  const records = await loadRouterRecords()

  for (const { device } of records) {
    const liveBindings = (device.datasetBindings ?? []).filter(
      (binding) => binding.source === "live" && binding.connectorId,
    )
    for (const binding of liveBindings) {
      await syncDatasetLive(device.id, binding.capabilityKey)
    }
  }

  return fetchRouterDevices()
}
