import { NextRequest, NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type { NginxSecurityScanView } from "@/lib/nginx/security-types"

export async function GET(request: NextRequest) {
  try {
    const serverId = request.nextUrl.searchParams.get("server_id")
    if (!serverId) {
      return NextResponse.json({ error: "server_id is required" }, { status: 400 })
    }
    const limit = request.nextUrl.searchParams.get("limit") ?? "20"
    const scans = await nettoolsFetch<NginxSecurityScanView[]>(
      `/api/nginx/security-scan?server_id=${serverId}&limit=${limit}`,
    )
    return NextResponse.json(scans)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list security scans" },
      { status },
    )
  }
}
