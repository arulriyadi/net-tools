import { NextRequest, NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type { NginxUiMetricsSettingsRecord } from "@/lib/nginx/api"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const settings = await nettoolsFetch<NginxUiMetricsSettingsRecord>(
      `/api/nginx/monitors/${id}/metrics/settings`,
    )
    return NextResponse.json(settings)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load metrics settings" },
      { status },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const settings = await nettoolsFetch<NginxUiMetricsSettingsRecord>(
      `/api/nginx/monitors/${id}/metrics/settings`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    )
    return NextResponse.json(settings)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update metrics settings" },
      { status },
    )
  }
}
