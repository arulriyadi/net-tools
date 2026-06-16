import type { ResolvedStaticRoute } from "@/lib/firewall/route-object-resolve"
import { routeInterfaceKey } from "@/lib/firewall/route-summary"

export type RouteSortKey =
  | "no"
  | "interface"
  | "destination"
  | "destCidr"
  | "gateway"
  | "name"
  | "metric"

export interface RouteListFilters {
  q: string
  interface: string
  destKind: string
  destCidrStatus: string
  gwKind: string
  routeTable: string
}

export const emptyRouteListFilters: RouteListFilters = {
  q: "",
  interface: "",
  destKind: "",
  destCidrStatus: "",
  gwKind: "",
  routeTable: "",
}

export interface RouteSortState {
  key: RouteSortKey
  dir: "asc" | "desc"
}

export const defaultRouteSort: RouteSortState = { key: "no", dir: "asc" }

export function uniqueRouteValues(routes: ResolvedStaticRoute[]) {
  const interfaces = new Set<string>()
  const routeTables = new Set<string>()
  for (const route of routes) {
    interfaces.add(routeInterfaceKey(route.interface))
    if (route.routeTable) routeTables.add(route.routeTable)
  }
  return {
    interfaces: [...interfaces].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    routeTables: [...routeTables].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
  }
}

export function filterRoutes(
  routes: ResolvedStaticRoute[],
  filters: RouteListFilters,
): ResolvedStaticRoute[] {
  const q = filters.q.toLowerCase().trim()

  return routes.filter((route) => {
    if (filters.interface && routeInterfaceKey(route.interface) !== filters.interface) {
      return false
    }
    if (filters.destKind && route.destKind !== filters.destKind) return false
    if (filters.destCidrStatus && route.destCidrStatus !== filters.destCidrStatus) {
      return false
    }
    if (filters.gwKind && route.gwKind !== filters.gwKind) return false
    if (filters.routeTable && route.routeTable !== filters.routeTable) return false

    if (!q) return true

    const hay = [
      route.name,
      route.destination,
      route.interface,
      route.nextHop,
      route.nextHopType,
      route.routeTable,
      route.destCidr,
    ]
      .join(" ")
      .toLowerCase()

    return hay.includes(q)
  })
}

function compareRoutes(
  a: ResolvedStaticRoute,
  b: ResolvedStaticRoute,
  key: RouteSortKey,
  indexA: number,
  indexB: number,
): number {
  if (key === "no") return indexA - indexB
  if (key === "metric") return (Number(a.metric) || 0) - (Number(b.metric) || 0)

  if (key === "destCidr" || key === "destination") {
    return String(a.destCidr || a.destination || "").localeCompare(
      String(b.destCidr || b.destination || ""),
      undefined,
      { numeric: true },
    )
  }

  if (key === "gateway") {
    return String(a.nextHop || "").localeCompare(String(b.nextHop || ""), undefined, {
      numeric: true,
    })
  }

  const va = key === "interface" ? a.interface : a.name
  const vb = key === "interface" ? b.interface : b.name

  return String(va ?? "").localeCompare(String(vb ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

export function sortRoutes(
  routes: ResolvedStaticRoute[],
  sort: RouteSortState,
): ResolvedStaticRoute[] {
  const indexed = routes.map((route, index) => ({ route, index }))
  indexed.sort((a, b) => {
    const result = compareRoutes(a.route, b.route, sort.key, a.index, b.index)
    return sort.dir === "asc" ? result : -result
  })
  return indexed.map((item) => item.route)
}

export function filterAndSortRoutes(
  routes: ResolvedStaticRoute[],
  filters: RouteListFilters,
  sort: RouteSortState,
): ResolvedStaticRoute[] {
  return sortRoutes(filterRoutes(routes, filters), sort)
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

export function exportRoutesCsv(routes: ResolvedStaticRoute[], filename: string) {
  const headers = [
    "No",
    "Name",
    "Destination",
    "Dst. CIDR",
    "Dest Type",
    "Dest CIDR Status",
    "Interface",
    "NH Type",
    "Gateway",
    "GW Type",
    "Admin Distance",
    "Metric",
    "Route Table",
  ]

  const lines = [
    headers.join(","),
    ...routes.map((route, index) =>
      [
        index + 1,
        route.name,
        route.destination,
        route.destCidr,
        route.destKind,
        route.destCidrStatus,
        route.interface,
        route.nextHopType,
        route.nextHop,
        route.gwKind,
        route.adminDistance,
        route.metric,
        route.routeTable,
      ]
        .map(csvCell)
        .join(","),
    ),
  ]

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
