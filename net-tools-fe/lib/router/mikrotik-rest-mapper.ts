import type {
  RouterAddressListEntry,
  RouterFirewallRule,
  RouterInterface,
  RouterRoute,
} from "@/lib/router/router-types"
import type {
  MikrotikRestAddressList,
  MikrotikRestFirewallFilter,
  MikrotikRestFirewallNat,
  MikrotikRestInterface,
  MikrotikRestIpAddress,
  MikrotikRestRoute,
} from "@/lib/router/mikrotik-rest-types"
import { mikrotikBool, mikrotikNumber } from "@/lib/router/mikrotik-rest-types"

export function mapMikrotikRoutes(rows: MikrotikRestRoute[]): RouterRoute[] {
  return rows.map((r) => ({
    id: r[".id"],
    dstAddress: r["dst-address"],
    gateway: r.gateway || r["immediate-gw"]?.split("%")[0] || "",
    distance: mikrotikNumber(r.distance),
    scope: mikrotikNumber(r.scope),
    routingTable: r["routing-table"],
    active: mikrotikBool(r.active) && !mikrotikBool(r.inactive),
    dynamic: mikrotikBool(r.dynamic),
    comment: r.comment ?? "",
  }))
}

export function mapMikrotikInterfaces(
  rows: MikrotikRestInterface[],
  addresses: MikrotikRestIpAddress[] = [],
): RouterInterface[] {
  const ipByIface = new Map<string, string>()
  for (const addr of addresses) {
    if (!mikrotikBool(addr.disabled)) {
      ipByIface.set(addr.interface, addr.address)
    }
  }

  return rows.map((iface) => {
    const running = mikrotikBool(iface.running)
    const disabled = mikrotikBool(iface.disabled)
    return {
      id: iface[".id"],
      name: iface.name,
      type: iface.type,
      mtu: mikrotikNumber(iface["actual-mtu"] ?? iface.mtu),
      macAddress: iface["mac-address"] || "—",
      ipAddress: ipByIface.get(iface.name) ?? "—",
      status: disabled ? "disabled" : running ? "up" : "down",
      comment: iface.comment ?? "",
    }
  })
}

export function mapMikrotikFilterRules(rows: MikrotikRestFirewallFilter[]): RouterFirewallRule[] {
  return rows.map((r) => ({
    id: r[".id"],
    chain: (r.chain as RouterFirewallRule["chain"]) || "forward",
    action: (r.action as RouterFirewallRule["action"]) || "accept",
    srcAddress: r["src-address"] ?? "",
    dstAddress: r["dst-address"] ?? "",
    protocol: r.protocol ?? "",
    dstPort: r["dst-port"] ?? "",
    comment: r.comment ?? "",
    disabled: mikrotikBool(r.disabled) || mikrotikBool(r.invalid),
  }))
}

/** NAT rules reuse RouterFirewallRule shape with chain srcnat/dstnat for UI tab split later */
export function mapMikrotikNatRules(rows: MikrotikRestFirewallNat[]): RouterFirewallRule[] {
  return rows.map((r) => ({
    id: r[".id"],
    chain: r.chain === "dstnat" ? "forward" : "input",
    action: (r.action as RouterFirewallRule["action"]) || "accept",
    srcAddress: r["src-address"] ?? "",
    dstAddress: r["dst-address"] ?? r["to-addresses"] ?? "",
    protocol: r.protocol ?? "",
    dstPort: r["dst-port"] ?? r["to-ports"] ?? "",
    comment: [r.comment, r["in-interface"] && `in:${r["in-interface"]}`, r["out-interface"] && `out:${r["out-interface"]}`]
      .filter(Boolean)
      .join(" · "),
    disabled: mikrotikBool(r.disabled) || mikrotikBool(r.invalid),
  }))
}

export function mapMikrotikAddressLists(rows: MikrotikRestAddressList[]): RouterAddressListEntry[] {
  return rows.map((r) => ({
    id: r[".id"],
    list: r.list,
    address: r.address,
    timeout: r.timeout ?? "—",
    dynamic: mikrotikBool(r.dynamic),
    comment: r.comment ?? "",
  }))
}
