import { NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type {
  NetworkDeviceApiRecord,
} from "@/lib/resource-pool/network-devices-api"

type RouteContext = { params: Promise<{ id: string }> }

interface SyncDatasetApiResponse {
  device: NetworkDeviceApiRecord
  row_count: number
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as { capability_key: string }
    const result = await nettoolsFetch<SyncDatasetApiResponse>(
      `/api/network-devices/${id}/sync-dataset`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    )
    return NextResponse.json(result)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to sync dataset" },
      { status },
    )
  }
}
