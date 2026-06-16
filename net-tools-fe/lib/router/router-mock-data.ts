import type {
  RouterAddressListEntry,
  RouterDevice,
  RouterDeviceDetailPayload,
  RouterFirewallRule,
  RouterInterface,
  RouterRoute,
} from "@/lib/router/router-types"

export const MOCK_ROUTER_DEVICES: RouterDevice[] = [
  {
    id: "router-mt-bdg-core-01",
    name: "MT-BDG-CORE-01",
    hostname: "mt-bdg-core-01.jabarprov.local",
    ip: "10.20.1.1",
    vendor: "MikroTik",
    model: "CCR2004-1G-12S+2XS",
    os: "RouterOS 7.14.2",
    status: "online",
    dataSource: "live-api",
    lastSync: "16 Jun 2026, 12:45 WIB",
    routeCount: 42,
    interfaceCount: 8,
    firewallRuleCount: 28,
    addressListCount: 15,
    routingTable: "main",
    site: "Bandung DC",
  },
  {
    id: "router-mt-jkt-edge-01",
    name: "MT-JKT-EDGE-01",
    hostname: "mt-jkt-edge-01.jabarprov.local",
    ip: "10.30.2.1",
    vendor: "MikroTik",
    model: "RB5009UG+S+IN",
    os: "RouterOS 7.12.1",
    status: "online",
    dataSource: "csv-import",
    lastSync: "15 Jun 2026, 09:20 WIB",
    routeCount: 18,
    interfaceCount: 6,
    firewallRuleCount: 12,
    addressListCount: 8,
    routingTable: "main",
    site: "Jakarta Edge",
  },
  {
    id: "router-mt-dr-isp-01",
    name: "MT-DR-ISP-01",
    hostname: "mt-dr-isp-01.jabarprov.local",
    ip: "172.16.99.1",
    vendor: "MikroTik",
    model: "CHR (x86)",
    os: "RouterOS 7.11.2",
    status: "degraded",
    dataSource: "manual",
    lastSync: "12 Jun 2026, 16:00 WIB",
    routeCount: 6,
    interfaceCount: 4,
    firewallRuleCount: 5,
    addressListCount: 3,
    routingTable: "main",
    site: "DR Site",
  },
]

const BDG_ROUTES: RouterRoute[] = [
  { id: "r1", dstAddress: "0.0.0.0/0", gateway: "103.28.40.1", distance: 1, scope: 30, routingTable: "main", active: true, dynamic: false, comment: "default via ISP-A" },
  { id: "r2", dstAddress: "10.0.0.0/8", gateway: "10.20.1.254", distance: 1, scope: 30, routingTable: "main", active: true, dynamic: false, comment: "Jabar internal" },
  { id: "r3", dstAddress: "10.20.0.0/16", gateway: "bridge-local", distance: 0, scope: 10, routingTable: "main", active: true, dynamic: true, comment: "connected" },
  { id: "r4", dstAddress: "10.20.10.0/24", gateway: "vlan-mgmt", distance: 0, scope: 10, routingTable: "main", active: true, dynamic: true, comment: "mgmt segment" },
  { id: "r5", dstAddress: "192.168.100.0/24", gateway: "10.20.1.50", distance: 10, scope: 30, routingTable: "main", active: true, dynamic: false, comment: "guest wifi" },
  { id: "r6", dstAddress: "172.16.0.0/12", gateway: "ipip-tunnel-dr", distance: 5, scope: 30, routingTable: "main", active: true, dynamic: false, comment: "DR overlay" },
]

const BDG_INTERFACES: RouterInterface[] = [
  { id: "i1", name: "ether1", type: "ether", mtu: 1500, macAddress: "48:8F:5A:12:34:01", ipAddress: "103.28.40.2/29", status: "up", comment: "ISP-A uplink" },
  { id: "i2", name: "ether2", type: "ether", mtu: 1500, macAddress: "48:8F:5A:12:34:02", ipAddress: "103.28.41.2/29", status: "up", comment: "ISP-B uplink" },
  { id: "i3", name: "bridge-local", type: "bridge", mtu: 1500, macAddress: "48:8F:5A:12:34:10", ipAddress: "10.20.1.1/24", status: "up", comment: "core LAN" },
  { id: "i4", name: "vlan-mgmt", type: "vlan", mtu: 1500, macAddress: "48:8F:5A:12:34:11", ipAddress: "10.20.10.1/24", status: "up", comment: "management VLAN" },
  { id: "i5", name: "ipip-tunnel-dr", type: "ipip", mtu: 1480, macAddress: "—", ipAddress: "172.16.99.2/30", status: "up", comment: "DR IPIP tunnel" },
  { id: "i6", name: "sfp-sfpplus1", type: "ether", mtu: 9000, macAddress: "48:8F:5A:12:34:03", ipAddress: "10.20.2.1/30", status: "up", comment: "to MT-JKT-EDGE-01" },
  { id: "i7", name: "lo", type: "loopback", mtu: 65536, macAddress: "—", ipAddress: "10.255.0.1/32", status: "up", comment: "router-id" },
  { id: "i8", name: "ether12", type: "ether", mtu: 1500, macAddress: "48:8F:5A:12:34:12", ipAddress: "—", status: "down", comment: "spare" },
]

const BDG_FIREWALL: RouterFirewallRule[] = [
  { id: "f1", chain: "input", action: "accept", srcAddress: "10.20.10.0/24", dstAddress: "", protocol: "tcp", dstPort: "22,8291", comment: "mgmt SSH & Winbox", disabled: false },
  { id: "f2", chain: "input", action: "drop", srcAddress: "0.0.0.0/0", dstAddress: "", protocol: "", dstPort: "", comment: "drop all other input", disabled: false },
  { id: "f3", chain: "forward", action: "accept", srcAddress: "10.0.0.0/8", dstAddress: "10.0.0.0/8", protocol: "", dstPort: "", comment: "intra-Jabar", disabled: false },
  { id: "f4", chain: "forward", action: "accept", srcAddress: "10.20.0.0/16", dstAddress: "0.0.0.0/0", protocol: "tcp", dstPort: "443,80", comment: "web egress", disabled: false },
  { id: "f5", chain: "forward", action: "drop", srcAddress: "192.168.100.0/24", dstAddress: "10.0.0.0/8", protocol: "", dstPort: "", comment: "guest isolation", disabled: false },
  { id: "f6", chain: "forward", action: "jump", srcAddress: "", dstAddress: "", protocol: "", dstPort: "", comment: "jump to custom chain", disabled: true },
]

const BDG_ADDRESS_LISTS: RouterAddressListEntry[] = [
  { id: "a1", list: "mgmt-allow", address: "10.20.10.0/24", timeout: "—", dynamic: false, comment: "NOC subnet" },
  { id: "a2", list: "mgmt-allow", address: "10.30.5.10/32", timeout: "—", dynamic: false, comment: "jump host" },
  { id: "a3", list: "blocked-ips", address: "203.0.113.45/32", timeout: "1d", dynamic: false, comment: "abuse report" },
  { id: "a4", list: "blocked-ips", address: "198.51.100.8/32", timeout: "6h", dynamic: true, comment: "auto-detected scanner" },
  { id: "a5", list: "vpn-clients", address: "10.99.0.0/24", timeout: "—", dynamic: false, comment: "L2TP pool" },
]

function expandRoutes(base: RouterRoute[], count: number, prefix: string): RouterRoute[] {
  const out = [...base]
  for (let i = base.length; i < count; i++) {
    out.push({
      id: `${prefix}-r${i + 1}`,
      dstAddress: `10.${20 + (i % 5)}.${i % 254}.0/24`,
      gateway: `10.20.1.${(i % 200) + 10}`,
      distance: (i % 3) + 1,
      scope: 30,
      routingTable: "main",
      active: i % 7 !== 0,
      dynamic: i % 4 === 0,
      comment: i % 4 === 0 ? "OSPF learned" : `static-${i}`,
    })
  }
  return out
}

function expandFirewall(base: RouterFirewallRule[], count: number, prefix: string): RouterFirewallRule[] {
  const chains: RouterFirewallRule["chain"][] = ["input", "forward", "output"]
  const actions: RouterFirewallRule["action"][] = ["accept", "drop", "reject"]
  const out = [...base]
  for (let i = base.length; i < count; i++) {
    out.push({
      id: `${prefix}-f${i + 1}`,
      chain: chains[i % chains.length],
      action: actions[i % actions.length],
      srcAddress: i % 2 === 0 ? "10.0.0.0/8" : "",
      dstAddress: i % 3 === 0 ? "0.0.0.0/0" : "",
      protocol: i % 2 === 0 ? "tcp" : "udp",
      dstPort: i % 2 === 0 ? "443" : "53",
      comment: `rule-${i + 1}`,
      disabled: i % 11 === 0,
    })
  }
  return out
}

function expandAddressLists(base: RouterAddressListEntry[], count: number, prefix: string): RouterAddressListEntry[] {
  const lists = ["mgmt-allow", "blocked-ips", "vpn-clients", "monitoring"]
  const out = [...base]
  for (let i = base.length; i < count; i++) {
    out.push({
      id: `${prefix}-a${i + 1}`,
      list: lists[i % lists.length],
      address: `10.${30 + (i % 10)}.${i % 255}.0/24`,
      timeout: i % 3 === 0 ? "1h" : "—",
      dynamic: i % 5 === 0,
      comment: i % 5 === 0 ? "dynamic entry" : "",
    })
  }
  return out
}

const DETAIL_BY_ID: Record<string, Omit<RouterDeviceDetailPayload, "device">> = {
  "router-mt-bdg-core-01": {
    routes: expandRoutes(BDG_ROUTES, 42, "bdg"),
    interfaces: BDG_INTERFACES,
    firewallRules: expandFirewall(BDG_FIREWALL, 28, "bdg"),
    addressLists: expandAddressLists(BDG_ADDRESS_LISTS, 15, "bdg"),
  },
  "router-mt-jkt-edge-01": {
    routes: expandRoutes(BDG_ROUTES.slice(0, 4), 18, "jkt"),
    interfaces: BDG_INTERFACES.slice(0, 6),
    firewallRules: expandFirewall(BDG_FIREWALL.slice(0, 4), 12, "jkt"),
    addressLists: expandAddressLists(BDG_ADDRESS_LISTS.slice(0, 3), 8, "jkt"),
  },
  "router-mt-dr-isp-01": {
    routes: expandRoutes(BDG_ROUTES.slice(0, 2), 6, "dr"),
    interfaces: BDG_INTERFACES.slice(0, 4),
    firewallRules: expandFirewall(BDG_FIREWALL.slice(0, 2), 5, "dr"),
    addressLists: expandAddressLists(BDG_ADDRESS_LISTS.slice(0, 2), 3, "dr"),
  },
}

export function getMockRouterDeviceDetail(id: string): RouterDeviceDetailPayload | null {
  const device = MOCK_ROUTER_DEVICES.find((d) => d.id === id)
  const detail = DETAIL_BY_ID[id]
  if (!device || !detail) return null
  return { device, ...detail }
}

export function getMockRouterDevices(): RouterDevice[] {
  return MOCK_ROUTER_DEVICES
}
