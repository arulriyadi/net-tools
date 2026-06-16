import { NextRequest, NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type { NginxSecurityScanView } from "@/lib/nginx/security-types"

export async function GET(request: NextRequest) {
  try {
    const serverId = request.nextUrl.searchParams.get("server_id")
    if (!serverId) {
      return NextResponse.json({ error: "server_id is required" }, { status: 400 })
    }
    const result = await nettoolsFetch<NginxSecurityScanView | null>(
      `/api/nginx/security-scan/latest?server_id=${serverId}`,
    )
    return NextResponse.json(result)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    if (status === 404) return NextResponse.json(null)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load security scan" },
      { status },
    )
  }
}
