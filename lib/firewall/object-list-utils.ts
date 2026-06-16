import type { AddressObject } from "@/lib/firewall/firewall-types"

export type ObjectSortKey =
  | "no"
  | "name"
  | "location"
  | "type"
  | "address"
  | "addrKind"
  | "networkCat"
  | "tags"

export interface ObjectListFilters {
  q: string
  type: string
  addrKind: string
  network: string
  tags: "" | "yes" | "no"
}

export const emptyObjectListFilters: ObjectListFilters = {
  q: "",
  type: "",
  addrKind: "",
  network: "",
  tags: "",
}

export interface ObjectSortState {
  key: ObjectSortKey
  dir: "asc" | "desc"
}

export const defaultObjectSort: ObjectSortState = { key: "name", dir: "asc" }

export function uniqueObjectValues(objects: AddressObject[]) {
  const types = new Set<string>()
  const networks = new Set<string>()
  for (const object of objects) {
    if (object.type) types.add(object.type)
    if (object.networkCat) networks.add(object.networkCat)
  }
  return {
    types: [...types].sort((a, b) => a.localeCompare(b)),
    networks: [...networks].sort((a, b) => a.localeCompare(b)),
  }
}

export function filterObjects(
  objects: AddressObject[],
  filters: ObjectListFilters,
): AddressObject[] {
  const q = filters.q.toLowerCase().trim()

  return objects.filter((object) => {
    if (filters.type && object.type !== filters.type) return false
    if (filters.addrKind && object.addrKind !== filters.addrKind) return false
    if (filters.network && object.networkCat !== filters.network) return false
    if (filters.tags === "yes" && !object.tags) return false
    if (filters.tags === "no" && object.tags) return false

    if (!q) return true

    const hay = [
      object.name,
      object.location,
      object.type,
      object.address,
      object.addrKind,
      object.networkCat,
      object.tags,
    ]
      .join(" ")
      .toLowerCase()

    return hay.includes(q)
  })
}

function compareObjects(
  a: AddressObject,
  b: AddressObject,
  key: ObjectSortKey,
  indexA: number,
  indexB: number,
): number {
  if (key === "no") return indexA - indexB

  const va =
    key === "networkCat"
      ? a.networkCat
      : key === "addrKind"
        ? a.addrKind
        : (a[key as keyof AddressObject] as string | undefined)

  const vb =
    key === "networkCat"
      ? b.networkCat
      : key === "addrKind"
        ? b.addrKind
        : (b[key as keyof AddressObject] as string | undefined)

  return String(va ?? "").localeCompare(String(vb ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

export function sortObjects(
  objects: AddressObject[],
  sort: ObjectSortState,
): AddressObject[] {
  const indexed = objects.map((object, index) => ({ object, index }))
  indexed.sort((a, b) => {
    const result = compareObjects(a.object, b.object, sort.key, a.index, b.index)
    return sort.dir === "asc" ? result : -result
  })
  return indexed.map((item) => item.object)
}

export function filterAndSortObjects(
  objects: AddressObject[],
  filters: ObjectListFilters,
  sort: ObjectSortState,
): AddressObject[] {
  return sortObjects(filterObjects(objects, filters), sort)
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

export function exportObjectsCsv(objects: AddressObject[], filename: string) {
  const headers = ["No", "Name", "Location", "Type", "Address", "Addr Kind", "Network", "Tags"]

  const lines = [
    headers.join(","),
    ...objects.map((object, index) =>
      [
        index + 1,
        object.name,
        object.location,
        object.type,
        object.address,
        object.addrKind,
        object.networkCat,
        object.tags,
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
