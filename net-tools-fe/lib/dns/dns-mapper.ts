import type { DnsDevice } from "@/lib/dns/dns-types"

export function computeDnsSummary(devices: DnsDevice[]) {
  let online = 0
  let totalZones = 0
  let totalRecords = 0
  let needSource = 0

  for (const device of devices) {
    if (device.status === "online") online++
    totalZones += device.zoneCount
    totalRecords += device.recordCount
    if (device.dataSource === "none" || device.dataSource === "manual") needSource++
  }

  return { online, totalZones, totalRecords, needSource }
}
