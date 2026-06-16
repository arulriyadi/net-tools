import { NextRequest, NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type { NginxUiCertificateRecord } from "@/lib/nginx/api"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const certificates = await nettoolsFetch<NginxUiCertificateRecord[]>(
      `/api/nginx/monitors/${id}/certificates`,
    )
    return NextResponse.json(certificates)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load nginx-ui certificates" },
      { status },
    )
  }
}
