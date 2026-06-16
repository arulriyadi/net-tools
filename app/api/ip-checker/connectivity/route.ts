import { NextResponse } from "next/server"
import type { ConnectivityTarget } from "@/lib/ip-checker/types"

const TARGETS: Omit<ConnectivityTarget, "status" | "latencyMs" | "httpStatus" | "error">[] = [
  { name: "Google", region: "Global", url: "https://www.google.com/generate_204" },
  { name: "Cloudflare", region: "Global", url: "https://cloudflare.com/cdn-cgi/trace" },
  { name: "AWS", region: "Global", url: "https://aws.amazon.com/favicon.ico" },
  { name: "GitHub", region: "Global", url: "https://github.com/favicon.ico" },
  { name: "Alibaba Cloud", region: "Asia", url: "https://www.alibabacloud.com/favicon.ico" },
  { name: "Microsoft", region: "Global", url: "https://www.microsoft.com/favicon.ico" },
]

async function probe(target: (typeof TARGETS)[number]): Promise<ConnectivityTarget> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(target.url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })
    clearTimeout(timer)
    const latencyMs = Date.now() - start
    const blocked = res.status === 403 || res.status === 451
    return {
      ...target,
      status: res.ok || res.status === 204 ? "ok" : blocked ? "blocked" : "fail",
      latencyMs,
      httpStatus: res.status,
    }
  } catch (err) {
    return {
      ...target,
      status: "fail",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Failed",
    }
  }
}

export async function GET() {
  try {
    const results = await Promise.all(TARGETS.map(probe))
    return NextResponse.json({
      results,
      fetchedAt: new Date().toISOString(),
      note: "Probed from NetTools server (my-ubuntu). Client-side latency may differ.",
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Connectivity test failed" },
      { status: 500 },
    )
  }
}
