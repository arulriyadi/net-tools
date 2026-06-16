"use client"

import { useState } from "react"
import { ShieldAlert, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { BlacklistResult } from "@/lib/ip-checker/types"
import { cn } from "@/lib/utils"

export function BlacklistPanel({ defaultIp }: { defaultIp?: string }) {
  const [ip, setIp] = useState(defaultIp ?? "")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<BlacklistResult[]>([])
  const [reputation, setReputation] = useState<{ score: number; listedCount: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function check() {
    if (!ip.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ip-checker/blacklist?ip=${encodeURIComponent(ip.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Check failed")
      setResults(data.results)
      setReputation(data.reputation)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Blacklist & Reputation</h2>
        <p className="text-sm text-muted-foreground">
          DNSBL spam blacklist checks across major databases
        </p>
      </div>

      <div className="flex gap-2 max-w-md">
        <Input
          placeholder="IP address to check"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
        />
        <Button onClick={check} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className="ml-2">Check</span>
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {reputation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4" />
              Reputation Score
            </CardTitle>
            <CardDescription>
              {reputation.listedCount} list{reputation.listedCount !== 1 ? "s" : ""} triggered
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Score</span>
              <span className={cn(
                "font-semibold",
                reputation.score >= 80 ? "text-success" : reputation.score >= 50 ? "text-warning" : "text-destructive",
              )}>
                {reputation.score}/100
              </span>
            </div>
            <Progress value={reputation.score} className="h-2" />
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">DNSBL Results</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4">List</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Response</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.list} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium">{r.list}</td>
                    <td className="py-2 pr-4">
                      {r.listed ? (
                        <Badge variant="destructive">Listed</Badge>
                      ) : (
                        <Badge variant="outline">Clean</Badge>
                      )}
                    </td>
                    <td className="py-2 text-muted-foreground font-mono text-xs">{r.response ?? "—"}</td>
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
