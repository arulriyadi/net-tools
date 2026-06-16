import { NextRequest, NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type { DataConnectorApiRecord, DataConnectorCreatePayload } from "@/lib/resource-pool/data-connectors-api"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as DataConnectorCreatePayload
    const connector = await nettoolsFetch<DataConnectorApiRecord>(`/api/data-connectors/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
    return NextResponse.json(connector)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update data connector" },
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
    await nettoolsFetch<void>(`/api/data-connectors/${id}`, { method: "DELETE" })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete data connector" },
      { status },
    )
  }
}
