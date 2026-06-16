import { NextRequest, NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const result = await nettoolsFetch<Record<string, unknown>>(`/api/nginx/upgrade/${id}`, {
      method: "POST",
      body: JSON.stringify(body),
    })
    return NextResponse.json(result, { status: 202 })
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upgrade failed" },
      { status },
    )
  }
}
