import { NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type { ServerRecord } from "@/lib/resource-pool/servers"

export async function GET() {
  try {
    const servers = await nettoolsFetch<ServerRecord[]>("/api/nginx/monitors/available")
    return NextResponse.json(servers)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list available devices" },
      { status },
    )
  }
}
