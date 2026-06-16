import { NextRequest, NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type { NginxUiMetricHistoryRecord } from "@/lib/nginx/api"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const range = request.nextUrl.searchParams.get("range") ?? "24h"
    const history = await nettoolsFetch<NginxUiMetricHistoryRecord>(
      `/api/nginx/monitors/${id}/metrics/history?range=${encodeURIComponent(range)}`,
    )
    return NextResponse.json(history)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load metrics history" },
      { status },
    )
  }
}
