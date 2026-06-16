import { NextRequest, NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const result = await nettoolsFetch<Record<string, unknown>>(`/api/nginx/check/${id}`, {
      method: "POST",
    })
    return NextResponse.json(result)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Check failed" },
      { status },
    )
  }
}
