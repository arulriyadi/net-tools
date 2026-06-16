import type { GeoInfo, IpSourceResult, WhoisInfo } from "./types"
import { assessRisk, parseCloudflareTrace } from "./utils"

async function timedFetch(
  url: string,
  init?: RequestInit,
  timeoutMs = 8000,
): Promise<{ text: string; ms: number }> {
  const start = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" })
    const text = await res.text()
    return { text, ms: Date.now() - start }
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchIpify(version: "v4" | "v6" = "v4"): Promise<IpSourceResult> {
  const url =
    version === "v6"
      ? "https://api64.ipify.org?format=json"
      : "https://api.ipify.org?format=json"
  try {
    const start = Date.now()
    const res = await fetch(url, { cache: "no-store" })
    const data = (await res.json()) as { ip?: string }
    const ip = data.ip ?? null
    return {
      source: version === "v6" ? "ipify (IPv6)" : "ipify",
      ipv4: version === "v4" ? ip : undefined,
      ipv6: version === "v6" ? ip : undefined,
      latencyMs: Date.now() - start,
    }
  } catch (err) {
    return {
      source: version === "v6" ? "ipify (IPv6)" : "ipify",
      error: err instanceof Error ? err.message : "Failed",
    }
  }
}

export async function fetchCloudflareTrace(): Promise<{
  source: IpSourceResult
  trace?: Record<string, string>
}> {
  try {
    const { text, ms } = await timedFetch("https://1.1.1.1/cdn-cgi/trace")
    const trace = parseCloudflareTrace(text)
    return {
      source: {
        source: "Cloudflare",
        ipv4: trace.ip ?? null,
        ipv6: trace.ip ?? null,
        latencyMs: ms,
      },
      trace,
    }
  } catch (err) {
    return {
      source: {
        source: "Cloudflare",
        error: err instanceof Error ? err.message : "Failed",
      },
    }
  }
}

export async function fetchIpApiCo(ip?: string): Promise<GeoInfo | null> {
  const url = ip ? `https://ipapi.co/${ip}/json/` : "https://ipapi.co/json/"
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "NetTools-IPChecker/1.0" },
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    if (data.error) return null
    return {
      ip: String(data.ip ?? ip ?? ""),
      city: data.city as string | undefined,
      region: data.region as string | undefined,
      country: data.country_name as string | undefined,
      countryCode: data.country_code as string | undefined,
      timezone: data.timezone as string | undefined,
      latitude: data.latitude as number | undefined,
      longitude: data.longitude as number | undefined,
      isp: (data.org as string | undefined) ?? (data.asn as string | undefined),
      org: data.org as string | undefined,
      asn: data.asn as string | undefined,
      postal: data.postal as string | undefined,
    }
  } catch {
    return null
  }
}

export async function fetchGeoFromIpApiCom(ip: string): Promise<{
  geo: GeoInfo | null
  isProxy?: boolean
  isHosting?: boolean
}> {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query,proxy,hosting`,
      { cache: "no-store" },
    )
    if (!res.ok) return { geo: null }
    const data = (await res.json()) as {
      status?: string
      query?: string
      city?: string
      regionName?: string
      country?: string
      countryCode?: string
      timezone?: string
      lat?: number
      lon?: number
      isp?: string
      org?: string
      as?: string
      zip?: string
      proxy?: boolean
      hosting?: boolean
    }
    if (data.status !== "success") return { geo: null }
    return {
      geo: {
        ip: String(data.query ?? ip),
        city: data.city,
        region: data.regionName,
        country: data.country,
        countryCode: data.countryCode,
        timezone: data.timezone,
        latitude: data.lat,
        longitude: data.lon,
        isp: data.isp,
        org: data.org,
        asn: data.as,
        postal: data.zip,
      },
      isProxy: data.proxy,
      isHosting: data.hosting,
    }
  } catch {
    return { geo: null }
  }
}

export async function fetchGeo(ip?: string): Promise<{
  geo: GeoInfo | null
  riskInput?: { isProxy?: boolean; isHosting?: boolean }
}> {
  const primary = await fetchIpApiCo(ip)
  if (primary) return { geo: primary }

  if (ip) {
    const fallback = await fetchGeoFromIpApiCom(ip)
    if (fallback.geo) {
      return {
        geo: fallback.geo,
        riskInput: { isProxy: fallback.isProxy, isHosting: fallback.isHosting },
      }
    }
  }
  return { geo: null }
}

export async function fetchWhoisRdap(ip: string): Promise<WhoisInfo | null> {
  try {
    const res = await fetch(`https://rdap.org/ip/${encodeURIComponent(ip)}`, {
      headers: { Accept: "application/rdap+json" },
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    const entities = Array.isArray(data.entities)
      ? (data.entities as Record<string, unknown>[]).map((e) => ({
          name: Array.isArray(e.vcardArray)
            ? String((e.vcardArray as unknown[][])[1]?.[0]?.[3] ?? "")
            : undefined,
          roles: e.roles as string[] | undefined,
          handle: e.handle as string | undefined,
        }))
      : []

    return {
      ip,
      name: data.name as string | undefined,
      handle: data.handle as string | undefined,
      country: data.country as string | undefined,
      startAddress: data.startAddress as string | undefined,
      endAddress: data.endAddress as string | undefined,
      type: data.type as string | undefined,
      status: data.status as string[] | undefined,
      entities,
    }
  } catch {
    return null
  }
}

export async function collectMyIpSources(): Promise<{
  sources: IpSourceResult[]
  cloudflareTrace?: Record<string, string>
}> {
  const [ipifyV4, ipifyV6, cf] = await Promise.all([
    fetchIpify("v4"),
    fetchIpify("v6"),
    fetchCloudflareTrace(),
  ])
  return {
    sources: [ipifyV4, ipifyV6, cf.source],
    cloudflareTrace: cf.trace,
  }
}

export function consensusIp(sources: IpSourceResult[]): {
  ipv4?: string
  ipv6?: string
} {
  const v4Counts = new Map<string, number>()
  const v6Counts = new Map<string, number>()

  for (const s of sources) {
    if (s.ipv4) v4Counts.set(s.ipv4, (v4Counts.get(s.ipv4) ?? 0) + 1)
    if (s.ipv6 && s.ipv6.includes(":")) {
      v6Counts.set(s.ipv6, (v6Counts.get(s.ipv6) ?? 0) + 1)
    }
  }

  const top = (map: Map<string, number>) =>
    [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  return { ipv4: top(v4Counts), ipv6: top(v6Counts) }
}

export function buildRiskFromGeo(
  geo: GeoInfo | null,
  extra?: { isProxy?: boolean; isHosting?: boolean },
) {
  if (!geo) return assessRisk({})
  return assessRisk({
    org: geo.org,
    isp: geo.isp,
    asn: geo.asn,
    isProxy: extra?.isProxy,
    isHosting: extra?.isHosting,
  })
}
