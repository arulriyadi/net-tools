"use client"

import Link from "next/link"
import {
  Router,
  Route,
  Network,
  Shield,
  List,
  RefreshCw,
  Download,
  ChevronRight,
  Search,
  Loader2,
  Plus,
  ArrowLeftRight,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { formatNumber } from "@/lib/format"
import type { RouterDevice } from "@/lib/router/router-types"
import { fetchRouterDevices, syncAllRouterDevices } from "@/lib/router/router-api"
import {
  computeRouterSummary,
  DataSourceBadge,
  StatCard,
  StatusDot,
} from "@/components/router/router-ui"

export function RouterDeviceList() {
  const [devices, setDevices] = useState<RouterDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const loadDevices = useCallback(() => {
    setLoading(true)
    setError(null)
    return fetchRouterDevices()
      .then(setDevices)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load routers")
        setDevices([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  const summary = useMemo(() => computeRouterSummary(devices), [devices])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return devices
    return devices.filter((d) =>
      [d.name, d.hostname, d.ip, d.vendor, d.model, d.site, d.os, d.routingTable]
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
  }, [devices, query])

  const handleSyncAll = async () => {
    setSyncing(true)
    setError(null)
    try {
      const next = await syncAllRouterDevices()
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
        Loading router devices…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Router className="h-6 w-6 text-primary" />
            Router Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Routers from Device Inventory — live MikroTik REST/API datasets synced via Resource Pool.
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
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 opacity-50 cursor-not-allowed"
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Router} label="Router Devices" value={devices.length} hint={`${summary.online} online`} />
        <StatCard icon={Route} label="Routes" value={formatNumber(summary.totalRoutes)} hint="Across all devices" tone="success" />
        <StatCard icon={Network} label="Interfaces" value={formatNumber(summary.totalInterfaces)} hint="Physical & logical" />
        <StatCard icon={Shield} label="Filter Rules" value={formatNumber(summary.totalFirewallRules)} hint="Firewall filter" />
        <StatCard icon={ArrowLeftRight} label="NAT Rules" value={formatNumber(summary.totalNatRules)} hint="Firewall NAT" />
        <StatCard icon={List} label="Address Lists" value={formatNumber(summary.totalAddressLists)} hint="List entries" />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Router Devices</h2>
            <p className="text-xs text-muted-foreground">
              From Resource Pool · {summary.needSource} need data source configuration
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search hostname, IP, site..."
                className="h-9 w-72 rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Link
              href="/resource-pool/device-inventory"
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              Add router
            </Link>
          </div>
        </div>

        <ul className="divide-y divide-border">
          {filtered.map((d) => (
            <li key={d.id}>
              <Link
                href={`/router/${d.id}`}
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
                    {d.vendor} · {d.model} · {d.os} · {d.ip}
                    {d.site !== "—" ? ` · ${d.site}` : ""}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span>
                      <Route className="mr-1 inline h-3 w-3" />
                      {d.routeCount} routes
                    </span>
                    <span>
                      <Network className="mr-1 inline h-3 w-3" />
                      {d.interfaceCount} interfaces
                    </span>
                    <span>
                      <Shield className="mr-1 inline h-3 w-3" />
                      {d.firewallRuleCount} filter
                    </span>
                    <span>
                      <ArrowLeftRight className="mr-1 inline h-3 w-3" />
                      {d.natRuleCount} NAT
                    </span>
                    <span>
                      <List className="mr-1 inline h-3 w-3" />
                      {d.addressListCount} address lists
                    </span>
                    {d.routingTable !== "—" && (
                      <span className="font-medium text-foreground">RT {d.routingTable}</span>
                    )}
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
                  No router devices yet.{" "}
                  <Link href="/resource-pool/device-inventory" className="text-primary hover:underline">
                    Add one in Device Inventory
                  </Link>
                  .
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
