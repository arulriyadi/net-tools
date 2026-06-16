import type { AddressObject, RouteDestKind, StaticRoute } from "@/lib/firewall/firewall-types"

export type DestCidrStatus = "literal" | "resolved" | "unresolved"
export type GwKind = "ip" | "object" | "next-vr" | "unresolved"

export interface ResolvedStaticRoute extends StaticRoute {
  destCidr: string
  destCidrStatus: DestCidrStatus
  destObjectAddr: string
  destObjectId: string | null
  gwKind: GwKind
}

function normalizeObjectName(s: string): string {
  return String(s || "").replace(/\s+/g, " ").trim()
}

function parseCidr(s: string): string | null {
  let value = (s || "").trim()
  if (!value) return null
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) value += "/32"
  return /^\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2}$/.test(value) ? value : null
}

function buildAddressLookup(objects: AddressObject[]) {
  const byName: Record<string, AddressObject> = {}
  const byNorm: Record<string, AddressObject> = {}
  for (const obj of objects) {
    byName[obj.name] = obj
    byNorm[normalizeObjectName(obj.name)] = obj
  }
  return { byName, byNorm }
}

function lookupObject(objects: AddressObject[], name: string): AddressObject | null {
  const key = (name || "").trim()
  const { byName, byNorm } = buildAddressLookup(objects)
  return byName[key] ?? byNorm[normalizeObjectName(key)] ?? null
}

function inferDestKind(destination: string, destKind?: RouteDestKind): RouteDestKind {
  if (destKind) return destKind
  return parseCidr(destination) ? "cidr" : "object"
}

export function gatewayKind(nextHopType: string, nextHop: string): GwKind {
  const nhType = (nextHopType || "").trim().toLowerCase()
  const nhVal = (nextHop || "").trim()
  if (nhType === "next-vr" || nhVal.toLowerCase() === "next-vr") return "next-vr"
  if (!nhVal || nhVal.toLowerCase() === "ip-address") return "unresolved"
  if (parseCidr(nhVal) || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(nhVal)) return "ip"
  return "object"
}

export function resolveStaticRoute(
  route: StaticRoute,
  objects: AddressObject[],
): ResolvedStaticRoute {
  const dest = (route.destination || "").trim()
  const kind = inferDestKind(dest, route.destKind)
  const literal = parseCidr(dest)
  const gwKind = gatewayKind(route.nextHopType, route.nextHop)

  if (kind === "cidr" || literal) {
    return {
      ...route,
      destKind: kind,
      destCidr: literal || dest,
      destCidrStatus: "literal",
      destObjectAddr: "",
      destObjectId: null,
      gwKind,
    }
  }

  const obj = lookupObject(objects, dest)
  if (!obj) {
    return {
      ...route,
      destKind: "object",
      destCidr: "",
      destCidrStatus: "unresolved",
      destObjectAddr: "",
      destObjectId: null,
      gwKind,
    }
  }

  const cidr = parseCidr(obj.address)
  return {
    ...route,
    destKind: "object",
    destObjectAddr: obj.address,
    destObjectId: obj.id,
    destCidr: cidr ?? "",
    destCidrStatus: cidr ? "resolved" : "unresolved",
    gwKind,
  }
}

export function enrichStaticRoutes(
  routes: StaticRoute[],
  objects: AddressObject[],
): ResolvedStaticRoute[] {
  return routes.map((route) => resolveStaticRoute(route, objects))
}
