import type { RiskAssessment } from "./types"

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?!$)|$)){4}$/
const IPV6_RE =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?\d)?\d)\.){3}(25[0-5]|(2[0-4]|1?\d)?\d)|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?\d)?\d)\.){3}(25[0-5]|(2[0-4]|1?\d)?\d))$/

export function isValidIp(ip: string): boolean {
  const trimmed = ip.trim()
  return IPV4_RE.test(trimmed) || IPV6_RE.test(trimmed)
}

export function parseCloudflareTrace(text: string): Record<string, string> {
  return Object.fromEntries(
    text
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf("=")
        if (idx === -1) return [line, ""]
        return [line.slice(0, idx), line.slice(idx + 1)]
      }),
  )
}

const DATACENTER_KEYWORDS = [
  "hosting",
  "host",
  "cloud",
  "data center",
  "datacenter",
  "amazon",
  "google",
  "microsoft",
  "digitalocean",
  "linode",
  "ovh",
  "hetzner",
  "vultr",
  "alibaba",
  "tencent",
  "oracle",
  "cdn",
  "proxy",
  "vpn",
  "colocation",
  "colo",
]

export function assessRisk(input: {
  org?: string
  isp?: string
  asn?: string
  isProxy?: boolean
  isHosting?: boolean
}): RiskAssessment {
  const flags: string[] = []
  let score = 10

  const haystack = `${input.org ?? ""} ${input.isp ?? ""} ${input.asn ?? ""}`.toLowerCase()

  if (input.isProxy) {
    flags.push("Proxy/VPN detected")
    score += 35
  }
  if (input.isHosting) {
    flags.push("Datacenter/hosting network")
    score += 25
  }

  for (const keyword of DATACENTER_KEYWORDS) {
    if (haystack.includes(keyword)) {
      flags.push(`Organization matches "${keyword}"`)
      score += 8
      break
    }
  }

  if (input.asn?.toLowerCase().includes("asn")) {
    // noop marker
  }

  score = Math.min(100, Math.max(0, score))

  let level: RiskAssessment["level"] = "low"
  if (score >= 60) level = "high"
  else if (score >= 30) level = "medium"

  if (flags.length === 0) flags.push("No obvious proxy/VPN/datacenter signals")

  return { score, level, flags: [...new Set(flags)] }
}

export function reverseIpForDnsbl(ip: string): string | null {
  if (!IPV4_RE.test(ip)) return null
  return ip.split(".").reverse().join(".")
}
