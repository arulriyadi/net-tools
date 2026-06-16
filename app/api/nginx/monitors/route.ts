import { NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type { AddNginxMonitorPayload, NginxMonitorRecord } from "@/lib/nginx/api"

export async function GET() {
  try {
    const monitors = await nettoolsFetch<NginxMonitorRecord[]>("/api/nginx/monitors")
    return NextResponse.json(monitors)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list monitors" },
      { status },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AddNginxMonitorPayload
    const monitor = await nettoolsFetch<NginxMonitorRecord>("/api/nginx/monitors", {
      method: "POST",
      body: JSON.stringify(body),
    })
    return NextResponse.json(monitor, { status: 201 })
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    const message =
      err instanceof NettoolsApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to add nginx-ui monitor"
    return NextResponse.json({ error: message }, { status })
  }
}
