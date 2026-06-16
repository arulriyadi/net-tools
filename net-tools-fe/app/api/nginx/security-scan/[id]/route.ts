import { NextRequest, NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type { NginxSecurityScanView } from "@/lib/nginx/security-types"

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const result = await nettoolsFetch<NginxSecurityScanView>(`/api/nginx/security-scan/${id}`, {
      method: "POST",
    })
    return NextResponse.json(result)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Security scan failed" },
      { status },
    )
  }
}
