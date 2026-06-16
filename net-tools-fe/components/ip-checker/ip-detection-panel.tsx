"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Globe,
  MapPin,
  RefreshCw,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { InfoGrid } from "./info-grid"
import type { MyIpResponse } from "@/lib/ip-checker/types"
import { cn } from "@/lib/utils"

function riskBadge(level?: string) {
  if (level === "high") return "destructive"
  if (level === "medium") return "secondary"
  return "default"
}

export function IpDetectionPanel() {
  const [data, setData] = useState<MyIpResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/ip-checker/my-ip", { cache: "no-store" })
      if (!res.ok) throw new Error(await res.text())
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const geo = data?.geo

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">IP Detection & Geolocation</h2>
          <p className="text-sm text-muted-foreground">
            Multi-source IPv4/IPv6 detection with ISP, ASN, and location
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-primary" />
              Your IP
            </CardTitle>
            <CardDescription>Consensus from multiple sources</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">IPv4</p>
              <p className="font-mono text-lg font-semibold">
                {loading ? "…" : data?.consensusIpv4 ?? "Not detected"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">IPv6</p>
              <p className="font-mono text-sm break-all">
                {loading ? "…" : data?.consensusIpv6 ?? "Not detected"}
              </p>
            </div>
            {data?.risk && (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Risk score</span>
                <Badge variant={riskBadge(data.risk.level)}>
                  {data.risk.score}/100 · {data.risk.level}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary" />
              Geolocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {geo ? (
              <InfoGrid
                items={[
                  { label: "Country", value: geo.country ? `${geo.country} (${geo.countryCode})` : geo.countryCode },
                  { label: "Region", value: geo.region },
                  { label: "City", value: geo.city },
                  { label: "Timezone", value: geo.timezone },
                  { label: "Coordinates", value: geo.latitude != null ? `${geo.latitude}, ${geo.longitude}` : undefined },
                  { label: "ISP / Org", value: geo.isp ?? geo.org },
                  { label: "ASN", value: geo.asn },
                  { label: "Postal", value: geo.postal },
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {loading ? "Loading geolocation…" : "Geolocation unavailable"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {geo?.latitude != null && geo.longitude != null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mini Map</CardTitle>
          </CardHeader>
          <CardContent>
            <iframe
              title="Location map"
              className="h-64 w-full rounded-lg border border-border"
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${geo.longitude - 0.05}%2C${geo.latitude - 0.03}%2C${geo.longitude + 0.05}%2C${geo.latitude + 0.03}&layer=mapnik&marker=${geo.latitude}%2C${geo.longitude}`}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Source Comparison</CardTitle>
          <CardDescription>ipify, Cloudflare trace, and consensus</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Source</th>
                <th className="pb-2 pr-4 font-medium">IPv4</th>
                <th className="pb-2 pr-4 font-medium">IPv6</th>
                <th className="pb-2 font-medium">Latency</th>
              </tr>
            </thead>
            <tbody>
              {data?.sources.map((s) => (
                <tr key={s.source} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium">{s.source}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{s.ipv4 ?? (s.error ? "—" : "—")}</td>
                  <td className="py-2 pr-4 font-mono text-xs break-all">{s.ipv6 ?? "—"}</td>
                  <td className="py-2 text-muted-foreground">
                    {s.latencyMs != null ? `${s.latencyMs} ms` : s.error ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {data?.risk && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.risk.flags.map((flag) => (
                <li key={flag} className="flex items-start gap-2 text-sm">
                  {data.risk!.level === "low" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-success shrink-0" />
                  ) : (
                    <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", data.risk!.level === "high" ? "text-destructive" : "text-warning")} />
                  )}
                  {flag}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
