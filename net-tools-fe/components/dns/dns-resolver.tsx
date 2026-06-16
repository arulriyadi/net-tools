"use client"

import { useState } from "react"
import {
  Search,
  Globe,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Server,
  Shield,
  Zap,
} from "lucide-react"

interface DnsQuery {
  id: string
  domain: string
  type: string
  result: string
  responseTime: number
  status: "success" | "error" | "timeout"
  timestamp: string
  server: string
}

const mockQueries: DnsQuery[] = [
  {
    id: "1",
    domain: "google.com",
    type: "A",
    result: "142.250.185.78",
    responseTime: 12,
    status: "success",
    timestamp: "2024-01-16 14:30:45",
    server: "8.8.8.8",
  },
  {
    id: "2",
    domain: "github.com",
    type: "A",
    result: "140.82.121.3",
    responseTime: 18,
    status: "success",
    timestamp: "2024-01-16 14:30:30",
    server: "8.8.8.8",
  },
  {
    id: "3",
    domain: "invalid-domain.xyz",
    type: "A",
    result: "NXDOMAIN",
    responseTime: 45,
    status: "error",
    timestamp: "2024-01-16 14:30:15",
    server: "1.1.1.1",
  },
  {
    id: "4",
    domain: "cloudflare.com",
    type: "MX",
    result: "mx1.cloudflare.com (10)",
    responseTime: 25,
    status: "success",
    timestamp: "2024-01-16 14:30:00",
    server: "1.1.1.1",
  },
  {
    id: "5",
    domain: "slow-server.test",
    type: "A",
    result: "Timeout",
    responseTime: 5000,
    status: "timeout",
    timestamp: "2024-01-16 14:29:45",
    server: "8.8.4.4",
  },
]

const dnsServers = [
  { name: "Google DNS", ip: "8.8.8.8", secondary: "8.8.4.4" },
  { name: "Cloudflare", ip: "1.1.1.1", secondary: "1.0.0.1" },
  { name: "OpenDNS", ip: "208.67.222.222", secondary: "208.67.220.220" },
  { name: "Quad9", ip: "9.9.9.9", secondary: "149.112.112.112" },
]

export function DnsResolver() {
  const [queries, setQueries] = useState<DnsQuery[]>(mockQueries)
  const [domain, setDomain] = useState("")
  const [queryType, setQueryType] = useState("A")
  const [selectedServer, setSelectedServer] = useState("8.8.8.8")
  const [isResolving, setIsResolving] = useState(false)

  const handleResolve = () => {
    if (!domain.trim()) return

    setIsResolving(true)

    // Simulate DNS resolution
    setTimeout(() => {
      const newQuery: DnsQuery = {
        id: Date.now().toString(),
        domain: domain.trim(),
        type: queryType,
        result: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        responseTime: Math.floor(Math.random() * 50) + 5,
        status: Math.random() > 0.1 ? "success" : "error",
        timestamp: new Date().toLocaleString(),
        server: selectedServer,
      }

      setQueries([newQuery, ...queries])
      setIsResolving(false)
      setDomain("")
    }, 500 + Math.random() * 1000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "timeout":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getResponseTimeColor = (ms: number) => {
    if (ms < 30) return "text-green-500"
    if (ms < 100) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">DNS Resolver</h1>
        <p className="text-sm text-muted-foreground">
          Query DNS records and test DNS resolution
        </p>
      </div>

      {/* Query Form */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">DNS Lookup</h2>
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-2">
              Domain Name
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResolve()}
                className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="w-full lg:w-40">
            <label className="block text-sm font-medium text-foreground mb-2">
              Record Type
            </label>
            <select
              value={queryType}
              onChange={(e) => setQueryType(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="A">A</option>
              <option value="AAAA">AAAA</option>
              <option value="CNAME">CNAME</option>
              <option value="MX">MX</option>
              <option value="TXT">TXT</option>
              <option value="NS">NS</option>
              <option value="SOA">SOA</option>
              <option value="PTR">PTR</option>
            </select>
          </div>
          <div className="w-full lg:w-48">
            <label className="block text-sm font-medium text-foreground mb-2">
              DNS Server
            </label>
            <select
              value={selectedServer}
              onChange={(e) => setSelectedServer(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {dnsServers.map((server) => (
                <option key={server.ip} value={server.ip}>
                  {server.name} ({server.ip})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleResolve}
              disabled={isResolving || !domain.trim()}
              className="h-10 inline-flex items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isResolving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Resolve
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-blue-500/10 p-2">
              <Search className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{queries.length}</p>
              <p className="text-sm text-muted-foreground">Total Queries</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-green-500/10 p-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {queries.filter((q) => q.status === "success").length}
              </p>
              <p className="text-sm text-muted-foreground">Successful</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-yellow-500/10 p-2">
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {queries.length > 0
                  ? Math.round(
                      queries.reduce((acc, q) => acc + q.responseTime, 0) / queries.length
                    )
                  : 0}
                ms
              </p>
              <p className="text-sm text-muted-foreground">Avg Response</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-red-500/10 p-2">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {queries.filter((q) => q.status !== "success").length}
              </p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </div>
        </div>
      </div>

      {/* DNS Servers Info */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">Available DNS Servers</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dnsServers.map((server) => (
            <div
              key={server.ip}
              className={`rounded-md border p-3 transition-colors ${
                selectedServer === server.ip
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Server className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">{server.name}</span>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Primary: <span className="font-mono">{server.ip}</span></p>
                <p>Secondary: <span className="font-mono">{server.secondary}</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Query History */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Query History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Domain
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Result
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Response Time
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Server
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody>
              {queries.map((query) => (
                <tr
                  key={query.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    {getStatusIcon(query.status)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-foreground">
                      {query.domain}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                      {query.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-muted-foreground">
                      {query.result}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${getResponseTimeColor(query.responseTime)}`}>
                      {query.responseTime}ms
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-muted-foreground">
                      {query.server}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {query.timestamp}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {queries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mb-4 opacity-50" />
            <p>No queries yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
