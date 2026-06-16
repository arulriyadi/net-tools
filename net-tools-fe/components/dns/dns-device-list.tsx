"use client"

import Link from "next/link"
import {
  Globe,
  Database,
  FileText,
  RefreshCw,
  Download,
  ChevronRight,
  Search,
  Loader2,
  Plus,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { formatNumber } from "@/lib/format"
import type { DnsDevice } from "@/lib/dns/dns-types"
import { fetchDnsDevices, syncAllDnsDevices } from "@/lib/dns/dns-api"
import {
  computeDnsSummary,
  DataSourceBadge,
  MockDataBadge,
  StatCard,
  StatusDot,
} from "@/components/dns/dns-ui"

export function DnsDeviceList() {
  const [devices, setDevices] = useState<DnsDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const loadDevices = useCallback(() => {
    setLoading(true)
    setError(null)
    return fetchDnsDevices()
      .then(setDevices)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load DNS devices")
        setDevices([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  const summary = useMemo(() => computeDnsSummary(devices), [devices])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return devices
    return devices.filter((d) =>
      [d.name, d.hostname, d.ip, d.vendor, d.product, d.version, d.site, ...d.roles]
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
  }, [devices, query])

  const handleSyncAll = async () => {
    setSyncing(true)
    setError(null)
    try {
      const next = await syncAllDnsDevices()
      setDevices(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading DNS devices…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
            <Globe className="h-6 w-6 text-primary" />
            DNS Management
            <MockDataBadge />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            DNS servers from Device Inventory (role: DNS) — Technitium zones, records, and resolver stats.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleSyncAll()}
            disabled={syncing || devices.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={syncing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {syncing ? "Syncing…" : "Sync All"}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground opacity-50 cursor-not-allowed"
            disabled
            title="Export report coming soon"
          >
            <Download className="h-4 w-4" /> Export Report
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Globe} label="DNS Devices" value={devices.length} hint={`${summary.online} online`} />
        <StatCard
          icon={Database}
          label="Zones"
          value={formatNumber(summary.totalZones)}
          hint="Across all devices"
          tone="success"
        />
        <StatCard icon={FileText} label="Records" value={formatNumber(summary.totalRecords)} hint="Authoritative" />
        <StatCard
          icon={RefreshCw}
          label="Need config"
          value={summary.needSource}
          hint="Manual / no live source"
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">DNS Devices</h2>
            <p className="text-xs text-muted-foreground">Select a device to open zones, records, and resolver stats</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, IP, site, role..."
                className="h-9 w-72 rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Link
              href="/resource-pool/device-inventory"
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              Add device
            </Link>
          </div>
        </div>

        <ul className="divide-y divide-border">
          {filtered.map((d) => (
            <li key={d.id}>
              <Link
                href={`/dns/${d.id}`}
                className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-accent/50"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusDot status={d.status} />
                    <span className="text-sm font-semibold">{d.name}</span>
                    <span className="text-xs text-muted-foreground">({d.hostname})</span>
                    <DataSourceBadge src={d.dataSource} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {d.vendor} {d.product} {d.version} · {d.ip}
                    {d.site !== "—" ? ` · ${d.site}` : ""}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span>
                      <Database className="mr-1 inline h-3 w-3" />
                      {d.zoneCount} zones
                    </span>
                    <span>
                      <FileText className="mr-1 inline h-3 w-3" />
                      {d.recordCount} records
                    </span>
                    <span className="capitalize">Roles: {d.roles.join(", ")}</span>
                    <span>Last sync: {d.lastSync}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-12 text-center text-sm text-muted-foreground">
              {devices.length === 0 ? (
                <>
                  No DNS devices yet.{" "}
                  <Link href="/resource-pool/device-inventory" className="text-primary hover:underline">
                    Add one in Device Inventory
                  </Link>{" "}
                  with DNS role.
                </>
              ) : (
                "No devices match your search."
              )}
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
