"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  Shield,
  ArrowRightLeft,
  ListChecks,
  Upload,
  RefreshCw,
  Plug,
  FileSpreadsheet,
  CircleDot,
  Download,
  Route,
  Boxes,
  Waypoints,
  ChevronLeft,
  Loader2,
} from "lucide-react"
import { fetchFirewallDeviceDetail } from "@/lib/firewall/firewall-api"
import type {
  AddressObject,
  FwDevice,
  NatRule,
  SecurityRule,
  ServiceObject,
  StaticRoute,
} from "@/lib/firewall/firewall-types"
import { enrichStaticRoutes, type ResolvedStaticRoute } from "@/lib/firewall/route-object-resolve"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { RouteListInsights } from "@/components/firewall/route-list-insights"
import { RouteListToolbar, emptyRouteListFilters } from "@/components/firewall/route-list-toolbar"
import { SecurityListInsights } from "@/components/firewall/security-list-insights"
import { SecurityListToolbar } from "@/components/firewall/security-list-toolbar"
import { NatListInsights } from "@/components/firewall/nat-list-insights"
import { NatListToolbar } from "@/components/firewall/nat-list-toolbar"
import { ObjectListInsights } from "@/components/firewall/object-list-insights"
import { ObjectListToolbar } from "@/components/firewall/object-list-toolbar"
import { ServiceListInsights } from "@/components/firewall/service-list-insights"
import { ServiceListToolbar } from "@/components/firewall/service-list-toolbar"
import { computeRouteInsights } from "@/lib/firewall/route-summary"
import { computeSecurityInsights } from "@/lib/firewall/security-summary"
import { computeNatInsights } from "@/lib/firewall/nat-summary"
import { computeObjectInsights } from "@/lib/firewall/object-summary"
import { computeServiceInsights } from "@/lib/firewall/service-summary"
import {
  defaultRouteSort,
  exportRoutesCsv,
  filterAndSortRoutes,
  filterRoutes,
  type RouteListFilters,
  type RouteSortState,
  uniqueRouteValues,
} from "@/lib/firewall/route-list-utils"
import {
  defaultSecuritySort,
  emptySecurityListFilters,
  exportSecurityRulesCsv,
  filterAndSortSecurityRules,
  filterSecurityRules,
  uniqueSecurityValues,
  type SecurityListFilters,
  type SecuritySortState,
} from "@/lib/firewall/security-list-utils"
import {
  defaultNatSort,
  emptyNatListFilters,
  exportNatRulesCsv,
  filterAndSortNatRules,
  filterNatRules,
  uniqueNatValues,
  type NatListFilters,
  type NatSortState,
} from "@/lib/firewall/nat-list-utils"
import {
  defaultObjectSort,
  emptyObjectListFilters,
  exportObjectsCsv,
  filterAndSortObjects,
  filterObjects,
  type ObjectListFilters,
  type ObjectSortKey,
  type ObjectSortState,
  uniqueObjectValues,
} from "@/lib/firewall/object-list-utils"
import {
  defaultServiceSort,
  emptyServiceListFilters,
  exportServicesCsv,
  filterAndSortServices,
  filterServices,
  type ServiceListFilters,
  type ServiceSortKey,
  type ServiceSortState,
  uniqueServiceValues,
} from "@/lib/firewall/service-list-utils"
import {
  ActionPill,
  AddrKindBadge,
  DataSourceBadge,
  DestCidrStatusBadge,
  DestKindBadge,
  GwKindBadge,
  NetworkCatBadge,
  PredefinedBadge,
  ServiceProtocolBadge,
  StatusDot,
} from "@/components/firewall/firewall-ui"
import { MultiValueCell, splitMultiValue } from "@/components/firewall/multi-value-cell"
import { IncrementalListStatus } from "@/components/firewall/incremental-list-status"
import { useIncrementalList } from "@/hooks/use-incremental-list"

type FwTab = "security" | "nat" | "routes" | "objects" | "services"

const TABLE_SCROLL_CLASS =
  "max-w-full max-h-[min(680px,calc(100vh-18rem))] overflow-x-auto overflow-y-auto overscroll-x-contain overscroll-y-contain [-webkit-overflow-scrolling:touch]"

interface FirewallDeviceDetailProps {
  deviceId: string
}

export function FirewallDeviceDetail({ deviceId }: FirewallDeviceDetailProps) {
  const [device, setDevice] = useState<FwDevice | null>(null)
  const [securityRules, setSecurityRules] = useState<SecurityRule[]>([])
  const [natRules, setNatRules] = useState<NatRule[]>([])
  const [staticRoutes, setStaticRoutes] = useState<StaticRoute[]>([])
  const [addressObjects, setAddressObjects] = useState<AddressObject[]>([])
  const [serviceObjects, setServiceObjects] = useState<ServiceObject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<FwTab>("security")
  const [securityFilters, setSecurityFilters] = useState<SecurityListFilters>(
    emptySecurityListFilters,
  )
  const [securitySort, setSecuritySort] = useState<SecuritySortState>(defaultSecuritySort)
  const [natFilters, setNatFilters] = useState<NatListFilters>(emptyNatListFilters)
  const [natSort, setNatSort] = useState<NatSortState>(defaultNatSort)
  const [focusObjectId, setFocusObjectId] = useState<string | null>(null)
  const [routeFilters, setRouteFilters] = useState<RouteListFilters>(emptyRouteListFilters)
  const [routeSort, setRouteSort] = useState<RouteSortState>(defaultRouteSort)
  const [objectFilters, setObjectFilters] = useState<ObjectListFilters>(emptyObjectListFilters)
  const [objectSort, setObjectSort] = useState<ObjectSortState>(defaultObjectSort)
  const [serviceFilters, setServiceFilters] = useState<ServiceListFilters>(emptyServiceListFilters)
  const [serviceSort, setServiceSort] = useState<ServiceSortState>(defaultServiceSort)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchFirewallDeviceDetail(deviceId)
      .then((payload) => {
        setDevice(payload.device)
        setSecurityRules(payload.securityRules)
        setNatRules(payload.natRules)
        setStaticRoutes(payload.staticRoutes)
        setAddressObjects(payload.addressObjects)
        setServiceObjects(payload.serviceObjects)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load firewall device")
        setDevice(null)
      })
      .finally(() => setLoading(false))
  }, [deviceId])

  const openObjectFromRoute = (route: ResolvedStaticRoute) => {
    if (route.destKind !== "object") return
    setTab("objects")
    setObjectFilters({ ...emptyObjectListFilters, q: route.destination })
    setFocusObjectId(route.destObjectId)
  }

  const resolvedRoutes = useMemo(
    () => enrichStaticRoutes(staticRoutes, addressObjects),
    [staticRoutes, addressObjects],
  )

  const securityFilterOptions = useMemo(
    () => uniqueSecurityValues(securityRules),
    [securityRules],
  )

  const filteredSecurityBeforeSort = useMemo(
    () => filterSecurityRules(securityRules, securityFilters),
    [securityRules, securityFilters],
  )

  const filteredSecurity = useMemo(
    () => filterAndSortSecurityRules(securityRules, securityFilters, securitySort),
    [securityRules, securityFilters, securitySort],
  )

  const securityInsights = useMemo(
    () => computeSecurityInsights(securityRules.length, filteredSecurityBeforeSort),
    [securityRules.length, filteredSecurityBeforeSort],
  )

  const natFilterOptions = useMemo(() => uniqueNatValues(natRules), [natRules])

  const filteredNatBeforeSort = useMemo(
    () => filterNatRules(natRules, natFilters),
    [natRules, natFilters],
  )

  const filteredNat = useMemo(
    () => filterAndSortNatRules(natRules, natFilters, natSort),
    [natRules, natFilters, natSort],
  )

  const natInsights = useMemo(
    () => computeNatInsights(natRules.length, filteredNatBeforeSort),
    [natRules.length, filteredNatBeforeSort],
  )

  const routeFilterOptions = useMemo(
    () => uniqueRouteValues(resolvedRoutes),
    [resolvedRoutes],
  )

  const filteredRoutesBeforeSort = useMemo(
    () => filterRoutes(resolvedRoutes, routeFilters),
    [resolvedRoutes, routeFilters],
  )

  const filteredRoutes = useMemo(
    () => filterAndSortRoutes(resolvedRoutes, routeFilters, routeSort),
    [resolvedRoutes, routeFilters, routeSort],
  )

  const routeInsights = useMemo(
    () => computeRouteInsights(resolvedRoutes.length, filteredRoutesBeforeSort),
    [resolvedRoutes.length, filteredRoutesBeforeSort],
  )
  const objectFilterOptions = useMemo(
    () => uniqueObjectValues(addressObjects),
    [addressObjects],
  )

  const filteredObjectsBeforeSort = useMemo(
    () => filterObjects(addressObjects, objectFilters),
    [addressObjects, objectFilters],
  )

  const filteredObjects = useMemo(
    () => filterAndSortObjects(addressObjects, objectFilters, objectSort),
    [addressObjects, objectFilters, objectSort],
  )

  const objectInsights = useMemo(
    () => computeObjectInsights(addressObjects.length, filteredObjectsBeforeSort),
    [addressObjects.length, filteredObjectsBeforeSort],
  )

  const serviceFilterOptions = useMemo(
    () => uniqueServiceValues(serviceObjects),
    [serviceObjects],
  )

  const filteredServicesBeforeSort = useMemo(
    () => filterServices(serviceObjects, serviceFilters),
    [serviceObjects, serviceFilters],
  )

  const filteredServices = useMemo(
    () => filterAndSortServices(serviceObjects, serviceFilters, serviceSort),
    [serviceObjects, serviceFilters, serviceSort],
  )

  const serviceInsights = useMemo(
    () => computeServiceInsights(serviceObjects.length, filteredServicesBeforeSort),
    [serviceObjects.length, filteredServicesBeforeSort],
  )

  const activeListItems = useMemo(() => {
    switch (tab) {
      case "security":
        return filteredSecurity
      case "nat":
        return filteredNat
      case "routes":
        return filteredRoutes
      case "objects":
        return filteredObjects
      case "services":
        return filteredServices
      default:
        return []
    }
  }, [tab, filteredSecurity, filteredNat, filteredRoutes, filteredObjects, filteredServices])

  const {
    visibleItems: visibleListItems,
    total: activeListTotal,
    hasMore: activeListHasMore,
    visibleCount: activeListVisibleCount,
    scrollRootRef: tableScrollRef,
    sentinelRef: tableSentinelRef,
    ensureVisibleCount: ensureListVisibleCount,
  } = useIncrementalList(activeListItems)

  useEffect(() => {
    if (tab !== "objects" || !focusObjectId) return
    const index = filteredObjects.findIndex((object) => object.id === focusObjectId)
    if (index === -1) return
    ensureListVisibleCount(index + 1)
  }, [tab, focusObjectId, filteredObjects, ensureListVisibleCount])

  const tabItems = [
    { id: "security" as const, label: "Security Rules", icon: ListChecks, count: securityRules.length },
    { id: "nat" as const, label: "NAT Rules", icon: ArrowRightLeft, count: natRules.length },
    { id: "routes" as const, label: "Route List", icon: Route, count: resolvedRoutes.length },
    { id: "objects" as const, label: "Object List", icon: Boxes, count: addressObjects.length },
    { id: "services" as const, label: "Service List", icon: Waypoints, count: serviceObjects.length },
  ]

  const selectTab = (next: FwTab) => {
    setTab(next)
    setSecurityFilters(emptySecurityListFilters)
    setSecuritySort(defaultSecuritySort)
    setNatFilters(emptyNatListFilters)
    setNatSort(defaultNatSort)
    setFocusObjectId(null)
    setRouteFilters(emptyRouteListFilters)
    setRouteSort(defaultRouteSort)
    setObjectFilters(emptyObjectListFilters)
    setObjectSort(defaultObjectSort)
    setServiceFilters(emptyServiceListFilters)
    setServiceSort(defaultServiceSort)
  }

  const resetSecurityControls = () => {
    setSecurityFilters(emptySecurityListFilters)
    setSecuritySort(defaultSecuritySort)
  }

  const resetNatControls = () => {
    setNatFilters(emptyNatListFilters)
    setNatSort(defaultNatSort)
  }

  const resetRouteControls = () => {
    setRouteFilters(emptyRouteListFilters)
    setRouteSort(defaultRouteSort)
  }

  const resetObjectControls = () => {
    setObjectFilters(emptyObjectListFilters)
    setObjectSort(defaultObjectSort)
  }

  const resetServiceControls = () => {
    setServiceFilters(emptyServiceListFilters)
    setServiceSort(defaultServiceSort)
  }

  const handleSecurityExport = () => {
    exportSecurityRulesCsv(
      filteredSecurity,
      `security-rules-${device?.hostname ?? deviceId}-filtered-${filteredSecurity.length}.csv`,
    )
  }

  const handleNatExport = () => {
    exportNatRulesCsv(
      filteredNat,
      `nat-rules-${device?.hostname ?? deviceId}-filtered-${filteredNat.length}.csv`,
    )
  }

  const handleRouteExport = () => {
    exportRoutesCsv(
      filteredRoutes,
      `static-route-${device?.hostname ?? deviceId}-filtered-${filteredRoutes.length}.csv`,
    )
  }

  const handleObjectExport = () => {
    exportObjectsCsv(
      filteredObjects,
      `address-objects-${device?.hostname ?? deviceId}-filtered-${filteredObjects.length}.csv`,
    )
  }

  const handleServiceExport = () => {
    exportServicesCsv(
      filteredServices,
      `service-objects-${device?.hostname ?? deviceId}-filtered-${filteredServices.length}.csv`,
    )
  }

  const toggleObjectSort = (key: ObjectSortKey) => {
    if (objectSort.key === key) {
      setObjectSort({ key, dir: objectSort.dir === "asc" ? "desc" : "asc" })
      return
    }
    setObjectSort({ key, dir: "asc" })
  }

  const objectSortIndicator = (key: ObjectSortKey) => {
    if (objectSort.key !== key) return null
    return objectSort.dir === "asc" ? " ↑" : " ↓"
  }

  const toggleServiceSort = (key: ServiceSortKey) => {
    if (serviceSort.key === key) {
      setServiceSort({ key, dir: serviceSort.dir === "asc" ? "desc" : "asc" })
      return
    }
    setServiceSort({ key, dir: "asc" })
  }

  const serviceSortIndicator = (key: ServiceSortKey) => {
    if (serviceSort.key !== key) return null
    return serviceSort.dir === "asc" ? " ↑" : " ↓"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading firewall device…
      </div>
    )
  }

  if (!device) {
    return (
      <div className="space-y-4">
        <Link
          href="/firewall"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Firewall Devices
        </Link>
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-destructive">{error ?? "Firewall device not found."}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/firewall"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Firewall Devices
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Shield className="h-6 w-6 text-primary" />
              {device.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {device.hostname} · {device.vendor} {device.model} · {device.os} · {device.ip}
              {device.virtualRouter !== "—" && (
                <>
                  {" · "}
                  <span className="font-medium text-foreground">VR {device.virtualRouter}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" /> Sync
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-4 w-4" /> Export
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
            <div className="mt-2 flex flex-wrap gap-1.5">
              {device.zones.map((z) => (
                <span
                  key={z}
                  className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium"
                >
                  {z}
                </span>
              ))}
              {device.zones.length === 0 && (
                <span className="text-xs text-muted-foreground">No zones discovered</span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-border bg-background p-3">
            <div className="text-xs font-medium text-muted-foreground">Dataset configuration</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={`/resource-pool/device-inventory/${device.id}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Device Overview
              </Link>
              <Link
                href="/resource-pool/device-inventory"
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
              >
                <Plug className="h-3.5 w-3.5" /> Edit device
              </Link>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Last sync: <span className="font-medium text-foreground">{device.lastSync}</span>
              {" · "}
              Import CSV or configure live connectors on Device Overview.
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Rule Categories</h2>
            <p className="text-xs text-muted-foreground">Select a list to review</p>
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
            <h2 className="text-sm font-semibold">
              {tabItems.find((item) => item.id === tab)?.label}
            </h2>
          </div>

          {tab === "security" && (
            <SecurityListToolbar
              filters={securityFilters}
              sort={securitySort}
              srcZones={securityFilterOptions.srcZones}
              dstZones={securityFilterOptions.dstZones}
              onFiltersChange={setSecurityFilters}
              onSortChange={setSecuritySort}
              onReset={resetSecurityControls}
              onExport={handleSecurityExport}
            />
          )}

          {tab === "security" && (
            <SecurityListInsights
              insights={securityInsights}
              activeAction={securityFilters.action || null}
              onActionSelect={(action) =>
                setSecurityFilters((current) => ({
                  ...current,
                  action: action && current.action === action ? "" : action ?? "",
                }))
              }
            />
          )}

          {tab === "nat" && (
            <NatListToolbar
              filters={natFilters}
              sort={natSort}
              srcZones={natFilterOptions.srcZones}
              dstZones={natFilterOptions.dstZones}
              onFiltersChange={setNatFilters}
              onSortChange={setNatSort}
              onReset={resetNatControls}
              onExport={handleNatExport}
            />
          )}

          {tab === "nat" && (
            <NatListInsights
              insights={natInsights}
              activeType={natFilters.type || null}
              onTypeSelect={(type) =>
                setNatFilters((current) => ({
                  ...current,
                  type: type && current.type === type ? "" : type ?? "",
                }))
              }
            />
          )}

          {tab === "objects" && (
            <ObjectListToolbar
              filters={objectFilters}
              sort={objectSort}
              types={objectFilterOptions.types}
              networks={objectFilterOptions.networks}
              onFiltersChange={setObjectFilters}
              onSortChange={setObjectSort}
              onReset={resetObjectControls}
              onExport={handleObjectExport}
            />
          )}

          {tab === "objects" && (
            <ObjectListInsights
              insights={objectInsights}
              activeType={objectFilters.type || null}
              onTypeSelect={(type) =>
                setObjectFilters((current) => ({
                  ...current,
                  type: type && current.type === type ? "" : type ?? "",
                }))
              }
            />
          )}

          {tab === "services" && (
            <ServiceListToolbar
              filters={serviceFilters}
              sort={serviceSort}
              protocols={serviceFilterOptions.protocols}
              locations={serviceFilterOptions.locations}
              onFiltersChange={setServiceFilters}
              onSortChange={setServiceSort}
              onReset={resetServiceControls}
              onExport={handleServiceExport}
            />
          )}

          {tab === "services" && (
            <ServiceListInsights
              insights={serviceInsights}
              activeProtocol={serviceFilters.protocol || null}
              onProtocolSelect={(protocol) =>
                setServiceFilters((current) => ({
                  ...current,
                  protocol: protocol && current.protocol === protocol ? "" : protocol ?? "",
                }))
              }
            />
          )}

          {tab === "routes" && (
            <RouteListToolbar
              filters={routeFilters}
              sort={routeSort}
              interfaces={routeFilterOptions.interfaces}
              routeTables={routeFilterOptions.routeTables}
              onFiltersChange={setRouteFilters}
              onSortChange={setRouteSort}
              onReset={resetRouteControls}
              onExport={handleRouteExport}
            />
          )}

          {tab === "routes" && (
            <RouteListInsights
              insights={routeInsights}
              activeInterface={routeFilters.interface || null}
              onInterfaceSelect={(iface) =>
                setRouteFilters((current) => ({
                  ...current,
                  interface: iface && current.interface === iface ? "" : iface ?? "",
                }))
              }
            />
          )}

          <div ref={tableScrollRef} className={TABLE_SCROLL_CLASS}>
          {tab === "security" ? (
            <table className="w-max text-sm">
              <thead className="sticky top-0 z-10 bg-muted/40 text-xs uppercase text-muted-foreground backdrop-blur-sm">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">#</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Name</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Src Zone</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Src Addr</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Dst Zone</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Dst Addr</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Service</th>
                  <th className="px-3 py-2 text-left font-medium">Application</th>
                  <th className="px-3 py-2 text-left font-medium">Action</th>
                  <th className="px-3 py-2 text-right font-medium">Hits</th>
                </tr>
              </thead>
              <tbody>
                {visibleListItems.map((r, i) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-t border-border transition-colors",
                      r.enabled
                        ? "hover:bg-muted/30"
                        : "border-l-[3px] border-l-muted-foreground/35 bg-muted/15 hover:bg-muted/25"
                    )}
                  >
                    <td className={cn("px-3 py-2 tabular-nums", r.enabled ? "text-muted-foreground" : "text-muted-foreground/60")}>
                      {i + 1}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn(!r.enabled && "text-muted-foreground")}>{r.name}</span>
                        {!r.enabled && (
                          <span className="shrink-0 rounded border border-muted-foreground/30 bg-muted/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Disabled
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <MultiValueCell
                        value={r.srcZone}
                        mono={false}
                        dialogTitle={`Src Zone — ${r.name}`}
                        dialogDescription={`${splitMultiValue(r.srcZone).length} source zone entries`}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top">
                      <MultiValueCell
                        value={r.srcAddr}
                        nowrap
                        dialogTitle={`Src Address — ${r.name}`}
                        dialogDescription={`${splitMultiValue(r.srcAddr).length} source address entries`}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <MultiValueCell
                        value={r.dstZone}
                        mono={false}
                        dialogTitle={`Dst Zone — ${r.name}`}
                        dialogDescription={`${splitMultiValue(r.dstZone).length} destination zone entries`}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top">
                      <MultiValueCell
                        value={r.dstAddr}
                        nowrap
                        dialogTitle={`Dst Address — ${r.name}`}
                        dialogDescription={`${splitMultiValue(r.dstAddr).length} destination address entries`}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <MultiValueCell
                        value={r.service}
                        mono={false}
                        dialogTitle={`Service — ${r.name}`}
                        dialogDescription={`${splitMultiValue(r.service).length} service entries`}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <MultiValueCell
                        value={r.application}
                        mono={false}
                        dialogTitle={`Application — ${r.name}`}
                        dialogDescription={`${splitMultiValue(r.application).length} application entries`}
                      />
                    </td>
                    <td className={cn("px-3 py-2", !r.enabled && "opacity-50")}>
                      <ActionPill action={r.action} />
                    </td>
                    <td className={cn("px-3 py-2 text-right tabular-nums", !r.enabled && "text-muted-foreground/60")}>
                      {formatNumber(r.hitCount)}
                    </td>
                  </tr>
                ))}
                {activeListTotal === 0 && tab === "security" && (
                  <tr>
                    <td colSpan={10} className="px-3 py-10 text-center text-sm text-muted-foreground">
                      <CircleDot className="mx-auto mb-2 h-5 w-5 opacity-40" />
                      No security rules. Connect a data source or import a CSV / Palo export.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : tab === "nat" ? (
            <table className="w-max text-sm">
              <thead className="sticky top-0 z-10 bg-muted/40 text-xs uppercase text-muted-foreground backdrop-blur-sm">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">#</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Name</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Type</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Src Zone</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Dst Zone</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Orig Src</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Orig Dst</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Service</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Translated Src</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Translated Dst</th>
                </tr>
              </thead>
              <tbody>
                {visibleListItems.map((r, i) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-t border-border transition-colors",
                      r.enabled
                        ? "hover:bg-muted/30"
                        : "border-l-[3px] border-l-muted-foreground/35 bg-muted/15 hover:bg-muted/25",
                    )}
                  >
                    <td className={cn("px-3 py-2 tabular-nums", r.enabled ? "text-muted-foreground" : "text-muted-foreground/60")}>
                      {i + 1}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn(!r.enabled && "text-muted-foreground")}>{r.name}</span>
                        {!r.enabled && (
                          <span className="shrink-0 rounded border border-muted-foreground/30 bg-muted/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Disabled
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={cn("px-3 py-2", !r.enabled && "opacity-50")}>
                      <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium uppercase">
                        {r.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <MultiValueCell
                        value={r.srcZone}
                        mono={false}
                        dialogTitle={`Src Zone — ${r.name}`}
                        dialogDescription={`${splitMultiValue(r.srcZone).length} source zone entries`}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <MultiValueCell
                        value={r.dstZone}
                        mono={false}
                        dialogTitle={`Dst Zone — ${r.name}`}
                        dialogDescription={`${splitMultiValue(r.dstZone).length} destination zone entries`}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top">
                      <MultiValueCell
                        value={r.origSrc}
                        nowrap
                        dialogTitle={`Orig Src — ${r.name}`}
                        dialogDescription={`${splitMultiValue(r.origSrc).length} original source entries`}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top">
                      <MultiValueCell
                        value={r.origDst}
                        nowrap
                        dialogTitle={`Orig Dst — ${r.name}`}
                        dialogDescription={`${splitMultiValue(r.origDst).length} original destination entries`}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <MultiValueCell
                        value={r.service}
                        mono={false}
                        dialogTitle={`Service — ${r.name}`}
                        dialogDescription={`${splitMultiValue(r.service).length} service entries`}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top font-mono text-xs">
                      <span className={cn(!r.enabled && "text-muted-foreground opacity-60")}>{r.translatedSrc}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top font-mono text-xs">
                      <span className={cn(!r.enabled && "text-muted-foreground opacity-60")}>{r.translatedDst}</span>
                    </td>
                  </tr>
                ))}
                {activeListTotal === 0 && tab === "nat" && (
                  <tr>
                    <td colSpan={10} className="px-3 py-10 text-center text-sm text-muted-foreground">
                      <CircleDot className="mx-auto mb-2 h-5 w-5 opacity-40" />
                      No NAT rules. Connect a data source or import a CSV / Palo export.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : tab === "routes" ? (
            <table className="w-max text-sm">
              <thead className="sticky top-0 z-10 bg-muted/40 text-xs uppercase text-muted-foreground backdrop-blur-sm">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Destination</th>
                  <th className="px-3 py-2 text-left font-medium">Dst. CIDR</th>
                  <th className="px-3 py-2 text-left font-medium">Dest Kind</th>
                  <th className="px-3 py-2 text-left font-medium">Interface</th>
                  <th className="px-3 py-2 text-left font-medium">NH Type</th>
                  <th className="px-3 py-2 text-left font-medium">Gateway</th>
                  <th className="px-3 py-2 text-left font-medium">GW Type</th>
                  <th className="px-3 py-2 text-left font-medium">Metric</th>
                  <th className="px-3 py-2 text-left font-medium">Route Table</th>
                </tr>
              </thead>
              <tbody>
                {visibleListItems.map((r, i) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="max-w-[220px] px-3 py-2 font-mono text-xs">
                      {r.destKind === "object" ? (
                        <button
                          type="button"
                          onClick={() => openObjectFromRoute(r)}
                          className="text-left text-primary underline-offset-2 hover:underline"
                          title="Open in Object List"
                        >
                          {r.destination}
                        </button>
                      ) : (
                        r.destination
                      )}
                    </td>
                    <td
                      className="max-w-[180px] px-3 py-2 font-mono text-xs"
                      title={
                        r.destCidrStatus === "resolved" && r.destObjectAddr
                          ? `Object address: ${r.destObjectAddr}`
                          : r.destCidrStatus === "unresolved" && r.destKind === "object"
                            ? "Object not found in address lookup"
                            : undefined
                      }
                    >
                      <span className="inline-flex flex-wrap items-center gap-0.5">
                        {r.destCidr || (r.destCidrStatus === "unresolved" ? "(unresolved)" : "—")}
                        <DestCidrStatusBadge status={r.destCidrStatus} />
                      </span>
                    </td>
                    <td className="px-3 py-2"><DestKindBadge kind={r.destKind} /></td>
                    <td className="px-3 py-2 font-mono text-xs">{r.interface}</td>
                    <td className="px-3 py-2 text-xs">{r.nextHopType}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.gwKind === "object" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setTab("objects")
                            setObjectFilters({ ...emptyObjectListFilters, q: r.nextHop })
                            setFocusObjectId(
                              addressObjects.find((o) => o.name === r.nextHop)?.id ?? null,
                            )
                          }}
                          className="text-primary underline-offset-2 hover:underline"
                          title="Open gateway object"
                        >
                          {r.nextHop}
                        </button>
                      ) : (
                        r.nextHop || (r.gwKind === "unresolved" ? "(not exported)" : "—")
                      )}
                    </td>
                    <td className="px-3 py-2"><GwKindBadge kind={r.gwKind} /></td>
                    <td className="px-3 py-2 tabular-nums">{r.metric}</td>
                    <td className="px-3 py-2 text-xs">{r.routeTable}</td>
                  </tr>
                ))}
                {activeListTotal === 0 && tab === "routes" && (
                  <tr>
                    <td colSpan={11} className="px-3 py-10 text-center text-sm text-muted-foreground">
                      <CircleDot className="mx-auto mb-2 h-5 w-5 opacity-40" />
                      No static routes. Import CSV from Palo VR default export or connect API.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : tab === "objects" ? (
            <table className="w-max text-sm">
              <thead className="sticky top-0 z-10 bg-muted/40 text-xs uppercase text-muted-foreground backdrop-blur-sm">
                <tr>
                  {(
                    [
                      { key: "no" as const, label: "#", className: "" },
                      { key: "name" as const, label: "Name", className: "" },
                      { key: "location" as const, label: "Location", className: "" },
                      { key: "type" as const, label: "Type", className: "" },
                      { key: "address" as const, label: "Address", className: "" },
                      { key: "addrKind" as const, label: "Addr Kind", className: "" },
                      { key: "networkCat" as const, label: "Network", className: "" },
                      { key: "tags" as const, label: "Tags", className: "" },
                    ] as const
                  ).map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        "cursor-pointer select-none px-3 py-2 text-left font-medium hover:text-primary",
                        objectSort.key === col.key && "text-primary",
                      )}
                      onClick={() => toggleObjectSort(col.key)}
                    >
                      {col.label}
                      {objectSortIndicator(col.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleListItems.map((o, i) => (
                  <tr
                    key={o.id}
                    className={`border-t border-border hover:bg-muted/30 ${
                      focusObjectId === o.id ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{o.name}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{o.location || "—"}</td>
                    <td className="px-3 py-2 text-xs">{o.type}</td>
                    <td className="px-3 py-2 font-mono text-xs">{o.address}</td>
                    <td className="px-3 py-2"><AddrKindBadge kind={o.addrKind} /></td>
                    <td className="px-3 py-2"><NetworkCatBadge cat={o.networkCat} /></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{o.tags || "—"}</td>
                  </tr>
                ))}
                {activeListTotal === 0 && tab === "objects" && (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">
                      <CircleDot className="mx-auto mb-2 h-5 w-5 opacity-40" />
                      No address objects. Import Palo address export CSV or connect API.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-12" />
                <col />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-muted/40 text-xs uppercase text-muted-foreground backdrop-blur-sm">
                <tr>
                  {(
                    [
                      { key: "no" as const, label: "#" },
                      { key: "name" as const, label: "Name" },
                      { key: "location" as const, label: "Location" },
                      { key: "protocol" as const, label: "Protocol" },
                      { key: "destinationPort" as const, label: "Dest Port" },
                      { key: "tags" as const, label: "Tags" },
                    ] as const
                  ).map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        "cursor-pointer select-none px-3 py-2 text-left font-medium hover:text-primary",
                        serviceSort.key === col.key && "text-primary",
                      )}
                      onClick={() => toggleServiceSort(col.key)}
                    >
                      {col.label}
                      {serviceSortIndicator(col.key)}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {visibleListItems.map((s, i) => (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{s.name}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{s.location || "—"}</td>
                    <td className="px-3 py-2"><ServiceProtocolBadge protocol={s.protocol} /></td>
                    <td className="px-3 py-2 font-mono text-xs">{s.destinationPort || "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground break-words">{s.tags || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {s.isPredefined ? (
                        <PredefinedBadge predefined />
                      ) : (
                        <span className="text-xs text-muted-foreground">Custom</span>
                      )}
                    </td>
                  </tr>
                ))}
                {activeListTotal === 0 && tab === "services" && (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">
                      <CircleDot className="mx-auto mb-2 h-5 w-5 opacity-40" />
                      No service objects. Import Palo service export CSV or connect API.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          <div ref={tableSentinelRef} className="h-px" aria-hidden />
          <IncrementalListStatus
            loaded={activeListVisibleCount}
            total={activeListTotal}
            hasMore={activeListHasMore}
          />
          </div>
        </section>
      </div>
    </div>
  )
}
