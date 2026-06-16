export interface IpSourceResult {
  source: string
  ipv4?: string | null
  ipv6?: string | null
  error?: string
  latencyMs?: number
}

export interface GeoInfo {
  ip: string
  city?: string
  region?: string
  country?: string
  countryCode?: string
  timezone?: string
  latitude?: number
  longitude?: number
  isp?: string
  org?: string
  asn?: string
  postal?: string
}

export interface RiskAssessment {
  score: number
  level: "low" | "medium" | "high"
  flags: string[]
}

export interface WhoisInfo {
  ip: string
  name?: string
  handle?: string
  country?: string
  startAddress?: string
  endAddress?: string
  type?: string
  status?: string[]
  entities?: { name?: string; roles?: string[]; handle?: string }[]
}

export interface BlacklistResult {
  list: string
  listed: boolean
  response?: string
}

export interface ConnectivityTarget {
  name: string
  region: string
  url: string
  status: "ok" | "fail" | "blocked" | "pending"
  latencyMs?: number
  httpStatus?: number
  error?: string
}

export interface IpLookupResponse {
  ip: string
  sources: IpSourceResult[]
  geo?: GeoInfo
  risk?: RiskAssessment
  whois?: WhoisInfo
  fetchedAt: string
}

export interface MyIpResponse {
  sources: IpSourceResult[]
  consensusIpv4?: string
  consensusIpv6?: string
  geo?: GeoInfo
  risk?: RiskAssessment
  cloudflareTrace?: Record<string, string>
  fetchedAt: string
}
