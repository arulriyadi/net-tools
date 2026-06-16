"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Globe,
  Database,
  FileText,
  RefreshCw,
  Download,
  ChevronLeft,
  Loader2,
  CircleDot,
  RotateCcw,
  Search,
  Activity,
  Shield,
  Zap,
} from "lucide-react"
import { fetchDnsDeviceDetail, syncDnsDevice } from "@/lib/dns/dns-api"
import type { DnsRecord, DnsTab, DnsZone } from "@/lib/dns/dns-types"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/format"
import {
  DataSourceBadge,
  MockDataBadge,
  RecordTypeBadge,
  StatusDot,
  ZoneStatusBadge,
  ZoneTypeBadge,
} from "@/components/dns/dns-ui"

const TABLE_SCROLL_CLASS =
  "max-w-full max-h-[min(680px,calc(100vh-18rem))] overflow-x-auto overflow-y-auto overscroll-x-contain overscroll-y-contain [-webkit-overflow-scrolling:touch]"

interface DnsDeviceDetailProps {
  deviceId: string
  initialTab?: string
}

function parseTab(value?: string): DnsTab {
  if (value === "records" || value === "resolver") return value
  return "zones"
}

export function DnsDeviceDetail({ deviceId, initialTab }: DnsDeviceDetailProps) {
  const [tab, setTab] = useState<DnsTab>(() => parseTab(initialTab))
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [device, setDevice] = useState<Awaited<ReturnType<typeof fetchDnsDeviceDetail>>["device"] | null>(null)
  const [zones, setZones] = useState<DnsZone[]>([])
  const [records, setRecords] = useState<DnsRecord[]>([])
  const [resolverStats, setResolverStats] = useState<
    Awaited<ReturnType<typeof fetchDnsDeviceDetail>>["resolverStats"] | null
  >(null)

  const loadDetail = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = await fetchDnsDeviceDetail(deviceId)
      setDevice(payload.device)
      setZones(payload.zones)
      setRecords(payload.records)
      setResolverStats(payload.resolverStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load DNS device")
      setDevice(null)
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  useEffect(() => {
    setTab(parseTab(initialTab))
  }, [initialTab])

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      const payload = await syncDnsDevice(deviceId)
      setDevice(payload.device)
      setZones(payload.zones)
      setRecords(payload.records)
      setResolverStats(payload.resolverStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  const tabItems = useMemo(
    () => [
      { id: "zones" as const, label: "DNS Zones", icon: Database, count: zones.length },
      { id: "records" as const, label: "DNS Records", icon: FileText, count: records.length },
      { id: "resolver" as const, label: "DNS Resolver", icon: RefreshCw, count: resolverStats?.recentQueries.length ?? 0 },
    ],
    [zones.length, records.length, resolverStats?.recentQueries.length],
  )

  const q = query.trim().toLowerCase()

  const filteredZones = useMemo(
    () =>
      zones.filter((z) =>
        !q
          ? true
          : [z.name, z.type, z.status, z.primaryNs, z.comment, z.dnssecStatus].join(" ").toLowerCase().includes(q),
      ),
    [zones, q],
  )

  const filteredRecords = useMemo(
    () =>
      records.filter((r) =>
        !q
          ? true
          : [r.name, r.type, r.value, r.zone, r.status].join(" ").toLowerCase().includes(q),
      ),
    [records, q],
  )

  const selectTab = (next: DnsTab) => {
    setTab(next)
    setQuery("")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading DNS device…
      </div>
    )
  }

  if (!device) {
    return (
      <div className="space-y-4">
        <Link
          href="/dns"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to DNS Devices
        </Link>
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-destructive">{error ?? "DNS device not found."}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/dns"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            DNS Devices
          </Link>
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
              <Globe className="h-6 w-6 text-primary" />
              {device.name}
              <MockDataBadge />
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {device.hostname} · {device.vendor} {device.product} {device.version} · {device.ip}
              {device.site !== "—" && (
                <>
                  {" · "}
                  <span className="font-medium text-foreground">{device.site}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={syncing ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Sync
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground opacity-50 cursor-not-allowed"
            disabled
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <StatusDot status={device.status} />
              <DataSourceBadge src={device.dataSource} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Roles: <span className="font-medium text-foreground capitalize">{device.roles.join(", ")}</span>
              {" · "}
              Last sync: <span className="font-medium text-foreground">{device.lastSync}</span>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-border bg-background p-3">
            <div className="text-xs font-medium text-muted-foreground">Device configuration</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/resource-pool/device-inventory"
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
              >
                Device Inventory
              </Link>
              <Link
                href="/resource-pool/data-connectors"
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
              >
                Data Connectors
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Dataset Categories</h2>
            <p className="text-xs text-muted-foreground">Technitium DNS datasets</p>
          </div>
          <ul className="divide-y divide-border p-1">
            {tabItems.map((item) => {
              const active = tab === item.id
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => selectTab(item.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm transition-colors",
                      active
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <span
                      className={cn(
                        "rounded bg-muted-foreground/10 px-1.5 py-0.5 text-[11px] tabular-nums",
                        active && "bg-primary/15 text-primary",
                      )}
                    >
                      {item.count}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">{tabItems.find((item) => item.id === tab)?.label}</h2>
            {tab !== "resolver" && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter current list…"
                    className="h-9 w-56 rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-2 text-xs font-medium hover:bg-accent"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            )}
          </div>

          <div className={TABLE_SCROLL_CLASS}>
            {tab === "zones" && (
              <table className="w-full table-fixed text-sm">
                <thead className="sticky top-0 z-10 bg-muted/40 text-xs uppercase text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <th className="w-12 px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Zone</th>
                    <th className="w-[12%] px-3 py-2 text-left font-medium">Type</th>
                    <th className="w-[10%] px-3 py-2 text-left font-medium">Status</th>
                    <th className="w-[10%] px-3 py-2 text-left font-medium">Records</th>
                    <th className="w-[14%] px-3 py-2 text-left font-medium">Serial</th>
                    <th className="w-[16%] px-3 py-2 text-left font-medium">Primary NS</th>
                    <th className="px-3 py-2 text-left font-medium">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredZones.map((z, i) => (
                    <tr key={z.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{z.name}</td>
                      <td className="px-3 py-2">
                        <ZoneTypeBadge type={z.type} />
                      </td>
                      <td className="px-3 py-2">
                        <ZoneStatusBadge status={z.status} />
                      </td>
                      <td className="px-3 py-2 tabular-nums">{z.recordCount}</td>
                      <td className="px-3 py-2 font-mono text-xs tabular-nums">{z.serial || "—"}</td>
                      <td className="px-3 py-2 text-xs break-all">{z.primaryNs || "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground break-words">{z.comment || "—"}</td>
                    </tr>
                  ))}
                  {filteredZones.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">
                        <CircleDot className="mx-auto mb-2 h-5 w-5 opacity-40" />
                        No zones match your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === "records" && (
              <table className="w-full table-fixed text-sm">
                <thead className="sticky top-0 z-10 bg-muted/40 text-xs uppercase text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <th className="w-12 px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="w-[10%] px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Value</th>
                    <th className="w-[14%] px-3 py-2 text-left font-medium">Zone</th>
                    <th className="w-[8%] px-3 py-2 text-left font-medium">TTL</th>
                    <th className="w-[12%] px-3 py-2 text-left font-medium">Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r, i) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-t border-border hover:bg-muted/30",
                        r.status === "error" && "border-l-[3px] border-l-destructive/50 bg-destructive/5",
                      )}
                    >
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-mono text-xs break-all">{r.name}</td>
                      <td className="px-3 py-2">
                        <RecordTypeBadge type={r.type} />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs break-all">{r.value}</td>
                      <td className="px-3 py-2 text-xs">{r.zone}</td>
                      <td className="px-3 py-2 tabular-nums">{r.ttl}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{r.lastModified}</td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">
                        <CircleDot className="mx-auto mb-2 h-5 w-5 opacity-40" />
                        No records match your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === "resolver" && resolverStats && (
              <div className="space-y-6 p-4">
                <p className="text-xs text-muted-foreground">
                  Resolver stats · {resolverStats.period} (mock Technitium dashboard)
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Activity className="h-4 w-4" /> Total queries
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {formatNumber(resolverStats.totalQueries)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="h-4 w-4" /> Blocked
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums text-destructive">
                      {formatNumber(resolverStats.blockedQueries)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Zap className="h-4 w-4" /> Cache entries
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {formatNumber(resolverStats.cachedEntries)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <RefreshCw className="h-4 w-4" /> Avg response
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {resolverStats.avgResponseMs} ms
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-border">
                    <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                      Top domains
                    </div>
                    <ul className="divide-y divide-border">
                      {resolverStats.topDomains.map((row) => (
                        <li key={row.name} className="flex justify-between px-3 py-2 text-sm">
                          <span className="font-mono text-xs">{row.name}</span>
                          <span className="tabular-nums text-muted-foreground">{formatNumber(row.hits)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-border">
                    <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                      Top clients
                    </div>
                    <ul className="divide-y divide-border">
                      {resolverStats.topClients.map((row) => (
                        <li key={row.name} className="flex justify-between px-3 py-2 text-sm">
                          <span className="font-mono text-xs">{row.name}</span>
                          <span className="tabular-nums text-muted-foreground">{formatNumber(row.hits)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Time</th>
                      <th className="px-3 py-2 text-left font-medium">Client</th>
                      <th className="px-3 py-2 text-left font-medium">Domain</th>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-left font-medium">Result</th>
                      <th className="px-3 py-2 text-left font-medium">Ms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolverStats.recentQueries.map((q) => (
                      <tr key={q.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-3 py-2 text-xs text-muted-foreground">{q.timestamp}</td>
                        <td className="px-3 py-2 font-mono text-xs">{q.client}</td>
                        <td className="px-3 py-2 font-mono text-xs">{q.domain}</td>
                        <td className="px-3 py-2 text-xs">{q.type}</td>
                        <td className="px-3 py-2 text-xs">{q.result}</td>
                        <td className="px-3 py-2 tabular-nums">{q.responseTimeMs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {tab !== "resolver" && (
            <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              Showing {tab === "zones" ? filteredZones.length : filteredRecords.length} items
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
