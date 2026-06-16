import type { DeviceCategory } from "@/lib/resource-pool/device-types-mock"
import { CATEGORY_LABELS } from "@/lib/resource-pool/device-types-mock"
import {
  buildEndpointPattern,
  defaultPortForRestScheme,
  defaultRestScheme,
  endpointSchemeFromRecord,
} from "@/lib/resource-pool/connector-endpoint"

export type ConnectorProtocol = "api" | "rest" | "snmp" | "ssh" | "netconf"

export type ConnectorAuthMethod =
  | "api_key"
  | "basic"
  | "bearer"
  | "snmp_v2c"
  | "snmp_v3"
  | "ssh_key"
  | "ssh_password"

export type PollMode = "interval" | "on_demand"

export type ConnectorStatus = "active" | "draft"

export type RouterOsVersion = "6" | "7"

export const ROUTER_OS_VERSION_LABELS: Record<RouterOsVersion, string> = {
  "6": "RouterOS 6.x (legacy API)",
  "7": "RouterOS 7+ (REST API)",
}

export interface ConnectorCapabilityOption {
  key: string
  label: string
  categories: DeviceCategory[]
}

export interface DataConnectorRecord {
  id: string
  name: string
  vendor: string
  protocol: ConnectorProtocol
  compatibleCategories: DeviceCategory[]
  capabilityKeys: string[]
  description: string
  defaultPort: number | null
  endpointPattern: string
  authMethods: ConnectorAuthMethod[]
  pollMode: PollMode
  defaultIntervalMinutes: number | null
  parserId: string
  routerOsVersion: RouterOsVersion | ""
  status: ConnectorStatus
  typeCount: number
  createdAt: string
  updatedAt: string
}

export interface DataConnectorFormData {
  name: string
  vendor: string
  protocol: ConnectorProtocol
  compatibleCategories: DeviceCategory[]
  capabilityKeys: string[]
  description: string
  defaultPort: string
  /** http | https (REST) or plain | tls (MikroTik legacy API) — drives endpointPattern */
  endpointScheme: string
  endpointPattern: string
  authMethods: ConnectorAuthMethod[]
  pollMode: PollMode
  defaultIntervalMinutes: string
  parserId: string
  routerOsVersion: RouterOsVersion | ""
  status: ConnectorStatus
}

export const PROTOCOL_LABELS: Record<ConnectorProtocol, string> = {
  api: "RouterOS / device API",
  rest: "REST API (HTTP)",
  snmp: "SNMP",
  ssh: "SSH + CLI parse",
  netconf: "NETCONF",
}

export const AUTH_METHOD_LABELS: Record<ConnectorAuthMethod, string> = {
  api_key: "API key",
  basic: "Basic auth",
  bearer: "Bearer token",
  snmp_v2c: "SNMP v2c community",
  snmp_v3: "SNMP v3 (user + auth/priv)",
  ssh_key: "SSH key (Keychain)",
  ssh_password: "SSH password",
}

export const POLL_MODE_LABELS: Record<PollMode, string> = {
  interval: "Scheduled interval",
  on_demand: "On demand / manual sync",
}

export const CONNECTOR_CAPABILITY_OPTIONS: ConnectorCapabilityOption[] = [
  { key: "security_rules", label: "Security Rules", categories: ["firewall"] },
  { key: "nat_rules", label: "NAT Rules", categories: ["firewall"] },
  { key: "address_objects", label: "Address Objects", categories: ["firewall"] },
  { key: "static_routes", label: "Static Routes", categories: ["firewall"] },
  { key: "service_objects", label: "Service Objects", categories: ["firewall"] },
  {
    key: "routing_table",
    label: "Routing Table",
    categories: ["router"],
  },
  { key: "interfaces", label: "Interfaces", categories: ["router", "switch", "firewall"] },
  {
    key: "firewall_filter",
    label: "Firewall Filter Rules",
    categories: ["router"],
  },
  {
    key: "firewall_nat",
    label: "Firewall NAT",
    categories: ["router"],
  },
  {
    key: "address_lists",
    label: "Address Lists",
    categories: ["router"],
  },
  { key: "vlans", label: "VLANs", categories: ["switch"] },
  { key: "mac_table", label: "MAC Address Table", categories: ["switch"] },
  { key: "snmp_metrics", label: "SNMP Counters / Metrics", categories: ["router", "switch"] },
]

export const initialDataConnectors: DataConnectorRecord[] = [
  {
    id: "conn-mikrotik-rest",
    name: "MikroTik RouterOS REST",
    vendor: "MikroTik",
    protocol: "rest",
    compatibleCategories: ["router"],
    capabilityKeys: ["routing_table", "interfaces", "firewall_filter", "firewall_nat", "address_lists"],
    description:
      "RouterOS v7+ REST API. Live routing table, interfaces, firewall filter/NAT, and address lists. " +
      "Endpoints: ip/route, interface, ip/firewall/filter, ip/firewall/nat, ip/firewall/address-list.",
    defaultPort: 443,
    endpointPattern: "https://{host}/rest/{resource}",
    authMethods: ["basic", "bearer"],
    pollMode: "interval",
    defaultIntervalMinutes: 5,
    parserId: "mikrotik-rest-v1",
    routerOsVersion: "7",
    status: "active",
    typeCount: 1,
    createdAt: "2026-06-10T08:00:00Z",
    updatedAt: "2026-06-16T16:00:00Z",
  },
  {
    id: "conn-mikrotik-api",
    name: "MikroTik RouterOS API",
    vendor: "MikroTik",
    protocol: "api",
    compatibleCategories: ["router"],
    capabilityKeys: ["routing_table", "interfaces", "firewall_filter", "firewall_nat", "address_lists"],
    description:
      "Legacy RouterOS API (binary protocol). Works when HTTP/REST (www) is disabled. " +
      "Default port 8728 (plain); use 8729 with TLS when certificate is configured. " +
      "Commands: /ip/route/print, /interface/print, /ip/firewall/filter/print, etc.",
    defaultPort: 8728,
    endpointPattern: "tcp://{host}:8728 · {api_command}",
    authMethods: ["basic"],
    pollMode: "interval",
    defaultIntervalMinutes: 5,
    parserId: "mikrotik-api-v1",
    routerOsVersion: "6",
    status: "active",
    typeCount: 1,
    createdAt: "2026-06-16T17:30:00Z",
    updatedAt: "2026-06-16T17:30:00Z",
  },
  {
    id: "conn-mikrotik-snmp",
    name: "MikroTik SNMP",
    vendor: "MikroTik",
    protocol: "snmp",
    compatibleCategories: ["router", "switch"],
    capabilityKeys: ["interfaces", "snmp_metrics"],
    description:
      "SNMP polling for interface status, counters, and basic telemetry. Community or SNMPv3 configured per device.",
    defaultPort: 161,
    endpointPattern: "UDP/{host}:161 · OID set mikrotik-if-mib",
    authMethods: ["snmp_v2c", "snmp_v3"],
    pollMode: "interval",
    defaultIntervalMinutes: 1,
    parserId: "mikrotik-snmp-v1",
    status: "active",
    typeCount: 0,
    createdAt: "2026-06-10T09:00:00Z",
    updatedAt: "2026-06-12T18:00:00Z",
  },
  {
    id: "conn-palo-xml-api",
    name: "Palo Alto XML API",
    vendor: "Palo Alto Networks",
    protocol: "api",
    compatibleCategories: ["firewall"],
    capabilityKeys: ["security_rules", "nat_rules", "address_objects", "static_routes", "service_objects"],
    description:
      "PAN-OS XML API for live policy and object retrieval. API key from device; no CSV required for supported datasets.",
    defaultPort: 443,
    endpointPattern: "https://{host}/api/?type=config&action=show&key={api_key}",
    authMethods: ["api_key"],
    pollMode: "interval",
    defaultIntervalMinutes: 15,
    parserId: "palo-xml-api-v1",
    status: "active",
    typeCount: 1,
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-12T17:00:00Z",
  },
  {
    id: "conn-cisco-ssh-show",
    name: "Cisco IOS SSH Show Parser",
    vendor: "Cisco",
    protocol: "ssh",
    compatibleCategories: ["router", "switch"],
    capabilityKeys: ["routing_table", "interfaces"],
    description:
      "SSH session running show commands; output parsed to structured rows. Credentials from Keychain on each device.",
    defaultPort: 22,
    endpointPattern: "ssh {user}@{host} · show ip route · show ip interface brief",
    authMethods: ["ssh_key", "ssh_password"],
    pollMode: "on_demand",
    defaultIntervalMinutes: null,
    parserId: "cisco-ios-show-v1",
    status: "active",
    typeCount: 1,
    createdAt: "2026-06-08T11:00:00Z",
    updatedAt: "2026-06-08T11:00:00Z",
  },
  {
    id: "conn-arista-eapi",
    name: "Arista EOS eAPI",
    vendor: "Arista",
    protocol: "rest",
    compatibleCategories: ["switch"],
    capabilityKeys: ["vlans", "interfaces", "mac_table"],
    description: "JSON-RPC eAPI for VLAN, interface, and MAC table collection on EOS switches.",
    defaultPort: 443,
    endpointPattern: "https://{host}/command-api",
    authMethods: ["basic"],
    pollMode: "interval",
    defaultIntervalMinutes: 10,
    parserId: "arista-eapi-v1",
    status: "draft",
    typeCount: 1,
    createdAt: "2026-06-09T12:00:00Z",
    updatedAt: "2026-06-09T12:00:00Z",
  },
]

export function capabilityLabels(keys: string[]): string {
  if (keys.length === 0) return "No datasets"
  const map = new Map(CONNECTOR_CAPABILITY_OPTIONS.map((c) => [c.key, c.label]))
  return keys.map((k) => map.get(k) ?? k).join(", ")
}

export function categoryLabels(categories: DeviceCategory[]): string {
  return categories.map((c) => CATEGORY_LABELS[c]).join(", ")
}

export function emptyConnectorForm(): DataConnectorFormData {
  const scheme = defaultRestScheme()
  return {
    name: "",
    vendor: "",
    protocol: "rest",
    compatibleCategories: ["router"],
    capabilityKeys: [],
    description: "",
    defaultPort: defaultPortForRestScheme(scheme),
    endpointScheme: scheme,
    endpointPattern: "",
    authMethods: ["basic"],
    pollMode: "interval",
    defaultIntervalMinutes: "5",
    parserId: "",
    routerOsVersion: "",
    status: "draft",
  }
}

export function formFromConnector(record: DataConnectorRecord): DataConnectorFormData {
  const base: DataConnectorFormData = {
    name: record.name,
    vendor: record.vendor,
    protocol: record.protocol,
    compatibleCategories: [...record.compatibleCategories],
    capabilityKeys: [...record.capabilityKeys],
    description: record.description,
    defaultPort: record.defaultPort != null ? String(record.defaultPort) : "",
    endpointScheme: "",
    endpointPattern: record.endpointPattern,
    authMethods: [...record.authMethods],
    pollMode: record.pollMode,
    defaultIntervalMinutes:
      record.defaultIntervalMinutes != null ? String(record.defaultIntervalMinutes) : "",
    parserId: record.parserId,
    routerOsVersion: record.routerOsVersion ?? "",
    status: record.status,
  }
  base.endpointScheme = endpointSchemeFromRecord(base)
  return base
}

export function recordFromConnectorForm(
  form: DataConnectorFormData,
  existing?: DataConnectorRecord,
): DataConnectorRecord {
  const now = new Date().toISOString()
  const port = form.defaultPort.trim() ? Number(form.defaultPort) : null
  const interval = form.defaultIntervalMinutes.trim()
    ? Number(form.defaultIntervalMinutes)
    : null

  return {
    id: existing?.id ?? `conn-${Date.now()}`,
    name: form.name.trim(),
    vendor: form.vendor.trim(),
    protocol: form.protocol,
    compatibleCategories: form.compatibleCategories,
    capabilityKeys: form.capabilityKeys,
    description: form.description.trim(),
    defaultPort: Number.isFinite(port) ? port : null,
    endpointPattern: buildEndpointPattern(form).trim(),
    authMethods: form.authMethods,
    pollMode: form.pollMode,
    defaultIntervalMinutes: form.pollMode === "interval" && Number.isFinite(interval) ? interval : null,
    parserId: form.parserId.trim() || "custom-parser",
    routerOsVersion: form.routerOsVersion || "",
    status: form.status,
    typeCount: existing?.typeCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export function summarizeConnectors(connectors: DataConnectorRecord[]) {
  const byProtocol: Record<ConnectorProtocol, number> = {
    api: 0,
    rest: 0,
    snmp: 0,
    ssh: 0,
    netconf: 0,
  }
  let active = 0
  let linkedTypes = 0

  for (const conn of connectors) {
    byProtocol[conn.protocol]++
    if (conn.status === "active") active++
    linkedTypes += conn.typeCount
  }

  return { total: connectors.length, active, byProtocol, linkedTypes }
}

export function capabilitiesForCategories(categories: DeviceCategory[]): ConnectorCapabilityOption[] {
  if (categories.length === 0) return CONNECTOR_CAPABILITY_OPTIONS
  return CONNECTOR_CAPABILITY_OPTIONS.filter((cap) =>
    cap.categories.some((cat) => categories.includes(cat)),
  )
}

export function connectorsForCategory(
  category: DeviceCategory,
  connectors: DataConnectorRecord[] = initialDataConnectors,
): DataConnectorRecord[] {
  return connectors.filter((conn) => conn.compatibleCategories.includes(category))
}

export function resolveConnectors(
  ids: string[],
  connectors: DataConnectorRecord[] = initialDataConnectors,
): DataConnectorRecord[] {
  const byId = new Map(connectors.map((conn) => [conn.id, conn]))
  return ids.map((id) => byId.get(id)).filter((conn): conn is DataConnectorRecord => Boolean(conn))
}

/** Union of capability keys offered by the selected connector templates */
export function capabilityKeysForConnectors(
  connectorIds: string[],
  connectors: DataConnectorRecord[] = initialDataConnectors,
): string[] {
  const keys = new Set<string>()
  for (const conn of resolveConnectors(connectorIds, connectors)) {
    for (const key of conn.capabilityKeys) keys.add(key)
  }
  return [...keys]
}

export function connectorSummary(
  ids: string[],
  connectors: DataConnectorRecord[] = initialDataConnectors,
): string {
  const resolved = resolveConnectors(ids, connectors)
  if (resolved.length === 0) return "No live connectors"
  return resolved.map((conn) => conn.name).join(", ")
}
