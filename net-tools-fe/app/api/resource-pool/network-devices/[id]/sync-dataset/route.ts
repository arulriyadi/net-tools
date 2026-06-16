import { NextResponse } from "next/server"
import { getNettoolsApiUrl } from "@/lib/nettools-api"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const body = await request.json()

  const res = await fetch(`${getNettoolsApiUrl()}/api/network-devices/${id}/sync-dataset`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
