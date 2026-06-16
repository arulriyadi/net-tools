import { NextResponse } from "next/server"
import { NettoolsApiError, nettoolsFetch } from "@/lib/nettools-api"
import type { CreateServerPayload, ServerRecord } from "@/lib/resource-pool/servers"

export async function GET() {
  try {
    const servers = await nettoolsFetch<ServerRecord[]>("/api/servers")
    return NextResponse.json(servers)
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list devices" },
      { status },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateServerPayload
    const server = await nettoolsFetch<ServerRecord>("/api/servers", {
      method: "POST",
      body: JSON.stringify(body),
    })
    return NextResponse.json(server, { status: 201 })
  } catch (err) {
    const status = err instanceof NettoolsApiError ? err.status : 500
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create device" },
      { status },
    )
  }
}
