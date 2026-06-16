import { NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type { DeviceTypeApiRecord, DeviceTypeCreatePayload } from "@/lib/resource-pool/device-types-api"

export async function GET() {
  try {
    const types = await nettoolsFetch<DeviceTypeApiRecord[]>("/api/device-types")
    return NextResponse.json(types)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list device types" },
      { status },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DeviceTypeCreatePayload
    const deviceType = await nettoolsFetch<DeviceTypeApiRecord>("/api/device-types", {
      method: "POST",
      body: JSON.stringify(body),
    })
    return NextResponse.json(deviceType, { status: 201 })
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create device type" },
      { status },
    )
  }
}
