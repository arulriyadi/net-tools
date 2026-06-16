/**
 * MikroTik RouterOS dataset → API/REST mapping.
 *
 * REST (v7+, recommended): GET http(s)://{host}/rest/{restResource}
 *   - Auth: HTTP Basic (device user/password)
 *   - Response: JSON array of objects; booleans/numbers are strings ("true", "5")
 *   - Lab: HTTP :80 (www) works; HTTPS :443 needs valid cert or self-signed trust
 *
 * Legacy API: command word e.g. /ip/route/print (TCP 8728/8729)
 *
 * @see https://help.mikrotik.com/docs/spaces/ROS/pages/47579160/API
 * @see lib/router/mikrotik-rest-types.ts — verified response shapes
 */

export interface MikrotikDatasetRef {
  key: string
  label: string
  restResource: string
  apiPath: string
  apiCommand: string
  description: string
  companionRestResource?: string
  companionApiPath?: string
}

export const MIKROTIK_DATASET_REFS: MikrotikDatasetRef[] = [
  {
    key: "routing_table",
    label: "Routing Table",
    restResource: "ip/route",
    apiPath: "ip/route",
    apiCommand: "/ip/route/print",
    description:
      "Full routing table — static, dynamic, connected, and gateway routes (replaces separate static-route export).",
  },
  {
    key: "interfaces",
    label: "Interfaces",
    restResource: "interface",
    apiPath: "interface",
    apiCommand: "/interface/print",
    companionRestResource: "ip/address",
    companionApiPath: "ip/address",
    description: "Physical and logical interfaces; join ip/address for L3 bindings.",
  },
  {
    key: "firewall_filter",
    label: "Firewall Filter Rules",
    restResource: "ip/firewall/filter",
    apiPath: "ip/firewall/filter",
    apiCommand: "/ip/firewall/filter/print",
    description: "Filter chains (input / forward / output) — includes policy-style allow/drop rules.",
  },
  {
    key: "firewall_nat",
    label: "Firewall NAT",
    restResource: "ip/firewall/nat",
    apiPath: "ip/firewall/nat",
    apiCommand: "/ip/firewall/nat/print",
    description: "NAT rules — srcnat, dstnat, masquerade, netmap, and related translations.",
  },
  {
    key: "address_lists",
    label: "Address Lists",
    restResource: "ip/firewall/address-list",
    apiPath: "ip/firewall/address-list",
    apiCommand: "/ip/firewall/address-list/print",
    description: "Named address lists referenced by firewall filter and NAT rules.",
  },
]

const BY_KEY = new Map(MIKROTIK_DATASET_REFS.map((ref) => [ref.key, ref]))

export function mikrotikDatasetRef(key: string): MikrotikDatasetRef | undefined {
  return BY_KEY.get(key)
}

/** REST path segment for https://{host}/rest/{resource} */
export function mikrotikRestResource(key: string): string | undefined {
  return BY_KEY.get(key)?.restResource
}

export function mikrotikApiCommand(key: string): string | undefined {
  return BY_KEY.get(key)?.apiCommand
}

export function mikrotikRestUrlPattern(key: string): string | undefined {
  const resource = mikrotikRestResource(key)
  return resource ? `https://{host}/rest/${resource}` : undefined
}

export function mikrotikLegacyUrlPattern(key: string): string | undefined {
  const ref = BY_KEY.get(key)
  if (!ref) return undefined
  return `tcp://{host}:8728 · ${ref.apiCommand}`
}

export function mikrotikRestHint(key: string): string {
  const ref = BY_KEY.get(key)
  if (!ref) return ""
  return `REST GET /rest/${ref.restResource}`
}

export function mikrotikLegacyHint(key: string): string {
  const ref = BY_KEY.get(key)
  if (!ref) return ""
  return `API ${ref.apiCommand} (8728/8729)`
}

/** @deprecated use mikrotikRestHint or mikrotikLegacyHint */
export function mikrotikFileHint(key: string): string {
  return `${mikrotikRestHint(key)} · ${mikrotikLegacyHint(key)}`
}

export function mikrotikConnectorHint(
  key: string,
  protocol: "rest" | "api",
): string {
  return protocol === "rest" ? mikrotikRestHint(key) : mikrotikLegacyHint(key)
}
