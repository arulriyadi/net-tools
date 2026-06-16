import { getMockDnsDeviceDetail, getMockDnsDevices } from "@/lib/dns/dns-mock-data"
import type { DnsDevice, DnsDeviceDetailPayload } from "@/lib/dns/dns-types"

const MOCK_DELAY_MS = 280

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchDnsDevices(): Promise<DnsDevice[]> {
  await delay(MOCK_DELAY_MS)
  return getMockDnsDevices()
}

export async function fetchDnsDeviceDetail(deviceId: string): Promise<DnsDeviceDetailPayload> {
  await delay(MOCK_DELAY_MS)
  const payload = getMockDnsDeviceDetail(deviceId)
  if (!payload) {
    throw new Error("DNS device not found")
  }
  return payload
}

export async function syncDnsDevice(deviceId: string): Promise<DnsDeviceDetailPayload> {
  await delay(600)
  const payload = getMockDnsDeviceDetail(deviceId)
  if (!payload) {
    throw new Error("DNS device not found")
  }
  return {
    ...payload,
    device: {
      ...payload.device,
      lastSync: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }),
      dataSource: "live-api",
    },
  }
}

export async function syncAllDnsDevices(): Promise<DnsDevice[]> {
  await delay(800)
  return getMockDnsDevices().map((d) => ({
    ...d,
    lastSync: new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }),
    dataSource: d.dataSource === "manual" ? ("live-api" as const) : d.dataSource,
  }))
}
