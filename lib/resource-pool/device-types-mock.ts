export type DeviceCategory = "firewall" | "router" | "switch"

export type ImportKind = "csv" | "script_csv" | "api"

export interface CapabilityDefinition {
  key: string
  label: string
  description: string
  importKind: ImportKind
  fileHint: string
  defaultEnabled: boolean
}

export interface DeviceTypeCapability {
  key: string
  label: string
  description: string
  importKind: ImportKind
  fileHint: string
  enabled: boolean
}

export interface DeviceTypeRecord {
  id: string
  name: string
  vendor: string
  category: DeviceCategory
  description: string
  capabilities: DeviceTypeCapability[]
  connectorIds: string[]
  deviceCount: number
  createdAt: string
  updatedAt: string
}

export interface DeviceTypeFormData {
  name: string
  vendor: string
  category: DeviceCategory
  description: string
  enabledCapabilityKeys: string[]
  enabledConnectorIds: string[]
}

export const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  firewall: "Firewall",
  router: "Router",
  switch: "Switch",
}

export const IMPORT_KIND_LABELS: Record<ImportKind, string> = {
  csv: "CSV import",
  script_csv: "Browser script → CSV",
  api: "Live API",
}

const FIREWALL_CAPABILITIES: CapabilityDefinition[] = [
  {
    key: "security_rules",
    label: "Security Rules",
    description: "Policy security rulebase export from Palo Alto Web UI or API.",
    importKind: "csv",
    fileHint: "export_policies_security_rulebase_*.csv",
    defaultEnabled: true,
  },
  {
    key: "nat_rules",
    label: "NAT Rules",
    description: "NAT policy rulebase — source, destination, and static NAT translations.",
    importKind: "csv",
    fileHint: "export_policies_nat_rulebase_*.csv",
    defaultEnabled: true,
  },
  {
    key: "address_objects",
    label: "Address Objects",
    description: "Address object export used by routes, NAT, and security policies.",
    importKind: "csv",
    fileHint: "export_objects_addresses_*.csv",
    defaultEnabled: true,
  },
  {
    key: "static_routes",
    label: "Static Routes",
    description: "Virtual router static routes — CSV from browser console script or manual export.",
    importKind: "script_csv",
    fileHint: "export-static-routes-browser-console-v2.js → latest-static-route-*.csv",
    defaultEnabled: true,
  },
  {
    key: "service_objects",
    label: "Service Objects",
    description: "Custom service and service group definitions.",
    importKind: "csv",
    fileHint: "export_objects_services_*.csv",
    defaultEnabled: true,
  },
]

const ROUTER_CAPABILITIES: CapabilityDefinition[] = [
  {
    key: "routing_table",
    label: "Routing Table",
    description: "IPv4/IPv6 routes — static and connected.",
    importKind: "csv",
    fileHint: "show ip route export or vendor CSV",
    defaultEnabled: true,
  },
  {
    key: "interfaces",
    label: "Interfaces",
    description: "Interface inventory with IP, VLAN, and status.",
    importKind: "csv",
    fileHint: "show interfaces brief export",
    defaultEnabled: true,
  },
  {
    key: "acl_rules",
    label: "ACL / Policy",
    description: "Access control lists or routing policy maps.",
    importKind: "csv",
    fileHint: "Vendor-specific ACL export",
    defaultEnabled: false,
  },
]

const SWITCH_CAPABILITIES: CapabilityDefinition[] = [
  {
    key: "vlans",
    label: "VLANs",
    description: "VLAN database and port assignments.",
    importKind: "csv",
    fileHint: "show vlan brief export",
    defaultEnabled: true,
  },
  {
    key: "interfaces",
    label: "Interfaces",
    description: "Switchport mode, trunk, and access VLAN mapping.",
    importKind: "csv",
    fileHint: "show interfaces status export",
    defaultEnabled: true,
  },
  {
    key: "mac_table",
    label: "MAC Address Table",
    description: "Learned MAC addresses per port.",
    importKind: "csv",
    fileHint: "show mac address-table export",
    defaultEnabled: false,
  },
]

export const CAPABILITY_CATALOG: Record<DeviceCategory, CapabilityDefinition[]> = {
  firewall: FIREWALL_CAPABILITIES,
  router: ROUTER_CAPABILITIES,
  switch: SWITCH_CAPABILITIES,
}

function buildCapabilities(
  category: DeviceCategory,
  enabledKeys: string[],
): DeviceTypeCapability[] {
  return CAPABILITY_CATALOG[category].map((def) => ({
    key: def.key,
    label: def.label,
    description: def.description,
    importKind: def.importKind,
    fileHint: def.fileHint,
    enabled: enabledKeys.includes(def.key),
  }))
}

function defaultEnabledKeys(category: DeviceCategory): string[] {
  return CAPABILITY_CATALOG[category]
    .filter((def) => def.defaultEnabled)
    .map((def) => def.key)
}

export const initialDeviceTypes: DeviceTypeRecord[] = [
  {
    id: "dt-palo-alto-fw",
    name: "Palo Alto Networks Firewall",
    vendor: "Palo Alto Networks",
    category: "firewall",
    description:
      "PA-OS firewalls (PA-3200, PA-5200, VM-Series). Data via CSV export or browser script for static routes.",
    capabilities: buildCapabilities("firewall", [
      "security_rules",
      "nat_rules",
      "address_objects",
      "static_routes",
      "service_objects",
    ]),
    connectorIds: ["conn-palo-xml-api"],
    deviceCount: 2,
    createdAt: "2026-06-01T08:00:00Z",
    updatedAt: "2026-06-12T17:30:00Z",
  },
  {
    id: "dt-fortinet-fw",
    name: "Fortinet FortiGate",
    vendor: "Fortinet",
    category: "firewall",
    description: "FortiGate physical and VM appliances. CSV import from configuration backup exports.",
    capabilities: buildCapabilities("firewall", ["security_rules", "nat_rules", "address_objects"]),
    connectorIds: [],
    deviceCount: 1,
    createdAt: "2026-06-05T10:00:00Z",
    updatedAt: "2026-06-10T14:00:00Z",
  },
  {
    id: "dt-cisco-ios-router",
    name: "Cisco IOS / IOS-XE Router",
    vendor: "Cisco",
    category: "router",
    description: "Branch and core routers. Routing table and interface exports from show commands.",
    capabilities: buildCapabilities("router", ["routing_table", "interfaces"]),
    connectorIds: ["conn-cisco-ssh-show"],
    deviceCount: 0,
    createdAt: "2026-06-08T09:00:00Z",
    updatedAt: "2026-06-08T09:00:00Z",
  },
  {
    id: "dt-arista-switch",
    name: "Arista EOS Switch",
    vendor: "Arista",
    category: "switch",
    description: "Data center and campus switches. VLAN and interface CSV from EOS CLI exports.",
    capabilities: buildCapabilities("switch", ["vlans", "interfaces"]),
    connectorIds: ["conn-arista-eapi"],
    deviceCount: 0,
    createdAt: "2026-06-09T11:00:00Z",
    updatedAt: "2026-06-09T11:00:00Z",
  },
]

export function enabledCapabilities(type: DeviceTypeRecord): DeviceTypeCapability[] {
  return type.capabilities.filter((cap) => cap.enabled)
}

export function defaultDeviceDatasetKeys(type: DeviceTypeRecord): string[] {
  return enabledCapabilities(type).map((cap) => cap.key)
}

export function deviceTypesForCategory(
  category: DeviceCategory,
  types: DeviceTypeRecord[] = initialDeviceTypes,
): DeviceTypeRecord[] {
  return types.filter((type) => type.category === category)
}

export function findDeviceType(
  id: string,
  types: DeviceTypeRecord[] = initialDeviceTypes,
): DeviceTypeRecord | undefined {
  return types.find((type) => type.id === id)
}

export function capabilitySummary(type: DeviceTypeRecord): string {
  const enabled = enabledCapabilities(type)
  if (enabled.length === 0) return "No datasets"
  return enabled.map((cap) => cap.label).join(", ")
}

export function formFromDeviceType(type: DeviceTypeRecord): DeviceTypeFormData {
  return {
    name: type.name,
    vendor: type.vendor,
    category: type.category,
    description: type.description,
    enabledCapabilityKeys: type.capabilities.filter((c) => c.enabled).map((c) => c.key),
    enabledConnectorIds: [...type.connectorIds],
  }
}

export function emptyDeviceTypeForm(category: DeviceCategory = "firewall"): DeviceTypeFormData {
  return {
    name: "",
    vendor: "",
    category,
    description: "",
    enabledCapabilityKeys: defaultEnabledKeys(category),
    enabledConnectorIds: [],
  }
}

export function recordFromForm(
  form: DeviceTypeFormData,
  existing?: DeviceTypeRecord,
): DeviceTypeRecord {
  const now = new Date().toISOString()
  return {
    id: existing?.id ?? `dt-${Date.now()}`,
    name: form.name.trim(),
    vendor: form.vendor.trim(),
    category: form.category,
    description: form.description.trim(),
    capabilities: buildCapabilities(form.category, form.enabledCapabilityKeys),
    connectorIds: [...form.enabledConnectorIds],
    deviceCount: existing?.deviceCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export function summarizeDeviceTypes(types: DeviceTypeRecord[]) {
  const byCategory = { firewall: 0, router: 0, switch: 0 }
  let totalCapabilities = 0
  let totalDevices = 0

  for (const type of types) {
    byCategory[type.category]++
    totalCapabilities += enabledCapabilities(type).length
    totalDevices += type.deviceCount
  }

  return {
    total: types.length,
    byCategory,
    totalCapabilities,
    totalDevices,
  }
}
