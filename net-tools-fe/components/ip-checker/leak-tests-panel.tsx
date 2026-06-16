"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Eye,
  Radio,
  Fingerprint,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InfoGrid } from "./info-grid"
import { cn } from "@/lib/utils"

interface WebRtcResult {
  localIps: string[]
  publicCandidates: string[]
  leaked: boolean
}

interface DnsLeakResult {
  resolverHints: string[]
  dohGoogle?: string
  dohCloudflare?: string
  possibleLeak: boolean
}

function extractIpsFromSdp(sdp: string): string[] {
  const ips = new Set<string>()
  const lines = sdp.split("\n")
  for (const line of lines) {
    const match = line.match(/(?:candidate:.+? (\d+\.\d+\.\d+\.\d+) \d+|c=IN IP4 (\d+\.\d+\.\d+\.\d+))/)
    if (match) {
      const ip = match[1] ?? match[2]
      if (ip && !ip.startsWith("0.") && ip !== "127.0.0.1") ips.add(ip)
    }
  }
  return [...ips]
}

async function detectWebRtcLeak(): Promise<WebRtcResult> {
  const localIps = new Set<string>()
  const publicCandidates = new Set<string>()

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  })

  pc.createDataChannel("leak-test")
  const offer = await pc.createOffer({ offerToReceiveAudio: true })
  await pc.setLocalDescription(offer)

  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 3000)
    pc.onicecandidate = (e) => {
      if (!e.candidate) {
        clearTimeout(timer)
        resolve()
        return
      }
      const cand = e.candidate.candidate
      const m = cand.match(/(\d+\.\d+\.\d+\.\d+)/)
      if (m) {
        const ip = m[1]
        if (ip.startsWith("192.168.") || ip.startsWith("10.") || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) {
          localIps.add(ip)
        } else if (!ip.startsWith("0.")) {
          publicCandidates.add(ip)
        }
      }
    }
  })

  if (pc.localDescription?.sdp) {
    for (const ip of extractIpsFromSdp(pc.localDescription.sdp)) {
      if (ip.startsWith("192.168.") || ip.startsWith("10.")) localIps.add(ip)
      else publicCandidates.add(ip)
    }
  }

  pc.close()

  const local = [...localIps]
  const pub = [...publicCandidates]
  return {
    localIps: local,
    publicCandidates: pub,
    leaked: local.length > 0,
  }
}

async function detectDnsLeak(): Promise<DnsLeakResult> {
  const resolverHints: string[] = []
  let dohGoogle: string | undefined
  let dohCloudflare: string | undefined

  try {
    const gRes = await fetch(
      "https://dns.google/resolve?name=whoami.akamai.net&type=TXT",
      { cache: "no-store" },
    )
    const gData = (await gRes.json()) as { Answer?: { data?: string }[] }
    dohGoogle = gData.Answer?.[0]?.data?.replace(/"/g, "")
    if (dohGoogle) resolverHints.push(`Google DoH: ${dohGoogle}`)
  } catch {
    resolverHints.push("Google DoH: unavailable")
  }

  try {
    const cfRes = await fetch(
      "https://cloudflare-dns.com/dns-query?name=whoami.cloudflare&type=TXT",
      { headers: { Accept: "application/dns-json" }, cache: "no-store" },
    )
    const cfData = (await cfRes.json()) as { Answer?: { data?: string }[] }
    dohCloudflare = cfData.Answer?.[0]?.data?.replace(/"/g, "")
    if (dohCloudflare) resolverHints.push(`Cloudflare DoH: ${dohCloudflare}`)
  } catch {
    resolverHints.push("Cloudflare DoH: unavailable")
  }

  const possibleLeak =
    !!dohGoogle &&
    !!dohCloudflare &&
    dohGoogle !== dohCloudflare

  return { resolverHints, dohGoogle, dohCloudflare, possibleLeak }
}

function collectFingerprint() {
  const nav = navigator
  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    language: nav.language,
    languages: nav.languages?.join(", "),
    hardwareConcurrency: String(nav.hardwareConcurrency ?? "—"),
    deviceMemory: "deviceMemory" in nav ? String((nav as Navigator & { deviceMemory?: number }).deviceMemory) : "—",
    cookieEnabled: String(nav.cookieEnabled),
    doNotTrack: nav.doNotTrack ?? "—",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: `${screen.width}x${screen.height} @${screen.colorDepth}bit`,
    touchPoints: String(nav.maxTouchPoints ?? 0),
  }
}

export function LeakTestsPanel() {
  const [webrtc, setWebrtc] = useState<WebRtcResult | null>(null)
  const [dns, setDns] = useState<DnsLeakResult | null>(null)
  const [fingerprint, setFingerprint] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(false)

  const runTests = useCallback(async () => {
    setLoading(true)
    setFingerprint(collectFingerprint())
    const [w, d] = await Promise.all([detectWebRtcLeak(), detectDnsLeak()])
    setWebrtc(w)
    setDns(d)
    setLoading(false)
  }, [])

  useEffect(() => {
    runTests()
  }, [runTests])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Leak Tests & Fingerprint</h2>
          <p className="text-sm text-muted-foreground">
            WebRTC local IP exposure, DNS resolver hints, browser fingerprint
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={runTests} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Re-run</span>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="h-4 w-4" />
              WebRTC Leak
            </CardTitle>
            <CardDescription>STUN candidate local IP exposure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {webrtc ? (
              <>
                <div className="flex items-center gap-2">
                  {webrtc.leaked ? (
                    <Badge variant="destructive">Possible leak</Badge>
                  ) : (
                    <Badge>No local IP leaked</Badge>
                  )}
                  {webrtc.leaked ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  )}
                </div>
                <InfoGrid
                  items={[
                    { label: "Local / private IPs", value: webrtc.localIps.join(", ") || "None detected" },
                    { label: "Public candidates", value: webrtc.publicCandidates.join(", ") || "None" },
                  ]}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{loading ? "Testing…" : "—"}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4" />
              DNS Leak Hints
            </CardTitle>
            <CardDescription>DoH resolver comparison (browser-side)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dns ? (
              <>
                <div className="flex items-center gap-2">
                  {dns.possibleLeak ? (
                    <>
                      <Badge variant="secondary">Resolver mismatch</Badge>
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    </>
                  ) : (
                    <>
                      <Badge>Consistent</Badge>
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </>
                  )}
                </div>
                <ul className="space-y-1 text-sm">
                  {dns.resolverHints.map((h) => (
                    <li key={h} className="text-muted-foreground">{h}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{loading ? "Testing…" : "—"}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Fingerprint className="h-4 w-4" />
            Browser Fingerprint
          </CardTitle>
          <CardDescription>Client-visible attributes (privacy review)</CardDescription>
        </CardHeader>
        <CardContent>
          {fingerprint ? (
            <InfoGrid
              items={Object.entries(fingerprint).map(([label, value]) => ({
                label,
                value,
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Collecting…</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
