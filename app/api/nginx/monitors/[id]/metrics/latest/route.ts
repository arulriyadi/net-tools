import { NextRequest, NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type { NginxUiMetricsRecord } from "@/lib/nginx/api"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const metrics = await nettoolsFetch<NginxUiMetricsRecord>(
      `/api/nginx/monitors/${id}/metrics/latest`,
    )
    return NextResponse.json(metrics)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load nginx-ui metrics" },
      { status },
    )
  }
}
