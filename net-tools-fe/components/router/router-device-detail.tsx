"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Router,
  Route,
  Network,
  Shield,
  List,
  RefreshCw,
  Download,
  ChevronLeft,
  Loader2,
  CircleDot,
  ArrowLeftRight,
} from "lucide-react"
import { fetchRouterDeviceDetail, syncRouterDevice } from "@/lib/router/router-api"
import type {
  RouterAddressListEntry,
  RouterDevice,
  RouterFirewallRule,
  RouterInterface,
  RouterRoute,
} from "@/lib/router/router-types"
import {
  defaultRouterAddressListSort,
  defaultRouterFirewallSort,
  defaultRouterInterfaceSort,
  defaultRouterRouteSort,
  emptyRouterAddressListFilters,
  emptyRouterFirewallFilters,
  emptyRouterInterfaceFilters,
  emptyRouterRouteFilters,
  exportRouterAddressListsCsv,
  exportRouterFirewallRulesCsv,
  exportRouterInterfacesCsv,
  exportRouterRoutesCsv,
  filterAndSortRouterAddressLists,
  filterAndSortRouterFirewallRules,
  filterAndSortRouterInterfaces,
  filterAndSortRouterRoutes,
  routerExportFilename,
  type RouterAddressListFilters,
  type RouterAddressListSortKey,
  type RouterFirewallFilters,
  type RouterFirewallSortKey,
  type RouterInterfaceFilters,
  type RouterInterfaceSortKey,
  type RouterRouteFilters,
  type RouterRouteSortKey,
  type SortDir,
  type SortState,
  uniqueRouterAddressListValues,
  uniqueRouterFirewallValues,
  uniqueRouterInterfaceValues,
  uniqueRouterRouteValues,
} from "@/lib/router/router-list-utils"
import { cn } from "@/lib/utils"
import {
  DataSourceBadge,
  FilterActionBadge,
  FilterChainBadge,
  InterfaceStatusBadge,
  RouteDynamicBadge,
  ServiceProtocolBadge,
  StatusDot,
} from "@/components/router/router-ui"
import { RouterFilterSelect, RouterListToolbar, SortableHeader } from "@/components/router/router-list-toolbar"
import { IncrementalListStatus } from "@/components/firewall/incremental-list-status"
import { useIncrementalList } from "@/hooks/use-incremental-list"

type RouterTab = "routes" | "interfaces" | "firewall" | "nat" | "address-lists"

const TABLE_SCROLL_CLASS =
  "max-w-full max-h-[min(680px,calc(100vh-18rem))] overflow-x-auto overflow-y-auto overscroll-x-contain overscroll-y-contain [-webkit-overflow-scrolling:touch]"

interface RouterDeviceDetailProps {
  deviceId: string
}

function toggleSortState<K extends string>(
  current: SortState<K>,
  key: K,
): SortState<K> {
  if (current.key === key) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" }
  }
  return { key, dir: "asc" }
}

export function RouterDeviceDetail({ deviceId }: RouterDeviceDetailProps) {
  const [device, setDevice] = useState<RouterDevice | null>(null)
  const [routes, setRoutes] = useState<RouterRoute[]>([])
  const [interfaces, setInterfaces] = useState<RouterInterface[]>([])
  const [firewallRules, setFirewallRules] = useState<RouterFirewallRule[]>([])
  const [natRules, setNatRules] = useState<RouterFirewallRule[]>([])
  const [addressLists, setAddressLists] = useState<RouterAddressListEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<RouterTab>("routes")
  const [routeFilters, setRouteFilters] = useState<RouterRouteFilters>(emptyRouterRouteFilters)
  const [routeSort, setRouteSort] = useState(defaultRouterRouteSort)
  const [interfaceFilters, setInterfaceFilters] = useState<RouterInterfaceFilters>(emptyRouterInterfaceFilters)
  const [interfaceSort, setInterfaceSort] = useState(defaultRouterInterfaceSort)
  const [firewallFilters, setFirewallFilters] = useState<RouterFirewallFilters>(emptyRouterFirewallFilters)
  const [firewallSort, setFirewallSort] = useState(defaultRouterFirewallSort)
  const [natFilters, setNatFilters] = useState<RouterFirewallFilters>(emptyRouterFirewallFilters)
  const [natSort, setNatSort] = useState(defaultRouterFirewallSort)
  const [addressListFilters, setAddressListFilters] = useState<RouterAddressListFilters>(
    emptyRouterAddressListFilters,
  )
  const [addressListSort, setAddressListSort] = useState(defaultRouterAddressListSort)

  const loadDetail = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = await fetchRouterDeviceDetail(deviceId)
      setDevice(payload.device)
      setRoutes(payload.routes)
      setInterfaces(payload.interfaces)
      setFirewallRules(payload.firewallRules)
      setNatRules(payload.natRules)
      setAddressLists(payload.addressLists)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load router device")
      setDevice(null)
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      const payload = await syncRouterDevice(deviceId)
      setDevice(payload.device)
      setRoutes(payload.routes)
      setInterfaces(payload.interfaces)
      setFirewallRules(payload.firewallRules)
      setNatRules(payload.natRules)
      setAddressLists(payload.addressLists)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  const tabItems = useMemo(
    () => [
      { id: "routes" as const, label: "Routing Table", icon: Route, count: routes.length },
      { id: "interfaces" as const, label: "Interfaces", icon: Network, count: interfaces.length },
      { id: "firewall" as const, label: "Firewall Filter", icon: Shield, count: firewallRules.length },
      { id: "nat" as const, label: "Firewall NAT", icon: ArrowLeftRight, count: natRules.length },
      { id: "address-lists" as const, label: "Address Lists", icon: List, count: addressLists.length },
    ],
    [routes.length, interfaces.length, firewallRules.length, natRules.length, addressLists.length],
  )

  const routeMeta = useMemo(() => uniqueRouterRouteValues(routes), [routes])
  const interfaceMeta = useMemo(() => uniqueRouterInterfaceValues(interfaces), [interfaces])
  const firewallMeta = useMemo(() => uniqueRouterFirewallValues(firewallRules), [firewallRules])
  const natMeta = useMemo(() => uniqueRouterFirewallValues(natRules), [natRules])
  const addressListMeta = useMemo(() => uniqueRouterAddressListValues(addressLists), [addressLists])

  const filteredRoutes = useMemo(
    () => filterAndSortRouterRoutes(routes, routeFilters, routeSort),
    [routes, routeFilters, routeSort],
  )

  const filteredInterfaces = useMemo(
    () => filterAndSortRouterInterfaces(interfaces, interfaceFilters, interfaceSort),
    [interfaces, interfaceFilters, interfaceSort],
  )

  const filteredFirewall = useMemo(
    () => filterAndSortRouterFirewallRules(firewallRules, firewallFilters, firewallSort),
    [firewallRules, firewallFilters, firewallSort],
  )

  const filteredNat = useMemo(
    () => filterAndSortRouterFirewallRules(natRules, natFilters, natSort),
    [natRules, natFilters, natSort],
  )

  const filteredAddressLists = useMemo(
    () => filterAndSortRouterAddressLists(addressLists, addressListFilters, addressListSort),
    [addressLists, addressListFilters, addressListSort],
  )

  const activeList = useMemo(() => {
    switch (tab) {
      case "routes":
        return filteredRoutes
      case "interfaces":
        return filteredInterfaces
      case "firewall":
        return filteredFirewall
      case "nat":
        return filteredNat
      case "address-lists":
        return filteredAddressLists
    }
  }, [tab, filteredRoutes, filteredInterfaces, filteredFirewall, filteredNat, filteredAddressLists])

  const {
    visibleItems: visibleListItems,
    visibleCount,
    total: activeListTotal,
    hasMore,
    scrollRootRef: tableScrollRef,
    sentinelRef: tableSentinelRef,
  } = useIncrementalList(activeList)

  const selectTab = (next: RouterTab) => {
    setTab(next)
  }

  const exportCurrentTab = () => {
    if (!device) return
    const name = device.name
    switch (tab) {
      case "routes":
        exportRouterRoutesCsv(filteredRoutes, routerExportFilename(name, "routes"))
        break
      case "interfaces":
        exportRouterInterfacesCsv(filteredInterfaces, routerExportFilename(name, "interfaces"))
        break
      case "firewall":
        exportRouterFirewallRulesCsv(filteredFirewall, routerExportFilename(name, "firewall-filter"))
        break
      case "nat":
        exportRouterFirewallRulesCsv(filteredNat, routerExportFilename(name, "firewall-nat"))
        break
      case "address-lists":
        exportRouterAddressListsCsv(filteredAddressLists, routerExportFilename(name, "address-lists"))
        break
    }
  }

  const handleRouteSort = (key: RouterRouteSortKey, dir?: SortDir) => {
    setRouteSort(dir ? { key, dir } : toggleSortState(routeSort, key))
  }

  const handleInterfaceSort = (key: RouterInterfaceSortKey, dir?: SortDir) => {
    setInterfaceSort(dir ? { key, dir } : toggleSortState(interfaceSort, key))
  }

  const handleFirewallSort = (key: RouterFirewallSortKey, dir?: SortDir) => {
    setFirewallSort(dir ? { key, dir } : toggleSortState(firewallSort, key))
  }

  const handleNatSort = (key: RouterFirewallSortKey, dir?: SortDir) => {
    setNatSort(dir ? { key, dir } : toggleSortState(natSort, key))
  }

  const handleAddressListSort = (key: RouterAddressListSortKey, dir?: SortDir) => {
    setAddressListSort(dir ? { key, dir } : toggleSortState(addressListSort, key))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading router device…
      </div>
    )
  }

  if (!device) {
    return (
      <div className="space-y-4">
        <Link
          href="/router"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Router Devices
        </Link>
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-destructive">{error ?? "Router device not found."}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/router"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Router Devices
          </Link>
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
              <Router className="h-6 w-6 text-primary" />
              {device.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {device.hostname} · {device.vendor} {device.model} · {device.os} · {device.ip}
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
            onClick={exportCurrentTab}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <StatusDot status={device.status} />
              <DataSourceBadge src={device.dataSource} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Routing table:{" "}
              <span className="font-medium text-foreground">{device.routingTable}</span>
              {" · "}
              Last sync: <span className="font-medium text-foreground">{device.lastSync}</span>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-border bg-background p-3">
            <div className="text-xs font-medium text-muted-foreground">Device configuration</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={`/resource-pool/device-inventory/${deviceId}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
              >
                Device Overview
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
            <h2 className="text-sm font-semibold">Rule Categories</h2>
            <p className="text-xs text-muted-foreground">RouterOS datasets</p>
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
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">
              {tabItems.find((item) => item.id === tab)?.label}
            </h2>
          </div>

          {tab === "routes" && (
            <RouterListToolbar
              searchValue={routeFilters.q}
              searchPlaceholder="Destination, gateway, table, comment..."
              sortKey={routeSort.key}
              sortDir={routeSort.dir}
              quickSorts={[
                { key: "dstAddress", label: "Destination" },
                { key: "gateway", label: "Gateway" },
                { key: "distance", label: "Distance" },
                { key: "routingTable", label: "Table" },
                { key: "scope", label: "Scope" },
              ]}
              onSearchChange={(q) => setRouteFilters((prev) => ({ ...prev, q }))}
              onSortChange={handleRouteSort}
              onReset={() => {
                setRouteFilters(emptyRouterRouteFilters)
                setRouteSort(defaultRouterRouteSort)
              }}
              onExport={() =>
                device &&
                exportRouterRoutesCsv(filteredRoutes, routerExportFilename(device.name, "routes"))
              }
            >
              <RouterFilterSelect
                label="Route Table"
                value={routeFilters.routingTable}
                onChange={(routingTable) => setRouteFilters((prev) => ({ ...prev, routingTable }))}
                options={[
                  { value: "", label: "All" },
                  ...routeMeta.routingTables.map((item) => ({ value: item, label: item })),
                ]}
              />
              <RouterFilterSelect
                label="Type"
                value={routeFilters.routeType}
                onChange={(routeType) =>
                  setRouteFilters((prev) => ({
                    ...prev,
                    routeType: routeType as RouterRouteFilters["routeType"],
                  }))
                }
                options={[
                  { value: "", label: "All" },
                  { value: "static", label: "Static" },
                  { value: "dynamic", label: "Dynamic" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </RouterListToolbar>
          )}

          {tab === "interfaces" && (
            <RouterListToolbar
              searchValue={interfaceFilters.q}
              searchPlaceholder="Name, type, IP, MAC, comment..."
              sortKey={interfaceSort.key}
              sortDir={interfaceSort.dir}
              quickSorts={[
                { key: "name", label: "Name" },
                { key: "type", label: "Type" },
                { key: "mtu", label: "MTU" },
                { key: "status", label: "Status" },
                { key: "ipAddress", label: "IP Address" },
              ]}
              onSearchChange={(q) => setInterfaceFilters((prev) => ({ ...prev, q }))}
              onSortChange={handleInterfaceSort}
              onReset={() => {
                setInterfaceFilters(emptyRouterInterfaceFilters)
                setInterfaceSort(defaultRouterInterfaceSort)
              }}
              onExport={() =>
                device &&
                exportRouterInterfacesCsv(filteredInterfaces, routerExportFilename(device.name, "interfaces"))
              }
            >
              <RouterFilterSelect
                label="Status"
                value={interfaceFilters.status}
                onChange={(status) =>
                  setInterfaceFilters((prev) => ({
                    ...prev,
                    status: status as RouterInterfaceFilters["status"],
                  }))
                }
                options={[
                  { value: "", label: "All" },
                  { value: "up", label: "Up" },
                  { value: "down", label: "Down" },
                  { value: "disabled", label: "Disabled" },
                ]}
              />
              <RouterFilterSelect
                label="Type"
                value={interfaceFilters.type}
                onChange={(type) => setInterfaceFilters((prev) => ({ ...prev, type }))}
                options={[
                  { value: "", label: "All" },
                  ...interfaceMeta.types.map((item) => ({ value: item, label: item })),
                ]}
              />
            </RouterListToolbar>
          )}

          {tab === "firewall" && (
            <RouterListToolbar
              searchValue={firewallFilters.q}
              searchPlaceholder="Chain, action, src, dst, protocol..."
              sortKey={firewallSort.key}
              sortDir={firewallSort.dir}
              quickSorts={[
                { key: "chain", label: "Chain" },
                { key: "action", label: "Action" },
                { key: "srcAddress", label: "Source" },
                { key: "dstAddress", label: "Destination" },
                { key: "protocol", label: "Protocol" },
              ]}
              onSearchChange={(q) => setFirewallFilters((prev) => ({ ...prev, q }))}
              onSortChange={handleFirewallSort}
              onReset={() => {
                setFirewallFilters(emptyRouterFirewallFilters)
                setFirewallSort(defaultRouterFirewallSort)
              }}
              onExport={() =>
                device &&
                exportRouterFirewallRulesCsv(
                  filteredFirewall,
                  routerExportFilename(device.name, "firewall-filter"),
                )
              }
            >
              <RouterFilterSelect
                label="Chain"
                value={firewallFilters.chain}
                onChange={(chain) => setFirewallFilters((prev) => ({ ...prev, chain }))}
                options={[
                  { value: "", label: "All" },
                  ...firewallMeta.chains.map((item) => ({ value: item, label: item })),
                ]}
              />
              <RouterFilterSelect
                label="Action"
                value={firewallFilters.action}
                onChange={(action) => setFirewallFilters((prev) => ({ ...prev, action }))}
                options={[
                  { value: "", label: "All" },
                  ...firewallMeta.actions.map((item) => ({ value: item, label: item })),
                ]}
              />
              <RouterFilterSelect
                label="Enabled"
                value={firewallFilters.enabled}
                onChange={(enabled) =>
                  setFirewallFilters((prev) => ({
                    ...prev,
                    enabled: enabled as RouterFirewallFilters["enabled"],
                  }))
                }
                options={[
                  { value: "", label: "All" },
                  { value: "yes", label: "Enabled" },
                  { value: "no", label: "Disabled" },
                ]}
              />
            </RouterListToolbar>
          )}

          {tab === "nat" && (
            <RouterListToolbar
              searchValue={natFilters.q}
              searchPlaceholder="Chain, action, src, dst, protocol..."
              sortKey={natSort.key}
              sortDir={natSort.dir}
              quickSorts={[
                { key: "chain", label: "Chain" },
                { key: "action", label: "Action" },
                { key: "srcAddress", label: "Source" },
                { key: "dstAddress", label: "Destination" },
                { key: "protocol", label: "Protocol" },
              ]}
              onSearchChange={(q) => setNatFilters((prev) => ({ ...prev, q }))}
              onSortChange={handleNatSort}
              onReset={() => {
                setNatFilters(emptyRouterFirewallFilters)
                setNatSort(defaultRouterFirewallSort)
              }}
              onExport={() =>
                device &&
                exportRouterFirewallRulesCsv(filteredNat, routerExportFilename(device.name, "firewall-nat"))
              }
            >
              <RouterFilterSelect
                label="Chain"
                value={natFilters.chain}
                onChange={(chain) => setNatFilters((prev) => ({ ...prev, chain }))}
                options={[
                  { value: "", label: "All" },
                  ...natMeta.chains.map((item) => ({ value: item, label: item })),
                ]}
              />
              <RouterFilterSelect
                label="Action"
                value={natFilters.action}
                onChange={(action) => setNatFilters((prev) => ({ ...prev, action }))}
                options={[
                  { value: "", label: "All" },
                  ...natMeta.actions.map((item) => ({ value: item, label: item })),
                ]}
              />
            </RouterListToolbar>
          )}

          {tab === "address-lists" && (
            <RouterListToolbar
              searchValue={addressListFilters.q}
              searchPlaceholder="List name, address, comment..."
              sortKey={addressListSort.key}
              sortDir={addressListSort.dir}
              quickSorts={[
                { key: "list", label: "List" },
                { key: "address", label: "Address" },
                { key: "timeout", label: "Timeout" },
              ]}
              onSearchChange={(q) => setAddressListFilters((prev) => ({ ...prev, q }))}
              onSortChange={handleAddressListSort}
              onReset={() => {
                setAddressListFilters(emptyRouterAddressListFilters)
                setAddressListSort(defaultRouterAddressListSort)
              }}
              onExport={() =>
                device &&
                exportRouterAddressListsCsv(
                  filteredAddressLists,
                  routerExportFilename(device.name, "address-lists"),
                )
              }
            >
              <RouterFilterSelect
                label="List"
                value={addressListFilters.list}
                onChange={(list) => setAddressListFilters((prev) => ({ ...prev, list }))}
                options={[
                  { value: "", label: "All" },
                  ...addressListMeta.lists.map((item) => ({ value: item, label: item })),
                ]}
              />
              <RouterFilterSelect
                label="Dynamic"
                value={addressListFilters.dynamic}
                onChange={(dynamic) =>
                  setAddressListFilters((prev) => ({
                    ...prev,
                    dynamic: dynamic as RouterAddressListFilters["dynamic"],
                  }))
                }
                options={[
                  { value: "", label: "All" },
                  { value: "yes", label: "Dynamic" },
                  { value: "no", label: "Static" },
                ]}
              />
            </RouterListToolbar>
          )}

          <div ref={tableScrollRef} className={TABLE_SCROLL_CLASS}>
            {tab === "routes" && (
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-12" />
                  <col />
                  <col className="w-[14%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-muted/40 text-xs uppercase text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <SortableHeader
                      label="#"
                      columnKey="no"
                      sortKey={routeSort.key}
                      sortDir={routeSort.dir}
                      onSort={(key) => handleRouteSort(key)}
                    />
                    <SortableHeader
                      label="Dst Address"
                      columnKey="dstAddress"
                      sortKey={routeSort.key}
                      sortDir={routeSort.dir}
                      onSort={(key) => handleRouteSort(key)}
                    />
                    <SortableHeader
                      label="Gateway"
                      columnKey="gateway"
                      sortKey={routeSort.key}
                      sortDir={routeSort.dir}
                      onSort={(key) => handleRouteSort(key)}
                    />
                    <SortableHeader
                      label="Dist"
                      columnKey="distance"
                      sortKey={routeSort.key}
                      sortDir={routeSort.dir}
                      onSort={(key) => handleRouteSort(key)}
                    />
                    <SortableHeader
                      label="Scope"
                      columnKey="scope"
                      sortKey={routeSort.key}
                      sortDir={routeSort.dir}
                      onSort={(key) => handleRouteSort(key)}
                    />
                    <SortableHeader
                      label="Table"
                      columnKey="routingTable"
                      sortKey={routeSort.key}
                      sortDir={routeSort.dir}
                      onSort={(key) => handleRouteSort(key)}
                    />
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {(visibleListItems as RouterRoute[]).map((r, i) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.dstAddress}</td>
                      <td className="px-3 py-2 font-mono text-xs break-all">{r.gateway || "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{r.distance}</td>
                      <td className="px-3 py-2 tabular-nums">{r.scope}</td>
                      <td className="px-3 py-2 text-xs">{r.routingTable}</td>
                      <td className="px-3 py-2">
                        <RouteDynamicBadge dynamic={r.dynamic} active={r.active} />
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground break-words">{r.comment || "—"}</td>
                    </tr>
                  ))}
                  {activeListTotal === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">
                        <CircleDot className="mx-auto mb-2 h-5 w-5 opacity-40" />
                        No routes match your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === "interfaces" && (
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-12" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                  <col className="w-[14%]" />
                  <col />
                  <col className="w-[10%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-muted/40 text-xs uppercase text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <SortableHeader
                      label="#"
                      columnKey="no"
                      sortKey={interfaceSort.key}
                      sortDir={interfaceSort.dir}
                      onSort={(key) => handleInterfaceSort(key)}
                    />
                    <SortableHeader
                      label="Name"
                      columnKey="name"
                      sortKey={interfaceSort.key}
                      sortDir={interfaceSort.dir}
                      onSort={(key) => handleInterfaceSort(key)}
                    />
                    <SortableHeader
                      label="Type"
                      columnKey="type"
                      sortKey={interfaceSort.key}
                      sortDir={interfaceSort.dir}
                      onSort={(key) => handleInterfaceSort(key)}
                    />
                    <SortableHeader
                      label="MTU"
                      columnKey="mtu"
                      sortKey={interfaceSort.key}
                      sortDir={interfaceSort.dir}
                      onSort={(key) => handleInterfaceSort(key)}
                    />
                    <th className="px-3 py-2 text-left font-medium">MAC</th>
                    <SortableHeader
                      label="IP Address"
                      columnKey="ipAddress"
                      sortKey={interfaceSort.key}
                      sortDir={interfaceSort.dir}
                      onSort={(key) => handleInterfaceSort(key)}
                    />
                    <SortableHeader
                      label="Status"
                      columnKey="status"
                      sortKey={interfaceSort.key}
                      sortDir={interfaceSort.dir}
                      onSort={(key) => handleInterfaceSort(key)}
                    />
                    <th className="px-3 py-2 text-left font-medium">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {(visibleListItems as RouterInterface[]).map((iface, i) => (
                    <tr key={iface.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{iface.name}</td>
                      <td className="px-3 py-2 text-xs uppercase text-muted-foreground">{iface.type}</td>
                      <td className="px-3 py-2 tabular-nums">{iface.mtu}</td>
                      <td className="px-3 py-2 font-mono text-xs">{iface.macAddress}</td>
                      <td className="px-3 py-2 font-mono text-xs">{iface.ipAddress || "—"}</td>
                      <td className="px-3 py-2">
                        <InterfaceStatusBadge status={iface.status} />
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground break-words">{iface.comment || "—"}</td>
                    </tr>
                  ))}
                  {activeListTotal === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">
                        <CircleDot className="mx-auto mb-2 h-5 w-5 opacity-40" />
                        No interfaces match your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === "firewall" && (
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-12" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col />
                  <col />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-muted/40 text-xs uppercase text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <SortableHeader
                      label="#"
                      columnKey="no"
                      sortKey={firewallSort.key}
                      sortDir={firewallSort.dir}
                      onSort={(key) => handleFirewallSort(key)}
                    />
                    <SortableHeader
                      label="Chain"
                      columnKey="chain"
                      sortKey={firewallSort.key}
                      sortDir={firewallSort.dir}
                      onSort={(key) => handleFirewallSort(key)}
                    />
                    <SortableHeader
                      label="Action"
                      columnKey="action"
                      sortKey={firewallSort.key}
                      sortDir={firewallSort.dir}
                      onSort={(key) => handleFirewallSort(key)}
                    />
                    <SortableHeader
                      label="Src"
                      columnKey="srcAddress"
                      sortKey={firewallSort.key}
                      sortDir={firewallSort.dir}
                      onSort={(key) => handleFirewallSort(key)}
                    />
                    <SortableHeader
                      label="Dst"
                      columnKey="dstAddress"
                      sortKey={firewallSort.key}
                      sortDir={firewallSort.dir}
                      onSort={(key) => handleFirewallSort(key)}
                    />
                    <SortableHeader
                      label="Proto"
                      columnKey="protocol"
                      sortKey={firewallSort.key}
                      sortDir={firewallSort.dir}
                      onSort={(key) => handleFirewallSort(key)}
                    />
                    <th className="px-3 py-2 text-left font-medium">Port</th>
                    <th className="px-3 py-2 text-left font-medium">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {(visibleListItems as RouterFirewallRule[]).map((rule, i) => (
                    <tr
                      key={rule.id}
                      className={cn(
                        "border-t border-border transition-colors",
                        rule.disabled
                          ? "border-l-[3px] border-l-muted-foreground/35 bg-muted/15 hover:bg-muted/25"
                          : "hover:bg-muted/30",
                      )}
                    >
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2">
                        <FilterChainBadge chain={rule.chain} />
                      </td>
                      <td className="px-3 py-2">
                        <FilterActionBadge action={rule.action} />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs break-all">{rule.srcAddress || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs break-all">{rule.dstAddress || "—"}</td>
                      <td className="px-3 py-2">
                        {rule.protocol ? <ServiceProtocolBadge protocol={rule.protocol} /> : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{rule.dstPort || "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground break-words">
                        {rule.comment || "—"}
                        {rule.disabled && (
                          <span className="ml-1.5 rounded border border-muted-foreground/30 bg-muted/80 px-1 py-0.5 text-[10px] font-semibold uppercase">
                            Disabled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {activeListTotal === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">
                        <CircleDot className="mx-auto mb-2 h-5 w-5 opacity-40" />
                        No firewall filter rules match your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === "nat" && (
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-12" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col />
                  <col />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-muted/40 text-xs uppercase text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <SortableHeader
                      label="#"
                      columnKey="no"
                      sortKey={natSort.key}
                      sortDir={natSort.dir}
                      onSort={(key) => handleNatSort(key)}
                    />
                    <SortableHeader
                      label="Chain"
                      columnKey="chain"
                      sortKey={natSort.key}
                      sortDir={natSort.dir}
                      onSort={(key) => handleNatSort(key)}
                    />
                    <SortableHeader
                      label="Action"
                      columnKey="action"
                      sortKey={natSort.key}
                      sortDir={natSort.dir}
                      onSort={(key) => handleNatSort(key)}
                    />
                    <SortableHeader
                      label="Src"
                      columnKey="srcAddress"
                      sortKey={natSort.key}
                      sortDir={natSort.dir}
                      onSort={(key) => handleNatSort(key)}
                    />
                    <SortableHeader
                      label="Dst"
                      columnKey="dstAddress"
                      sortKey={natSort.key}
                      sortDir={natSort.dir}
                      onSort={(key) => handleNatSort(key)}
                    />
                    <SortableHeader
                      label="Proto"
                      columnKey="protocol"
                      sortKey={natSort.key}
                      sortDir={natSort.dir}
                      onSort={(key) => handleNatSort(key)}
                    />
                    <th className="px-3 py-2 text-left font-medium">Port</th>
                    <th className="px-3 py-2 text-left font-medium">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {(visibleListItems as RouterFirewallRule[]).map((rule, i) => (
                    <tr key={rule.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2">
                        <FilterChainBadge chain={rule.chain} />
                      </td>
                      <td className="px-3 py-2">
                        <FilterActionBadge action={rule.action} />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs break-all">{rule.srcAddress || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs break-all">{rule.dstAddress || "—"}</td>
                      <td className="px-3 py-2">
                        {rule.protocol ? <ServiceProtocolBadge protocol={rule.protocol} /> : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{rule.dstPort || "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground break-words">{rule.comment || "—"}</td>
                    </tr>
                  ))}
                  {activeListTotal === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">
                        <CircleDot className="mx-auto mb-2 h-5 w-5 opacity-40" />
                        No NAT rules match your filter. Sync from Device Overview if empty.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === "address-lists" && (
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-12" />
                  <col className="w-[18%]" />
                  <col />
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-muted/40 text-xs uppercase text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <SortableHeader
                      label="#"
                      columnKey="no"
                      sortKey={addressListSort.key}
                      sortDir={addressListSort.dir}
                      onSort={(key) => handleAddressListSort(key)}
                    />
                    <SortableHeader
                      label="List"
                      columnKey="list"
                      sortKey={addressListSort.key}
                      sortDir={addressListSort.dir}
                      onSort={(key) => handleAddressListSort(key)}
                    />
                    <SortableHeader
                      label="Address"
                      columnKey="address"
                      sortKey={addressListSort.key}
                      sortDir={addressListSort.dir}
                      onSort={(key) => handleAddressListSort(key)}
                    />
                    <SortableHeader
                      label="Timeout"
                      columnKey="timeout"
                      sortKey={addressListSort.key}
                      sortDir={addressListSort.dir}
                      onSort={(key) => handleAddressListSort(key)}
                    />
                    <th className="px-3 py-2 text-left font-medium">Dynamic</th>
                    <th className="px-3 py-2 text-left font-medium">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {(visibleListItems as RouterAddressListEntry[]).map((entry, i) => (
                    <tr key={entry.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{entry.list}</td>
                      <td className="px-3 py-2 font-mono text-xs">{entry.address}</td>
                      <td className="px-3 py-2 text-xs">{entry.timeout}</td>
                      <td className="px-3 py-2 text-xs">{entry.dynamic ? "yes" : "no"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground break-words">{entry.comment || "—"}</td>
                    </tr>
                  ))}
                  {activeListTotal === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">
                        <CircleDot className="mx-auto mb-2 h-5 w-5 opacity-40" />
                        No address list entries match your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            <div ref={tableSentinelRef} className="h-px" aria-hidden />
            <IncrementalListStatus loaded={visibleCount} total={activeListTotal} hasMore={hasMore} />
          </div>
        </section>
      </div>
    </div>
  )
}
