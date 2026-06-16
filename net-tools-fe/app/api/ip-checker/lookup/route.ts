import { NextRequest, NextResponse } from "next/server"
import {
  buildRiskFromGeo,
  fetchGeo,
  fetchWhoisRdap,
} from "@/lib/ip-checker/services"
import { isValidIp } from "@/lib/ip-checker/utils"
import type { IpLookupResponse } from "@/lib/ip-checker/types"

export async function GET(request: NextRequest) {
  const ip = request.nextUrl.searchParams.get("ip")?.trim()
  if (!ip) {
    return NextResponse.json({ error: "Missing ip parameter" }, { status: 400 })
  }
  if (!isValidIp(ip)) {
    return NextResponse.json({ error: "Invalid IP address" }, { status: 400 })
  }

  try {
    const [{ geo, riskInput }, whois] = await Promise.all([
      fetchGeo(ip),
      fetchWhoisRdap(ip),
    ])

    const body: IpLookupResponse = {
      ip,
      sources: [],
      geo: geo ?? undefined,
      risk: buildRiskFromGeo(geo, riskInput),
      whois: whois ?? undefined,
      fetchedAt: new Date().toISOString(),
    }
    return NextResponse.json(body)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lookup failed" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  let ips: string[] = []
  try {
    const body = (await request.json()) as { ips?: string[] }
    ips = body.ips ?? []
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!ips.length) {
    return NextResponse.json({ error: "No IPs provided" }, { status: 400 })
  }
  if (ips.length > 20) {
    return NextResponse.json({ error: "Maximum 20 IPs per bulk lookup" }, { status: 400 })
  }

  const results = await Promise.all(
    ips.map(async (raw) => {
      const ip = raw.trim()
      if (!isValidIp(ip)) {
        return { ip, error: "Invalid IP" }
      }
      const { geo, riskInput } = await fetchGeo(ip)
      return {
        ip,
        geo: geo ?? undefined,
        risk: buildRiskFromGeo(geo, riskInput),
        fetchedAt: new Date().toISOString(),
      }
    }),
  )

  return NextResponse.json({ results, fetchedAt: new Date().toISOString() })
}
