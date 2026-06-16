"use client"

import Link from "next/link"
import {
  Shield,
  Server,
  ArrowRightLeft,
  ListChecks,
  Upload,
  RefreshCw,
  Download,
  Route,
  Boxes,
  ChevronRight,
  Search,
  Loader2,
  Plus,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { formatNumber } from "@/lib/format"
import type { FwDevice } from "@/lib/firewall/firewall-types"
import { fetchFirewallDevices } from "@/lib/firewall/firewall-api"
import { computeFirewallSummary } from "@/lib/firewall/firewall-mapper"
import {
  DataSourceBadge,
  StatCard,
  StatusDot,
} from "@/components/firewall/firewall-ui"

export function FirewallDeviceList() {
  const [devices, setDevices] = useState<FwDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchFirewallDevices()
      .then(setDevices)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load firewalls")
        setDevices([])
      })
      .finally(() => setLoading(false))
  }, [])

  const summary = useMemo(() => computeFirewallSummary(devices), [devices])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return devices
    return devices.filter((d) =>
      [d.name, d.hostname, d.ip, d.vendor, d.model, d.site, d.os, d.virtualRouter]
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
  }, [devices, query])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading firewall devices from Resource Pool…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Shield className="h-6 w-6 text-primary" />
            Firewall Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Firewalls registered in Resource Pool — configure datasets on Device Overview, review rules here.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
            disabled
            title="Live sync will be available when collectors are wired"
          >
            <RefreshCw className="h-4 w-4" /> Sync All
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
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
        <StatCard icon={Server} label="Firewall Devices" value={devices.length} hint={`${summary.online} online`} />
        <StatCard icon={ListChecks} label="Security Rules" value={summary.totalSec} hint="Across all devices" tone="success" />
        <StatCard icon={ArrowRightLeft} label="NAT Rules" value={summary.totalNat} hint="Source / Destination / Static" />
        <StatCard icon={Route} label="Static Routes" value={formatNumber(summary.totalRoutes)} hint="From dataset bindings" />
        <StatCard icon={Boxes} label="Address Objects" value={formatNumber(summary.totalObjects)} hint="From dataset bindings" />
        <StatCard icon={Upload} label="Needs Data Source" value={summary.needSource} hint="Manual / no source" tone="warning" />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Firewall Devices</h2>
            <p className="text-xs text-muted-foreground">from Resource Pool · PostgreSQL</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search hostname, IP, vendor..."
                className="h-9 w-72 rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Link
              href="/resource-pool/device-inventory"
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              Add firewall
            </Link>
          </div>
        </div>

        <ul className="divide-y divide-border">
          {filtered.map((d) => (
            <li key={d.id}>
              <Link
                href={`/firewall/${d.id}`}
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
                    {d.vendor} · {d.model} · {d.ip}
                    {d.site !== "—" ? ` · ${d.site}` : ""}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span>
                      <ListChecks className="mr-1 inline h-3 w-3" />
                      {d.securityRuleCount} security
                    </span>
                    <span>
                      <ArrowRightLeft className="mr-1 inline h-3 w-3" />
                      {d.natRuleCount} NAT
                    </span>
                    <span>
                      <Route className="mr-1 inline h-3 w-3" />
                      {d.routeCount} routes
                    </span>
                    <span>
                      <Boxes className="mr-1 inline h-3 w-3" />
                      {d.objectCount} objects
                    </span>
                    {d.virtualRouter !== "—" && (
                      <span className="font-medium text-foreground">VR {d.virtualRouter}</span>
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
                <span>
                  No firewall devices yet.{" "}
                  <Link href="/resource-pool/device-inventory" className="text-primary hover:underline">
                    Add a firewall in Device Inventory
                  </Link>
                  .
                </span>
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
