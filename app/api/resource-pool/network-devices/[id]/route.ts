import { NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type {
  NetworkDeviceApiRecord,
  NetworkDeviceUpdatePayload,
} from "@/lib/resource-pool/network-devices-api"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const device = await nettoolsFetch<NetworkDeviceApiRecord>(`/api/network-devices/${id}`)
    return NextResponse.json(device)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load network device" },
      { status },
    )
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as NetworkDeviceUpdatePayload
    const device = await nettoolsFetch<NetworkDeviceApiRecord>(`/api/network-devices/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
    return NextResponse.json(device)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update network device" },
      { status },
    )
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    await nettoolsFetch(`/api/network-devices/${id}`, { method: "DELETE" })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete network device" },
      { status },
    )
  }
}
