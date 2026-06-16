"use client"

import { useCallback, useEffect, useState } from "react"
import { Activity, Globe, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ConnectivityTarget } from "@/lib/ip-checker/types"
import { cn } from "@/lib/utils"

const CLIENT_TARGETS = [
  { name: "Google", region: "Global", url: "https://www.google.com/generate_204" },
  { name: "Cloudflare", region: "Global", url: "https://cloudflare.com/cdn-cgi/trace" },
  { name: "GitHub", region: "Global", url: "https://github.com/favicon.ico" },
  { name: "Baidu", region: "China", url: "https://www.baidu.com/favicon.ico" },
]

async function clientProbe(
  target: (typeof CLIENT_TARGETS)[number],
): Promise<ConnectivityTarget & { source: "client" }> {
  const start = performance.now()
  try {
    const res = await fetch(target.url, { method: "GET", mode: "no-cors", cache: "no-store" })
    const latencyMs = Math.round(performance.now() - start)
    return {
      ...target,
      source: "client",
      status: "ok",
      latencyMs,
      httpStatus: res.status || 0,
    }
  } catch (err) {
    return {
      ...target,
      source: "client",
      status: "fail",
      latencyMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : "Failed",
    }
  }
}

function statusBadge(status: ConnectivityTarget["status"]) {
  if (status === "ok") return <Badge className="bg-success/15 text-success border-success/30">OK</Badge>
  if (status === "blocked") return <Badge variant="destructive">Blocked</Badge>
  if (status === "fail") return <Badge variant="secondary">Fail</Badge>
  return <Badge variant="outline">Pending</Badge>
}

export function ConnectivityPanel() {
  const [serverResults, setServerResults] = useState<ConnectivityTarget[]>([])
  const [clientResults, setClientResults] = useState<(ConnectivityTarget & { source: "client" })[]>([])
  const [loading, setLoading] = useState(true)

  const run = useCallback(async () => {
    setLoading(true)
    const [serverRes, client] = await Promise.all([
      fetch("/api/ip-checker/connectivity", { cache: "no-store" }).then(async (r) => {
        if (!r.ok) return []
        const data = await r.json()
        return data.results as ConnectivityTarget[]
      }),
      Promise.all(CLIENT_TARGETS.map(clientProbe)),
    ])
    setServerResults(serverRes)
    setClientResults(client)
    setLoading(false)
  }, [])

  useEffect(() => {
    run()
  }, [run])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Connectivity Tests</h2>
          <p className="text-sm text-muted-foreground">
            Latency to major services — server-side (VM) and browser-side
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Re-test</span>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Server-side (my-ubuntu)
            </CardTitle>
            <CardDescription>Probed from NetTools backend VM</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-3">Service</th>
                  <th className="pb-2 pr-3">Region</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2">Latency</th>
                </tr>
              </thead>
              <tbody>
                {serverResults.map((r) => (
                  <tr key={r.name} className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium">{r.name}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.region}</td>
                    <td className="py-2 pr-3">{statusBadge(r.status)}</td>
                    <td className={cn("py-2", r.latencyMs != null && r.latencyMs > 500 && "text-warning")}>
                      {r.latencyMs != null ? `${r.latencyMs} ms` : r.error ?? "—"}
                    </td>
                  </tr>
                ))}
                {!serverResults.length && !loading && (
                  <tr><td colSpan={4} className="py-4 text-muted-foreground">No data</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" />
              Browser-side (your network)
            </CardTitle>
            <CardDescription>Includes China reachability probe (Baidu)</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-3">Service</th>
                  <th className="pb-2 pr-3">Region</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2">Latency</th>
                </tr>
              </thead>
              <tbody>
                {clientResults.map((r) => (
                  <tr key={r.name} className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium">{r.name}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.region}</td>
                    <td className="py-2 pr-3">{statusBadge(r.status)}</td>
                    <td className="py-2">{r.latencyMs != null ? `${r.latencyMs} ms` : "—"}</td>
                  </tr>
                ))}
                {!clientResults.length && loading && (
                  <tr><td colSpan={4} className="py-4 text-muted-foreground">Testing…</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
