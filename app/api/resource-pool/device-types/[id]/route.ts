import { NextRequest, NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type { DeviceTypeApiRecord, DeviceTypeCreatePayload } from "@/lib/resource-pool/device-types-api"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as DeviceTypeCreatePayload
    const deviceType = await nettoolsFetch<DeviceTypeApiRecord>(`/api/device-types/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
    return NextResponse.json(deviceType)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update device type" },
      { status },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    await nettoolsFetch<void>(`/api/device-types/${id}`, { method: "DELETE" })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete device type" },
      { status },
    )
  }
}
