import type {
  DnsDevice,
  DnsDeviceDetailPayload,
  DnsQueryLog,
  DnsRecord,
  DnsResolverStats,
  DnsZone,
} from "@/lib/dns/dns-types"

export const MOCK_DNS_DEVICES: DnsDevice[] = [
  {
    id: "dns-server-dev",
    name: "server-dev",
    hostname: "server-dev",
    ip: "172.32.1.228",
    vendor: "Technitium",
    product: "DNS Server",
    version: "15.2",
    status: "online",
    dataSource: "live-api",
    lastSync: "16 Jun 2026, 18:30 WIB",
    zoneCount: 8,
    recordCount: 64,
    roles: ["nginx-ui", "dns"],
    site: "Lab VM",
  },
  {
    id: "dns-jabar-primary",
    name: "DNS-JABAR-PRIMARY",
    hostname: "dns-primary.jabarprov.local",
    ip: "10.10.50.10",
    vendor: "Technitium",
    product: "DNS Server",
    version: "15.1",
    status: "online",
    dataSource: "live-api",
    lastSync: "16 Jun 2026, 14:00 WIB",
    zoneCount: 42,
    recordCount: 1280,
    roles: ["dns"],
    site: "Bandung DC",
  },
  {
    id: "dns-dr-secondary",
    name: "DNS-DR-SECONDARY",
    hostname: "dns-dr.jabarprov.local",
    ip: "172.16.99.53",
    vendor: "Technitium",
    product: "DNS Server",
    version: "14.3",
    status: "degraded",
    dataSource: "manual",
    lastSync: "12 Jun 2026, 09:15 WIB",
    zoneCount: 18,
    recordCount: 320,
    roles: ["dns"],
    site: "DR Site",
  },
]

const LAB_ZONES: DnsZone[] = [
  {
    id: "z1",
    name: "jabarprov.go.id",
    type: "primary",
    status: "active",
    recordCount: 24,
    primaryNs: "ns1.jabarprov.go.id",
    serial: 2026061601,
    lastModified: "2026-06-16 10:00",
    ttl: 3600,
    dnssecStatus: "Unsigned",
    disabled: false,
    comment: "net-tools: primary gov zone",
  },
  {
    id: "z2",
    name: "internal.jabar.local",
    type: "primary",
    status: "active",
    recordCount: 18,
    primaryNs: "dns-primary.jabarprov.local",
    serial: 2026061503,
    lastModified: "2026-06-15 22:30",
    ttl: 1800,
    dnssecStatus: "Unsigned",
    disabled: false,
    comment: "Internal services",
  },
  {
    id: "z3",
    name: "dev.jabar.local",
    type: "primary",
    status: "active",
    recordCount: 12,
    primaryNs: "server-dev",
    serial: 2026061401,
    lastModified: "2026-06-14 16:00",
    ttl: 300,
    dnssecStatus: "Unsigned",
    disabled: false,
    comment: "Lab / dev hosts",
  },
  {
    id: "z4",
    name: "staging.jabarprov.go.id",
    type: "secondary",
    status: "syncing",
    recordCount: 8,
    primaryNs: "ns1.jabarprov.go.id",
    serial: 2026061601,
    lastModified: "2026-06-16 18:25",
    ttl: 3600,
    dnssecStatus: "Unsigned",
    disabled: false,
    comment: "Secondary from primary",
  },
  {
    id: "z5",
    name: "legacy.local",
    type: "primary",
    status: "inactive",
    recordCount: 6,
    primaryNs: "ns1.legacy.local",
    serial: 2024010101,
    lastModified: "2024-01-01 00:00",
    ttl: 86400,
    dnssecStatus: "Unsigned",
    disabled: true,
    comment: "Deprecated — do not use",
  },
  {
    id: "z6",
    name: "forward-public",
    type: "forwarder",
    status: "active",
    recordCount: 0,
    primaryNs: "8.8.8.8",
    serial: 0,
    lastModified: "2026-06-10 08:00",
    ttl: 0,
    dnssecStatus: "Unsigned",
    disabled: false,
    comment: "Conditional forwarder",
  },
]

const LAB_RECORDS: DnsRecord[] = [
  { id: "r1", name: "jabarprov.go.id", type: "A", value: "103.28.40.10", ttl: 3600, zone: "jabarprov.go.id", status: "active", lastModified: "2026-06-16 10:00", disabled: false },
  { id: "r2", name: "www.jabarprov.go.id", type: "CNAME", value: "jabarprov.go.id", ttl: 3600, zone: "jabarprov.go.id", status: "active", lastModified: "2026-06-16 10:00", disabled: false },
  { id: "r3", name: "mail.jabarprov.go.id", type: "MX", value: "10 mail.jabarprov.go.id", ttl: 3600, zone: "jabarprov.go.id", status: "active", lastModified: "2026-06-15 14:00", disabled: false },
  { id: "r4", name: "_dmarc.jabarprov.go.id", type: "TXT", value: "v=DMARC1; p=quarantine", ttl: 3600, zone: "jabarprov.go.id", status: "active", lastModified: "2026-06-10 09:00", disabled: false },
  { id: "r5", name: "api.dev.jabar.local", type: "A", value: "172.32.1.228", ttl: 300, zone: "dev.jabar.local", status: "active", lastModified: "2026-06-16 18:00", disabled: false },
  { id: "r6", name: "net-tools.dev.jabar.local", type: "A", value: "192.168.139.166", ttl: 300, zone: "dev.jabar.local", status: "active", lastModified: "2026-06-16 17:30", disabled: false },
  { id: "r7", name: "db.internal.jabar.local", type: "A", value: "10.10.20.50", ttl: 1800, zone: "internal.jabar.local", status: "active", lastModified: "2026-06-14 11:00", disabled: false },
  { id: "r8", name: "dns.internal.jabar.local", type: "A", value: "10.10.50.10", ttl: 1800, zone: "internal.jabar.local", status: "active", lastModified: "2026-06-14 11:00", disabled: false },
  { id: "r9", name: "broken.internal.jabar.local", type: "A", value: "10.10.99.1", ttl: 1800, zone: "internal.jabar.local", status: "error", lastModified: "2026-06-16 08:00", disabled: false },
  { id: "r10", name: "staging.jabarprov.go.id", type: "A", value: "10.10.80.20", ttl: 3600, zone: "staging.jabarprov.go.id", status: "pending", lastModified: "2026-06-16 18:25", disabled: false },
]

const LAB_RESOLVER: DnsResolverStats = {
  period: "Last hour",
  totalQueries: 18420,
  allowedQueries: 17650,
  blockedQueries: 770,
  cachedEntries: 6330,
  avgResponseMs: 4.2,
  topDomains: [
    { name: "jabarprov.go.id", hits: 1240 },
    { name: "google.com", hits: 890 },
    { name: "github.com", hits: 620 },
    { name: "api.dev.jabar.local", hits: 410 },
    { name: "ads.example.net", hits: 380 },
  ],
  topClients: [
    { name: "10.10.0.15", hits: 2100 },
    { name: "172.28.1.100", hits: 980 },
    { name: "192.168.139.166", hits: 740 },
    { name: "10.20.1.50", hits: 520 },
  ],
  recentQueries: [
    { id: "q1", domain: "jabarprov.go.id", type: "A", result: "103.28.40.10", responseTimeMs: 2, status: "success", timestamp: "2026-06-16 18:30:12", client: "10.10.0.15" },
    { id: "q2", domain: "api.dev.jabar.local", type: "A", result: "172.32.1.228", responseTimeMs: 1, status: "success", timestamp: "2026-06-16 18:30:08", client: "192.168.139.166" },
    { id: "q3", domain: "malware.test", type: "A", result: "Blocked", responseTimeMs: 0, status: "blocked", timestamp: "2026-06-16 18:29:55", client: "10.20.1.50" },
    { id: "q4", domain: "unknown.invalid", type: "A", result: "NXDOMAIN", responseTimeMs: 18, status: "error", timestamp: "2026-06-16 18:29:40", client: "172.28.1.100" },
  ],
}

function scaleRecords(base: DnsRecord[], prefix: string, count: number): DnsRecord[] {
  if (count <= base.length) return base.slice(0, count)
  const out = [...base]
  for (let i = base.length; i < count; i++) {
    out.push({
      ...base[i % base.length],
      id: `${prefix}-r${i + 1}`,
      name: `host-${i + 1}.internal.jabar.local`,
    })
  }
  return out
}

function buildDetail(device: DnsDevice): DnsDeviceDetailPayload {
  if (device.id === "dns-server-dev") {
    return { device, zones: LAB_ZONES, records: LAB_RECORDS, resolverStats: LAB_RESOLVER }
  }

  if (device.id === "dns-jabar-primary") {
    const zones = LAB_ZONES.map((z, i) => ({
      ...z,
      id: `p-z${i}`,
      recordCount: z.recordCount * 3,
      name: i === 0 ? z.name : `${z.name.replace(".local", "")}.prod.jabar.local`,
    }))
    return {
      device,
      zones,
      records: scaleRecords(LAB_RECORDS, "p", 48),
      resolverStats: {
        ...LAB_RESOLVER,
        totalQueries: 842000,
        blockedQueries: 12400,
        cachedEntries: 42000,
      },
    }
  }

  return {
    device,
    zones: LAB_ZONES.slice(0, 4).map((z, i) => ({ ...z, id: `d-z${i}`, status: i === 3 ? "inactive" : z.status })),
    records: LAB_RECORDS.slice(0, 6),
    resolverStats: { ...LAB_RESOLVER, totalQueries: 2100, blockedQueries: 45, cachedEntries: 890 },
  }
}

const DETAIL_BY_ID = Object.fromEntries(MOCK_DNS_DEVICES.map((d) => [d.id, buildDetail(d)]))

export function getMockDnsDeviceDetail(deviceId: string): DnsDeviceDetailPayload | null {
  return DETAIL_BY_ID[deviceId] ?? null
}

export function getMockDnsDevices(): DnsDevice[] {
  return MOCK_DNS_DEVICES
}
