import type { ConnectorProtocol, DataConnectorFormData, RouterOsVersion } from "@/lib/resource-pool/data-connectors-mock"

/** REST URL scheme — http or https only */
export type RestUrlScheme = "http" | "https"

/** MikroTik legacy API transport — binary TCP, not HTTP */
export type ApiTransportScheme = "plain" | "tls"

export const REST_SCHEME_LABELS: Record<RestUrlScheme, string> = {
  http: "HTTP (plain)",
  https: "HTTPS (TLS)",
}

export const API_TRANSPORT_LABELS: Record<ApiTransportScheme, string> = {
  plain: "Plain TCP (port 8728)",
  tls: "TLS (port 8729)",
}

const REST_PATH_BY_PARSER: Record<string, string> = {
  "mikrotik-rest-v1": "/rest/{resource}",
  "arista-eapi-v1": "/command-api",
}

export function isMikrotikRestConnector(form: Pick<DataConnectorFormData, "vendor" | "parserId" | "protocol">) {
  const parserId = (form.parserId || "").toLowerCase()
  return (
    form.protocol === "rest" &&
    (parserId === "mikrotik-rest-v1" ||
      parserId === "mikrotik-rest" ||
      form.vendor.toLowerCase().includes("mikrotik"))
  )
}

export function isMikrotikApiConnector(form: Pick<DataConnectorFormData, "vendor" | "parserId" | "protocol">) {
  const parserId = (form.parserId || "").toLowerCase()
  return (
    form.protocol === "api" &&
    (parserId === "mikrotik-api-v1" ||
      parserId === "mikrotik-api" ||
      form.vendor.toLowerCase().includes("mikrotik"))
  )
}

export function isMikrotikConnector(form: Pick<DataConnectorFormData, "vendor" | "parserId">) {
  return (
    form.vendor.toLowerCase().includes("mikrotik") ||
    form.parserId.startsWith("mikrotik-")
  )
}

export function defaultRouterOsVersion(
  form: Pick<DataConnectorFormData, "protocol" | "vendor" | "parserId">,
): RouterOsVersion | "" {
  if (!isMikrotikConnector(form)) return ""
  if (form.protocol === "rest" || parserId === "mikrotik-rest-v1" || parserId === "mikrotik-rest") return "7"
  if (form.protocol === "api" || parserId === "mikrotik-api-v1" || parserId === "mikrotik-api") return "6"
  return "7"
}

/** REST and most HTTP-based connectors use http/https dropdown */
export function usesRestSchemeDropdown(protocol: ConnectorProtocol) {
  return protocol === "rest"
}

/** MikroTik RouterOS legacy API — plain TCP vs TLS, not http/https */
export function usesApiTransportDropdown(form: Pick<DataConnectorFormData, "vendor" | "parserId" | "protocol">) {
  return isMikrotikApiConnector(form)
}

export function usesFixedEndpointPattern(form: Pick<DataConnectorFormData, "vendor" | "parserId" | "protocol">) {
  return !usesRestSchemeDropdown(form.protocol) && !usesApiTransportDropdown(form)
}

export function defaultRestScheme(): RestUrlScheme {
  return "https"
}

export function defaultApiTransport(): ApiTransportScheme {
  return "plain"
}

export function defaultPortForRestScheme(scheme: RestUrlScheme): string {
  return scheme === "http" ? "80" : "443"
}

export function defaultPortForApiTransport(transport: ApiTransportScheme): string {
  return transport === "plain" ? "8728" : "8729"
}

export function restPathForParser(parserId: string): string {
  return REST_PATH_BY_PARSER[parserId] ?? "/rest/{resource}"
}

export function buildRestEndpointPattern(scheme: RestUrlScheme, parserId: string): string {
  return `${scheme}://{host}${restPathForParser(parserId)}`
}

export function buildMikrotikApiEndpointPattern(transport: ApiTransportScheme): string {
  if (transport === "plain") {
    return "tcp://{host}:{port} · {api_command}"
  }
  return "tls://{host}:{port} · {api_command}"
}

export function parseRestScheme(endpointPattern: string): RestUrlScheme {
  if (endpointPattern.toLowerCase().startsWith("http://")) return "http"
  return "https"
}

export function parseApiTransport(endpointPattern: string): ApiTransportScheme {
  const lower = endpointPattern.toLowerCase()
  if (lower.startsWith("tls://")) return "tls"
  if (lower.includes(":8729")) return "tls"
  return "plain"
}

export function endpointSchemeFromRecord(form: Pick<DataConnectorFormData, "protocol" | "vendor" | "parserId" | "endpointPattern">): string {
  if (usesRestSchemeDropdown(form.protocol)) {
    return parseRestScheme(form.endpointPattern || "https://")
  }
  if (usesApiTransportDropdown(form)) {
    return parseApiTransport(form.endpointPattern || "tcp://")
  }
  return ""
}

export function buildEndpointPattern(form: DataConnectorFormData): string {
  if (usesRestSchemeDropdown(form.protocol)) {
    const scheme = (form.endpointScheme as RestUrlScheme) || defaultRestScheme()
    return buildRestEndpointPattern(scheme, form.parserId || "mikrotik-rest-v1")
  }
  if (usesApiTransportDropdown(form)) {
    const transport = (form.endpointScheme as ApiTransportScheme) || defaultApiTransport()
    return buildMikrotikApiEndpointPattern(transport)
  }
  return form.endpointPattern
}

export function applyEndpointSchemeDefaults(
  form: DataConnectorFormData,
  scheme: string,
): DataConnectorFormData {
  const next = { ...form, endpointScheme: scheme }
  if (usesRestSchemeDropdown(form.protocol)) {
    next.endpointPattern = buildRestEndpointPattern(scheme as RestUrlScheme, form.parserId || "mikrotik-rest-v1")
    next.defaultPort = defaultPortForRestScheme(scheme as RestUrlScheme)
  } else if (usesApiTransportDropdown(form)) {
    next.endpointPattern = buildMikrotikApiEndpointPattern(scheme as ApiTransportScheme)
    next.defaultPort = defaultPortForApiTransport(scheme as ApiTransportScheme)
  }
  return next
}

export function applyProtocolDefaults(form: DataConnectorFormData, protocol: ConnectorProtocol): DataConnectorFormData {
  const next = { ...form, protocol }
  if (protocol === "rest") {
    const scheme = defaultRestScheme()
    next.endpointScheme = scheme
    next.endpointPattern = buildRestEndpointPattern(scheme, next.parserId || "mikrotik-rest-v1")
    next.defaultPort = defaultPortForRestScheme(scheme)
  } else if (protocol === "api" && isMikrotikApiConnector(next)) {
    const transport = defaultApiTransport()
    next.endpointScheme = transport
    next.endpointPattern = buildMikrotikApiEndpointPattern(transport)
    next.defaultPort = defaultPortForApiTransport(transport)
  } else {
    next.endpointScheme = ""
  }
  if (isMikrotikConnector(next)) {
    next.routerOsVersion = defaultRouterOsVersion(next)
  } else {
    next.routerOsVersion = ""
  }
  return next
}
