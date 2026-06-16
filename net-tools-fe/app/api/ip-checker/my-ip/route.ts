import { NextResponse } from "next/server"
import {
  buildRiskFromGeo,
  collectMyIpSources,
  consensusIp,
  fetchGeo,
} from "@/lib/ip-checker/services"
import type { MyIpResponse } from "@/lib/ip-checker/types"

export async function GET() {
  try {
    const { sources, cloudflareTrace } = await collectMyIpSources()
    const { ipv4, ipv6 } = consensusIp(sources)
    const lookupIp = ipv4 ?? ipv6
    const { geo, riskInput } = lookupIp ? await fetchGeo(lookupIp) : { geo: null }
    const risk = buildRiskFromGeo(geo, riskInput)

    const body: MyIpResponse = {
      sources,
      consensusIpv4: ipv4,
      consensusIpv6: ipv6,
      geo: geo ?? undefined,
      risk,
      cloudflareTrace,
      fetchedAt: new Date().toISOString(),
    }
    return NextResponse.json(body)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to detect IP" },
      { status: 500 },
    )
  }
}
