import { fetchNetworkDevice, fetchNetworkDevices } from "@/lib/resource-pool/network-devices-api"
import {
  computeFirewallSummary,
  extractFirewallDatasets,
  mapNetworkDeviceToFwDevice,
} from "@/lib/firewall/firewall-mapper"
import type { FirewallDeviceDetailPayload, FwDevice } from "@/lib/firewall/firewall-types"

export { computeFirewallSummary }

export async function fetchFirewallDevices(): Promise<FwDevice[]> {
  const records = await fetchNetworkDevices("firewall")
  return records.map(mapNetworkDeviceToFwDevice)
}

export async function fetchFirewallDeviceDetail(
  deviceId: string,
): Promise<FirewallDeviceDetailPayload> {
  const record = await fetchNetworkDevice(deviceId)
  if (record.category !== "firewall") {
    throw new Error("Device is not a firewall")
  }
  const device = mapNetworkDeviceToFwDevice(record)
  const datasets = extractFirewallDatasets(record.datasetData)
  return { device, ...datasets }
}
