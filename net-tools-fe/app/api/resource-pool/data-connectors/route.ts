import { NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type { DataConnectorApiRecord, DataConnectorCreatePayload } from "@/lib/resource-pool/data-connectors-api"

export async function GET() {
  try {
    const connectors = await nettoolsFetch<DataConnectorApiRecord[]>("/api/data-connectors")
    return NextResponse.json(connectors)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list data connectors" },
      { status },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DataConnectorCreatePayload
    const connector = await nettoolsFetch<DataConnectorApiRecord>("/api/data-connectors", {
      method: "POST",
      body: JSON.stringify(body),
    })
    return NextResponse.json(connector, { status: 201 })
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create data connector" },
      { status },
    )
  }
}
