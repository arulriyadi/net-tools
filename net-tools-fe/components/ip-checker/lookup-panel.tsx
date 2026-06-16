"use client"

import { useState } from "react"
import { Search, Loader2, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InfoGrid } from "./info-grid"
import type { IpLookupResponse } from "@/lib/ip-checker/types"

interface BulkResult {
  ip: string
  error?: string
  geo?: IpLookupResponse["geo"]
  risk?: IpLookupResponse["risk"]
}

export function LookupPanel() {
  const [ip, setIp] = useState("")
  const [bulk, setBulk] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<IpLookupResponse | null>(null)
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([])
  const [error, setError] = useState<string | null>(null)

  async function lookupSingle() {
    if (!ip.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ip-checker/lookup?ip=${encodeURIComponent(ip.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Lookup failed")
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed")
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  async function lookupBulk() {
    const ips = bulk
      .split(/[\n,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (!ips.length) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/ip-checker/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ips }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Bulk lookup failed")
      setBulkResults(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk lookup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">IP Lookup & WHOIS</h2>
        <p className="text-sm text-muted-foreground">
          Manual lookup, bulk check, and RDAP WHOIS information
        </p>
      </div>

      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single">Single Lookup</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Lookup</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 8.8.8.8 or 2001:4860:4860::8888"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookupSingle()}
            />
            <Button onClick={lookupSingle} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Lookup</span>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4 mt-4">
          <Textarea
            placeholder="One IP per line (max 20)"
            rows={5}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
          />
          <Button onClick={lookupBulk} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <List className="h-4 w-4" />}
            <span className="ml-2">Bulk Lookup</span>
          </Button>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Geolocation — {result.ip}</CardTitle>
              {result.risk && (
                <Badge variant={result.risk.level === "high" ? "destructive" : "secondary"}>
                  Risk {result.risk.score}/100
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {result.geo ? (
                <InfoGrid
                  items={[
                    { label: "Country", value: result.geo.country },
                    { label: "City", value: result.geo.city },
                    { label: "Region", value: result.geo.region },
                    { label: "Timezone", value: result.geo.timezone },
                    { label: "ISP", value: result.geo.isp },
                    { label: "ASN", value: result.geo.asn },
                  ]}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No geolocation data</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">WHOIS (RDAP)</CardTitle>
              <CardDescription>Registration network block</CardDescription>
            </CardHeader>
            <CardContent>
              {result.whois ? (
                <InfoGrid
                  items={[
                    { label: "Network", value: result.whois.name },
                    { label: "Handle", value: result.whois.handle },
                    { label: "Range", value: result.whois.startAddress && result.whois.endAddress ? `${result.whois.startAddress} – ${result.whois.endAddress}` : undefined },
                    { label: "Country", value: result.whois.country },
                    { label: "Type", value: result.whois.type },
                    { label: "Status", value: result.whois.status?.join(", ") },
                    { label: "Entity", value: result.whois.entities?.[0]?.name },
                  ]}
                />
              ) : (
                <p className="text-sm text-muted-foreground">WHOIS unavailable</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {bulkResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bulk Results</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4">IP</th>
                  <th className="pb-2 pr-4">Country</th>
                  <th className="pb-2 pr-4">City</th>
                  <th className="pb-2 pr-4">ISP</th>
                  <th className="pb-2">Risk</th>
                </tr>
              </thead>
              <tbody>
                {bulkResults.map((r) => (
                  <tr key={r.ip} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono">{r.ip}</td>
                    <td className="py-2 pr-4">{r.error ? r.error : r.geo?.country ?? "—"}</td>
                    <td className="py-2 pr-4">{r.geo?.city ?? "—"}</td>
                    <td className="py-2 pr-4">{r.geo?.isp ?? "—"}</td>
                    <td className="py-2">{r.risk ? `${r.risk.score}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
