import type { BlacklistResult } from "./types"
import { reverseIpForDnsbl } from "./utils"

const DNSBL_LISTS = [
  { list: "Spamhaus ZEN", zone: "zen.spamhaus.org" },
  { list: "Spamhaus SBL", zone: "bl.spamhaus.org" },
  { list: "SORBS", zone: "dnsbl.sorbs.net" },
  { list: "Barracuda", zone: "b.barracudacentral.org" },
  { list: "UCEPROTECT L1", zone: "dnsbl-1.uceprotect.net" },
  { list: "SpamCop", zone: "bl.spamcop.net" },
]

async function queryDnsbl(
  reversed: string,
  zone: string,
): Promise<{ listed: boolean; response?: string }> {
  const qname = `${reversed}.${zone}`
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(qname)}&type=A`
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/dns-json" },
      cache: "no-store",
    })
    if (!res.ok) return { listed: false, response: `HTTP ${res.status}` }
    const data = (await res.json()) as {
      Status?: number
      Answer?: { data?: string }[]
    }
    if (data.Status !== 0 || !data.Answer?.length) {
      return { listed: false, response: "not listed" }
    }
    const answer = data.Answer[0]?.data ?? ""
    // Most DNSBLs return 127.0.0.x when listed
    const listed = answer.startsWith("127.0.0.")
    return { listed, response: answer }
  } catch (err) {
    return {
      listed: false,
      response: err instanceof Error ? err.message : "query failed",
    }
  }
}

export async function checkBlacklists(ip: string): Promise<BlacklistResult[]> {
  const reversed = reverseIpForDnsbl(ip)
  if (!reversed) {
    return DNSBL_LISTS.map(({ list }) => ({
      list,
      listed: false,
      response: "IPv6/WHOIS blacklist check not supported yet",
    }))
  }

  const results = await Promise.all(
    DNSBL_LISTS.map(async ({ list, zone }) => {
      const r = await queryDnsbl(reversed, zone)
      return { list, listed: r.listed, response: r.response }
    }),
  )
  return results
}

export function reputationScore(results: BlacklistResult[]): {
  score: number
  listedCount: number
} {
  const listedCount = results.filter((r) => r.listed).length
  const score = Math.max(0, 100 - listedCount * 18)
  return { score, listedCount }
}
