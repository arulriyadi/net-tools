import { NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type {
  NetworkDeviceApiRecord,
  NetworkDeviceCreatePayload,
} from "@/lib/resource-pool/network-devices-api"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const path = category
      ? `/api/network-devices?category=${encodeURIComponent(category)}`
      : "/api/network-devices"
    const devices = await nettoolsFetch<NetworkDeviceApiRecord[]>(path)
    return NextResponse.json(devices)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list network devices" },
      { status },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NetworkDeviceCreatePayload
    const device = await nettoolsFetch<NetworkDeviceApiRecord>("/api/network-devices", {
      method: "POST",
      body: JSON.stringify(body),
    })
    return NextResponse.json(device, { status: 201 })
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create network device" },
      { status },
    )
  }
}
