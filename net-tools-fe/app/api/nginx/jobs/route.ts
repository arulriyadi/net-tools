import { NextRequest, NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type { NginxJobRecord } from "@/lib/resource-pool/servers"

export async function GET(request: NextRequest) {
  try {
    const limit = request.nextUrl.searchParams.get("limit") ?? "50"
    const serverId = request.nextUrl.searchParams.get("server_id")
    const qs = new URLSearchParams({ limit })
    if (serverId) qs.set("server_id", serverId)
    const jobs = await nettoolsFetch<NginxJobRecord[]>(`/api/nginx/jobs?${qs}`)
    return NextResponse.json(jobs)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list jobs" },
      { status },
    )
  }
}
