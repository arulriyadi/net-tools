import type {
  RouterAddressListEntry,
  RouterFirewallRule,
  RouterInterface,
  RouterRoute,
} from "@/lib/router/router-types"

export type SortDir = "asc" | "desc"

export interface SortState<K extends string> {
  key: K
  dir: SortDir
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

function downloadCsv(lines: string[], filename: string) {
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function filterByQuery<T>(rows: T[], q: string, fields: (row: T) => (string | number | boolean)[]): T[] {
  const needle = q.toLowerCase().trim()
  if (!needle) return rows
  return rows.filter((row) => fields(row).join(" ").toLowerCase().includes(needle))
}

function sortIndexed<T, K extends string>(
  rows: T[],
  sort: SortState<K>,
  compare: (a: T, b: T, key: K, indexA: number, indexB: number) => number,
): T[] {
  const indexed = rows.map((row, index) => ({ row, index }))
  indexed.sort((a, b) => {
    const result = compare(a.row, b.row, sort.key, a.index, b.index)
    return sort.dir === "asc" ? result : -result
  })
  return indexed.map((item) => item.row)
}

/** --- Routing table --- */

export type RouterRouteSortKey =
  | "no"
  | "dstAddress"
  | "gateway"
  | "distance"
  | "scope"
  | "routingTable"

export interface RouterRouteFilters {
  q: string
  routingTable: string
  routeType: "" | "static" | "dynamic" | "inactive"
}

export const emptyRouterRouteFilters: RouterRouteFilters = {
  q: "",
  routingTable: "",
  routeType: "",
}

export const defaultRouterRouteSort: SortState<RouterRouteSortKey> = {
  key: "no",
  dir: "asc",
}

function routeTypeLabel(route: RouterRoute): "static" | "dynamic" | "inactive" {
  if (!route.active) return "inactive"
  return route.dynamic ? "dynamic" : "static"
}

export function uniqueRouterRouteValues(routes: RouterRoute[]) {
  const routingTables = new Set<string>()
  for (const route of routes) {
    if (route.routingTable) routingTables.add(route.routingTable)
  }
  return {
    routingTables: [...routingTables].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
  }
}

export function filterRouterRoutes(routes: RouterRoute[], filters: RouterRouteFilters): RouterRoute[] {
  return filterByQuery(
    routes.filter((route) => {
      if (filters.routingTable && route.routingTable !== filters.routingTable) return false
      if (filters.routeType && routeTypeLabel(route) !== filters.routeType) return false
      return true
    }),
    filters.q,
    (route) => [
      route.dstAddress,
      route.gateway,
      route.routingTable,
      route.comment,
      route.distance,
      route.scope,
      routeTypeLabel(route),
    ],
  )
}

function compareRouterRoutes(
  a: RouterRoute,
  b: RouterRoute,
  key: RouterRouteSortKey,
  indexA: number,
  indexB: number,
): number {
  if (key === "no") return indexA - indexB
  if (key === "distance" || key === "scope") {
    return (a[key] ?? 0) - (b[key] ?? 0)
  }
  const va = a[key as keyof RouterRoute]
  const vb = b[key as keyof RouterRoute]
  return String(va ?? "").localeCompare(String(vb ?? ""), undefined, { numeric: true })
}

export function filterAndSortRouterRoutes(
  routes: RouterRoute[],
  filters: RouterRouteFilters,
  sort: SortState<RouterRouteSortKey>,
): RouterRoute[] {
  return sortIndexed(filterRouterRoutes(routes, filters), sort, compareRouterRoutes)
}

export function exportRouterRoutesCsv(routes: RouterRoute[], filename: string) {
  const headers = ["No", "Dst Address", "Gateway", "Distance", "Scope", "Table", "Type", "Comment"]
  const lines = [
    headers.join(","),
    ...routes.map((route, index) =>
      [
        index + 1,
        route.dstAddress,
        route.gateway,
        route.distance,
        route.scope,
        route.routingTable,
        routeTypeLabel(route),
        route.comment,
      ]
        .map(csvCell)
        .join(","),
    ),
  ]
  downloadCsv(lines, filename)
}

/** --- Interfaces --- */

export type RouterInterfaceSortKey = "no" | "name" | "type" | "mtu" | "status" | "ipAddress"

export interface RouterInterfaceFilters {
  q: string
  status: "" | RouterInterface["status"]
  type: string
}

export const emptyRouterInterfaceFilters: RouterInterfaceFilters = {
  q: "",
  status: "",
  type: "",
}

export const defaultRouterInterfaceSort: SortState<RouterInterfaceSortKey> = {
  key: "name",
  dir: "asc",
}

export function uniqueRouterInterfaceValues(interfaces: RouterInterface[]) {
  const types = new Set<string>()
  for (const iface of interfaces) {
    if (iface.type) types.add(iface.type)
  }
  return {
    types: [...types].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
  }
}

export function filterRouterInterfaces(
  interfaces: RouterInterface[],
  filters: RouterInterfaceFilters,
): RouterInterface[] {
  return filterByQuery(
    interfaces.filter((iface) => {
      if (filters.status && iface.status !== filters.status) return false
      if (filters.type && iface.type !== filters.type) return false
      return true
    }),
    filters.q,
    (iface) => [iface.name, iface.type, iface.ipAddress, iface.macAddress, iface.status, iface.comment, iface.mtu],
  )
}

function compareRouterInterfaces(
  a: RouterInterface,
  b: RouterInterface,
  key: RouterInterfaceSortKey,
  indexA: number,
  indexB: number,
): number {
  if (key === "no") return indexA - indexB
  if (key === "mtu") return a.mtu - b.mtu
  const va = a[key as keyof RouterInterface]
  const vb = b[key as keyof RouterInterface]
  return String(va ?? "").localeCompare(String(vb ?? ""), undefined, { numeric: true })
}

export function filterAndSortRouterInterfaces(
  interfaces: RouterInterface[],
  filters: RouterInterfaceFilters,
  sort: SortState<RouterInterfaceSortKey>,
): RouterInterface[] {
  return sortIndexed(filterRouterInterfaces(interfaces, filters), sort, compareRouterInterfaces)
}

export function exportRouterInterfacesCsv(interfaces: RouterInterface[], filename: string) {
  const headers = ["No", "Name", "Type", "MTU", "MAC", "IP Address", "Status", "Comment"]
  const lines = [
    headers.join(","),
    ...interfaces.map((iface, index) =>
      [index + 1, iface.name, iface.type, iface.mtu, iface.macAddress, iface.ipAddress, iface.status, iface.comment]
        .map(csvCell)
        .join(","),
    ),
  ]
  downloadCsv(lines, filename)
}

/** --- Firewall filter / NAT --- */

export type RouterFirewallSortKey =
  | "no"
  | "chain"
  | "action"
  | "srcAddress"
  | "dstAddress"
  | "protocol"

export interface RouterFirewallFilters {
  q: string
  chain: string
  action: string
  enabled: "" | "yes" | "no"
}

export const emptyRouterFirewallFilters: RouterFirewallFilters = {
  q: "",
  chain: "",
  action: "",
  enabled: "",
}

export const defaultRouterFirewallSort: SortState<RouterFirewallSortKey> = {
  key: "no",
  dir: "asc",
}

export function uniqueRouterFirewallValues(rules: RouterFirewallRule[]) {
  const chains = new Set<string>()
  const actions = new Set<string>()
  for (const rule of rules) {
    chains.add(rule.chain)
    actions.add(rule.action)
  }
  return {
    chains: [...chains].sort(),
    actions: [...actions].sort(),
  }
}

export function filterRouterFirewallRules(
  rules: RouterFirewallRule[],
  filters: RouterFirewallFilters,
): RouterFirewallRule[] {
  return filterByQuery(
    rules.filter((rule) => {
      if (filters.chain && rule.chain !== filters.chain) return false
      if (filters.action && rule.action !== filters.action) return false
      if (filters.enabled === "yes" && rule.disabled) return false
      if (filters.enabled === "no" && !rule.disabled) return false
      return true
    }),
    filters.q,
    (rule) => [
      rule.chain,
      rule.action,
      rule.srcAddress,
      rule.dstAddress,
      rule.protocol,
      rule.dstPort,
      rule.comment,
      rule.disabled,
    ],
  )
}

function compareRouterFirewallRules(
  a: RouterFirewallRule,
  b: RouterFirewallRule,
  key: RouterFirewallSortKey,
  indexA: number,
  indexB: number,
): number {
  if (key === "no") return indexA - indexB
  const va = a[key as keyof RouterFirewallRule]
  const vb = b[key as keyof RouterFirewallRule]
  return String(va ?? "").localeCompare(String(vb ?? ""), undefined, { numeric: true })
}

export function filterAndSortRouterFirewallRules(
  rules: RouterFirewallRule[],
  filters: RouterFirewallFilters,
  sort: SortState<RouterFirewallSortKey>,
): RouterFirewallRule[] {
  return sortIndexed(filterRouterFirewallRules(rules, filters), sort, compareRouterFirewallRules)
}

export function exportRouterFirewallRulesCsv(rules: RouterFirewallRule[], filename: string) {
  const headers = ["No", "Chain", "Action", "Src", "Dst", "Protocol", "Port", "Disabled", "Comment"]
  const lines = [
    headers.join(","),
    ...rules.map((rule, index) =>
      [
        index + 1,
        rule.chain,
        rule.action,
        rule.srcAddress,
        rule.dstAddress,
        rule.protocol,
        rule.dstPort,
        rule.disabled ? "yes" : "no",
        rule.comment,
      ]
        .map(csvCell)
        .join(","),
    ),
  ]
  downloadCsv(lines, filename)
}

/** --- Address lists --- */

export type RouterAddressListSortKey = "no" | "list" | "address" | "timeout"

export interface RouterAddressListFilters {
  q: string
  list: string
  dynamic: "" | "yes" | "no"
}

export const emptyRouterAddressListFilters: RouterAddressListFilters = {
  q: "",
  list: "",
  dynamic: "",
}

export const defaultRouterAddressListSort: SortState<RouterAddressListSortKey> = {
  key: "list",
  dir: "asc",
}

export function uniqueRouterAddressListValues(entries: RouterAddressListEntry[]) {
  const lists = new Set<string>()
  for (const entry of entries) {
    lists.add(entry.list)
  }
  return {
    lists: [...lists].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
  }
}

export function filterRouterAddressLists(
  entries: RouterAddressListEntry[],
  filters: RouterAddressListFilters,
): RouterAddressListEntry[] {
  return filterByQuery(
    entries.filter((entry) => {
      if (filters.list && entry.list !== filters.list) return false
      if (filters.dynamic === "yes" && !entry.dynamic) return false
      if (filters.dynamic === "no" && entry.dynamic) return false
      return true
    }),
    filters.q,
    (entry) => [entry.list, entry.address, entry.timeout, entry.comment, entry.dynamic],
  )
}

function compareRouterAddressLists(
  a: RouterAddressListEntry,
  b: RouterAddressListEntry,
  key: RouterAddressListSortKey,
  indexA: number,
  indexB: number,
): number {
  if (key === "no") return indexA - indexB
  const va = a[key as keyof RouterAddressListEntry]
  const vb = b[key as keyof RouterAddressListEntry]
  return String(va ?? "").localeCompare(String(vb ?? ""), undefined, { numeric: true })
}

export function filterAndSortRouterAddressLists(
  entries: RouterAddressListEntry[],
  filters: RouterAddressListFilters,
  sort: SortState<RouterAddressListSortKey>,
): RouterAddressListEntry[] {
  return sortIndexed(filterRouterAddressLists(entries, filters), sort, compareRouterAddressLists)
}

export function exportRouterAddressListsCsv(entries: RouterAddressListEntry[], filename: string) {
  const headers = ["No", "List", "Address", "Timeout", "Dynamic", "Comment"]
  const lines = [
    headers.join(","),
    ...entries.map((entry, index) =>
      [index + 1, entry.list, entry.address, entry.timeout, entry.dynamic ? "yes" : "no", entry.comment]
        .map(csvCell)
        .join(","),
    ),
  ]
  downloadCsv(lines, filename)
}

export function routerExportFilename(deviceName: string, tab: string): string {
  const slug = deviceName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "router"
  const stamp = new Date().toISOString().slice(0, 10)
  return `${slug}-${tab}-${stamp}.csv`
}
