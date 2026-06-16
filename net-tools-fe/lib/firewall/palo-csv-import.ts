import type {
  AddressKind,
  AddressObject,
  AddressObjectType,
  NatRule,
  NatType,
  NetworkCategory,
  RuleAction,
  SecurityRule,
  ServiceObject,
  StaticRoute,
} from "@/lib/firewall/firewall-types"

export type PaloDatasetKey =
  | "security_rules"
  | "nat_rules"
  | "address_objects"
  | "static_routes"
  | "service_objects"

export interface PaloCsvImportResult {
  rows: SecurityRule[] | NatRule[] | StaticRoute[] | AddressObject[] | ServiceObject[]
  count: number
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let i = 0
  let field = ""
  let row: string[] = []
  let inQuotes = false

  while (i < text.length) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ",") {
      row.push(field)
      field = ""
      i++
      continue
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      field = ""
      if (row.length > 1 || row[0] !== "") rows.push(row)
      row = []
      i++
      continue
    }
    field += c
    i++
  }

  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function normHeader(text: string): string {
  return String(text || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function buildHeaderMap(headerRow: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  headerRow.forEach((cell, index) => {
    map[normHeader(cell)] = index
  })
  return map
}

function pick(row: string[], map: Record<string, number>, ...names: string[]): string {
  for (const name of names) {
    const idx = map[name]
    if (idx != null) return (row[idx] ?? "").trim()
  }
  return ""
}

function stripDisabled(value: string): string {
  return value.replace(/^\[Disabled\]\s*/g, "").trim()
}

function rowDisabled(values: string[]): boolean {
  return values.some((value) => /^\[Disabled\]/i.test(value))
}

function mapAction(action: string): RuleAction {
  const normalized = stripDisabled(action).toLowerCase()
  if (normalized.includes("deny")) return "deny"
  if (normalized.includes("drop")) return "drop"
  return "allow"
}

function inferNatType(srcTrans: string, dstTrans: string, tags: string): NatType {
  const src = stripDisabled(srcTrans).toLowerCase()
  const dst = stripDisabled(dstTrans).toLowerCase()
  if (src !== "none" && dst !== "none" && dst !== "") return "static"
  if (dst.includes("destination-translation") || dst.includes("dynamic-destination-translation")) {
    return "destination"
  }
  if (src !== "none" && src !== "") return "source"
  if (dst !== "none" && dst !== "") return "destination"
  const tagLower = stripDisabled(tags).toLowerCase()
  if (tagLower.includes("inbound")) return "destination"
  if (tagLower.includes("outbound")) return "source"
  return "source"
}

function parseCidr(value: string): string | null {
  let s = (value || "").trim()
  if (!s) return null
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(s)) s += "/32"
  return /^\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2}$/.test(s) ? s : null
}

function destKind(destination: string): "cidr" | "object" {
  return parseCidr(destination) ? "cidr" : "object"
}

function addressKind(addr: string, typ: string): AddressKind {
  const address = (addr || "").trim()
  const type = (typ || "").trim().toLowerCase()
  if (type.includes("fqdn") || (/^[a-zA-Z]/.test(address) && !/^\d/.test(address))) return "fqdn"
  if (type.includes("range")) return "range"
  if (type.includes("wildcard")) return "wildcard"
  if (address.includes("/")) return /^\d/.test(address) ? "cidr" : "host"
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(address)) return "host"
  return "host"
}

function networkCategory(addr: string): NetworkCategory {
  const address = (addr || "").trim()
  if (!address || /^[a-zA-Z]/.test(address)) return "other"
  const match = address.match(/^(\d{1,3})\.(\d{1,3})/)
  if (!match) return "other"
  const a = Number(match[1])
  const b = Number(match[2])
  if (a === 10) return "10-private"
  if (a === 172 && b >= 16 && b <= 31) return "172-private"
  if (a === 192 && b === 168) return "192-private"
  if (a === 169 && b === 254) return "link-local"
  return "public"
}

function parseSecurityRules(csvText: string): SecurityRule[] {
  const rows = parseCsv(csvText)
  if (rows.length < 2) return []
  const headerMap = buildHeaderMap(rows[0])
  const out: SecurityRule[] = []

  for (let idx = 1; idx < rows.length; idx++) {
    const row = rows[idx]
    if (row.length < 5) continue
    const name = stripDisabled(pick(row, headerMap, "name"))
    if (!name) continue
    const enabled = !rowDisabled([pick(row, headerMap, "name"), pick(row, headerMap, "action")])
    const hitRaw = stripDisabled(pick(row, headerMap, "rule usage hit count"))
    const hitCount = Number(hitRaw.replace(/,/g, "")) || 0
    const options = stripDisabled(pick(row, headerMap, "options")).toLowerCase()

    out.push({
      id: `sec-${idx}`,
      name,
      srcZone: stripDisabled(pick(row, headerMap, "source zone")),
      srcAddr: stripDisabled(pick(row, headerMap, "source address")),
      dstZone: stripDisabled(pick(row, headerMap, "destination zone")),
      dstAddr: stripDisabled(pick(row, headerMap, "destination address")),
      service: stripDisabled(pick(row, headerMap, "service")),
      application: stripDisabled(pick(row, headerMap, "application")),
      action: mapAction(pick(row, headerMap, "action")),
      log: options.includes("log"),
      hitCount,
      enabled,
    })
  }
  return out
}

function parseNatRules(csvText: string): NatRule[] {
  const rows = parseCsv(csvText)
  if (rows.length < 2) return []
  const headerMap = buildHeaderMap(rows[0])
  const out: NatRule[] = []

  for (let idx = 1; idx < rows.length; idx++) {
    const row = rows[idx]
    if (row.length < 5) continue
    const name = stripDisabled(pick(row, headerMap, "name"))
    if (!name) continue
    const srcTrans = pick(row, headerMap, "translated packet source translation")
    const dstTrans = pick(row, headerMap, "translated packet destination translation")
    const tags = pick(row, headerMap, "tags")

    out.push({
      id: `nat-${idx}`,
      name,
      type: inferNatType(srcTrans, dstTrans, tags),
      srcZone: stripDisabled(
        pick(row, headerMap, "original packet source zone", "source zone"),
      ),
      dstZone: stripDisabled(
        pick(row, headerMap, "original packet destination zone", "destination zone"),
      ),
      origSrc: stripDisabled(
        pick(row, headerMap, "original packet source address", "source address"),
      ),
      origDst: stripDisabled(
        pick(row, headerMap, "original packet destination address", "destination address"),
      ),
      service: stripDisabled(
        pick(row, headerMap, "original packet service", "service"),
      ),
      translatedSrc: stripDisabled(srcTrans) || "—",
      translatedDst: stripDisabled(dstTrans) || "—",
      enabled: !rowDisabled([pick(row, headerMap, "name")]),
    })
  }
  return out
}

function parseAddressObjects(csvText: string): AddressObject[] {
  const rows = parseCsv(csvText)
  if (rows.length < 2) return []
  const headerMap = buildHeaderMap(rows[0])
  const out: AddressObject[] = []

  for (let idx = 1; idx < rows.length; idx++) {
    const row = rows[idx]
    if (row.length < 2) continue
    const name = pick(row, headerMap, "name")
    if (!name) continue
    const typeRaw = pick(row, headerMap, "type") as AddressObjectType
    const address = pick(row, headerMap, "address")

    out.push({
      id: `obj-${idx}`,
      name,
      location: pick(row, headerMap, "location"),
      type: typeRaw || "IP Netmask",
      address,
      addrKind: addressKind(address, typeRaw),
      networkCat: networkCategory(address),
      tags: pick(row, headerMap, "tags"),
    })
  }
  return out
}

function parseServiceObjects(csvText: string): ServiceObject[] {
  const rows = parseCsv(csvText)
  if (rows.length < 2) return []
  const headerMap = buildHeaderMap(rows[0])
  const out: ServiceObject[] = []

  for (let idx = 1; idx < rows.length; idx++) {
    const row = rows[idx]
    if (row.length < 2) continue
    const name = pick(row, headerMap, "name")
    if (!name) continue
    const location = pick(row, headerMap, "location")

    out.push({
      id: `svc-${idx}`,
      name,
      location,
      protocol: pick(row, headerMap, "protocol"),
      destinationPort: pick(row, headerMap, "destination port", "destination_port"),
      tags: pick(row, headerMap, "tags"),
      isPredefined: location.toLowerCase() === "predefined",
    })
  }
  return out
}

function parseStaticRoutes(csvText: string): StaticRoute[] {
  const rows = parseCsv(csvText)
  if (rows.length < 2) return []
  const headerMap = buildHeaderMap(rows[0])
  const isV2 =
    headerMap["next hop value"] != null || headerMap["destination kind"] != null
  const out: StaticRoute[] = []

  for (let idx = 1; idx < rows.length; idx++) {
    const row = rows[idx]
    if (row.length < 5) continue

    if (isV2) {
      const destination = pick(row, headerMap, "destination")
      if (!destination) continue
      out.push({
        id: `rt-${idx}`,
        name: pick(row, headerMap, "name"),
        destination,
        destKind: (pick(row, headerMap, "destination kind") || destKind(destination)) as
          | "cidr"
          | "object",
        interface: pick(row, headerMap, "interface"),
        nextHopType: (pick(row, headerMap, "next hop type", "type") ||
          "ip-address") as StaticRoute["nextHopType"],
        nextHop: pick(row, headerMap, "next hop value", "value", "gateway", "next hop"),
        adminDistance: pick(row, headerMap, "admin distance", "admin"),
        metric: pick(row, headerMap, "metric"),
        routeTable: pick(row, headerMap, "route table"),
      })
      continue
    }

    const offset = normHeader(row[0]).includes("x-grid3") || row[0] === "" ? 1 : 0
    const destination = (row[offset + 2] ?? "").trim()
    if (!destination) continue
    out.push({
      id: `rt-${idx}`,
      name: (row[offset + 1] ?? "").trim(),
      destination,
      destKind: destKind(destination),
      interface: (row[offset + 4] ?? "").trim(),
      nextHopType: "ip-address",
      nextHop: (row[offset + 5] ?? "").trim(),
      adminDistance: (row[offset + 6] ?? "").trim(),
      metric: (row[offset + 7] ?? "").trim(),
      routeTable: (row[offset + 8] ?? "").trim(),
    })
  }
  return out
}

export function parsePaloCsvImport(
  capabilityKey: PaloDatasetKey,
  csvText: string,
): PaloCsvImportResult {
  switch (capabilityKey) {
    case "security_rules": {
      const rows = parseSecurityRules(csvText)
      return { rows, count: rows.length }
    }
    case "nat_rules": {
      const rows = parseNatRules(csvText)
      return { rows, count: rows.length }
    }
    case "address_objects": {
      const rows = parseAddressObjects(csvText)
      return { rows, count: rows.length }
    }
    case "static_routes": {
      const rows = parseStaticRoutes(csvText)
      return { rows, count: rows.length }
    }
    case "service_objects": {
      const rows = parseServiceObjects(csvText)
      return { rows, count: rows.length }
    }
    default:
      throw new Error(`Unsupported dataset import: ${capabilityKey}`)
  }
}

export function isPaloImportCapability(key: string): key is PaloDatasetKey {
  return (
    key === "security_rules" ||
    key === "nat_rules" ||
    key === "address_objects" ||
    key === "static_routes" ||
    key === "service_objects"
  )
}
