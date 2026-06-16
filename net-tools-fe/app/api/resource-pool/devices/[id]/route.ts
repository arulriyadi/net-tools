import { NextRequest, NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type { CreateServerPayload, ServerRecord } from "@/lib/resource-pool/servers"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as CreateServerPayload
    const server = await nettoolsFetch<ServerRecord>(`/api/servers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
    return NextResponse.json(server)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update device" },
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
    await nettoolsFetch<void>(`/api/servers/${id}`, { method: "DELETE" })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete device" },
      { status },
    )
  }
}
