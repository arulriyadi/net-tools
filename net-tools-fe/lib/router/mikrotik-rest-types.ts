/**
 * MikroTik RouterOS REST response shapes (lab-verified on ROS 7.12.1).
 *
 * GET http://{host}/rest/{resource}  — Basic auth
 * Returns JSON array; scalar fields are strings (e.g. "true", "5").
 *
 * @see lib/resource-pool/mikrotik-dataset-api.ts — resource paths
 */

/** RouterOS internal row id, e.g. "*80000004" */
export type MikrotikRowId = string

/** RouterOS REST encodes booleans and numbers as strings */
export type MikrotikBool = "true" | "false" | string
export type MikrotikNumber = string

export interface MikrotikRestRoute {
  ".id": MikrotikRowId
  "dst-address": string
  gateway: string
  distance: MikrotikNumber
  scope: MikrotikNumber
  "target-scope"?: MikrotikNumber
  "routing-table": string
  active?: MikrotikBool
  inactive?: MikrotikBool
  dynamic?: MikrotikBool
  static?: MikrotikBool
  connect?: MikrotikBool
  comment?: string
  "immediate-gw"?: string
  "local-address"?: string
  "pref-src"?: string
  ecmp?: MikrotikBool
  "hw-offloaded"?: MikrotikBool
  "suppress-hw-offload"?: MikrotikBool
}

export interface MikrotikRestInterface {
  ".id": MikrotikRowId
  name: string
  type: string
  mtu: MikrotikNumber
  "actual-mtu"?: MikrotikNumber
  "mac-address": string
  running: MikrotikBool
  disabled: MikrotikBool
  "default-name"?: string
  comment?: string
  /** Counters present on live poll — optional for UI */
  "rx-byte"?: MikrotikNumber
  "tx-byte"?: MikrotikNumber
}

/** Join with GET /rest/ip/address where interface=name */
export interface MikrotikRestIpAddress {
  ".id": MikrotikRowId
  address: string
  interface: string
  network?: string
  disabled?: MikrotikBool
  dynamic?: MikrotikBool
}

export interface MikrotikRestFirewallFilter {
  ".id": MikrotikRowId
  chain: "input" | "forward" | "output" | string
  action: string
  "src-address"?: string
  "dst-address"?: string
  protocol?: string
  "dst-port"?: string
  "src-port"?: string
  comment?: string
  disabled?: MikrotikBool
  invalid?: MikrotikBool
  dynamic?: MikrotikBool
  bytes?: MikrotikNumber
  packets?: MikrotikNumber
}

export interface MikrotikRestFirewallNat {
  ".id": MikrotikRowId
  chain: "srcnat" | "dstnat" | string
  action: string
  "src-address"?: string
  "dst-address"?: string
  protocol?: string
  "dst-port"?: string
  "to-addresses"?: string
  "to-ports"?: string
  "in-interface"?: string
  "out-interface"?: string
  comment?: string
  disabled?: MikrotikBool
  invalid?: MikrotikBool
  dynamic?: MikrotikBool
  bytes?: MikrotikNumber
  packets?: MikrotikNumber
}

export interface MikrotikRestAddressList {
  ".id": MikrotikRowId
  list: string
  address: string
  timeout?: string
  dynamic?: MikrotikBool
  disabled?: MikrotikBool
  comment?: string
  "creation-time"?: string
}

export function mikrotikBool(value: MikrotikBool | boolean | undefined): boolean {
  if (typeof value === "boolean") return value
  return value === "true"
}

export function mikrotikNumber(
  value: MikrotikNumber | number | undefined,
  fallback = 0,
): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback
  if (value == null || value === "") return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}
