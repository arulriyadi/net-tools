import { NextRequest, NextResponse } from "next/server"
import { checkBlacklists, reputationScore } from "@/lib/ip-checker/blacklist"
import { isValidIp } from "@/lib/ip-checker/utils"

export async function GET(request: NextRequest) {
  const ip = request.nextUrl.searchParams.get("ip")?.trim()
  if (!ip) {
    return NextResponse.json({ error: "Missing ip parameter" }, { status: 400 })
  }
  if (!isValidIp(ip)) {
    return NextResponse.json({ error: "Invalid IP address" }, { status: 400 })
  }

  try {
    const results = await checkBlacklists(ip)
    const reputation = reputationScore(results)
    return NextResponse.json({
      ip,
      results,
      reputation,
      fetchedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Blacklist check failed" },
      { status: 500 },
    )
  }
}
