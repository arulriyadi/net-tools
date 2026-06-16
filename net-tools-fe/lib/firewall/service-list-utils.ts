import type { ServiceObject } from "@/lib/firewall/firewall-types"

export type ServiceSortKey =
  | "no"
  | "name"
  | "location"
  | "protocol"
  | "destinationPort"
  | "tags"

export interface ServiceListFilters {
  q: string
  protocol: string
  location: string
  predefined: "" | "yes" | "no"
  tags: "" | "yes" | "no"
}

export const emptyServiceListFilters: ServiceListFilters = {
  q: "",
  protocol: "",
  location: "",
  predefined: "",
  tags: "",
}

export interface ServiceSortState {
  key: ServiceSortKey
  dir: "asc" | "desc"
}

export const defaultServiceSort: ServiceSortState = { key: "name", dir: "asc" }

export function uniqueServiceValues(services: ServiceObject[]) {
  const protocols = new Set<string>()
  const locations = new Set<string>()
  for (const service of services) {
    if (service.protocol) protocols.add(service.protocol)
    if (service.location) locations.add(service.location)
  }
  return {
    protocols: [...protocols].sort((a, b) => a.localeCompare(b)),
    locations: [...locations].sort((a, b) => a.localeCompare(b)),
  }
}

export function filterServices(
  services: ServiceObject[],
  filters: ServiceListFilters,
): ServiceObject[] {
  const q = filters.q.toLowerCase().trim()

  return services.filter((service) => {
    if (filters.protocol && service.protocol !== filters.protocol) return false
    if (filters.location && service.location !== filters.location) return false
    if (filters.predefined === "yes" && !service.isPredefined) return false
    if (filters.predefined === "no" && service.isPredefined) return false
    if (filters.tags === "yes" && !service.tags) return false
    if (filters.tags === "no" && service.tags) return false

    if (!q) return true

    const hay = [
      service.name,
      service.location,
      service.protocol,
      service.destinationPort,
      service.tags,
      service.isPredefined ? "predefined" : "custom",
    ]
      .join(" ")
      .toLowerCase()

    return hay.includes(q)
  })
}

function compareServices(
  a: ServiceObject,
  b: ServiceObject,
  key: ServiceSortKey,
  indexA: number,
  indexB: number,
): number {
  if (key === "no") return indexA - indexB

  const va = a[key as keyof ServiceObject] as string | undefined
  const vb = b[key as keyof ServiceObject] as string | undefined

  return String(va ?? "").localeCompare(String(vb ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

export function sortServices(
  services: ServiceObject[],
  sort: ServiceSortState,
): ServiceObject[] {
  const indexed = services.map((service, index) => ({ service, index }))
  indexed.sort((a, b) => {
    const result = compareServices(a.service, b.service, sort.key, a.index, b.index)
    return sort.dir === "asc" ? result : -result
  })
  return indexed.map((item) => item.service)
}

export function filterAndSortServices(
  services: ServiceObject[],
  filters: ServiceListFilters,
  sort: ServiceSortState,
): ServiceObject[] {
  return sortServices(filterServices(services, filters), sort)
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

export function exportServicesCsv(services: ServiceObject[], filename: string) {
  const headers = ["No", "Name", "Location", "Protocol", "Destination Port", "Tags", "Predefined"]

  const lines = [
    headers.join(","),
    ...services.map((service, index) =>
      [
        index + 1,
        service.name,
        service.location,
        service.protocol,
        service.destinationPort,
        service.tags,
        service.isPredefined ? "yes" : "no",
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
