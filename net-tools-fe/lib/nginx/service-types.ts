/** nginx.org stable branch target (mirrors backend NGINX_STABLE_TARGET) */
export const NGINX_STABLE_VERSION = "1.30.2"
/** nginx.org mainline branch target (mirrors backend NGINX_MAINLINE_TARGET) */
export const NGINX_MAINLINE_VERSION = "1.31.1"

export type NginxServiceStatus = "running" | "stopped" | "unknown"
export type NginxServiceRole = "nginx-ui" | "nginx-proxy"
export type NginxFleetLabelMode = "name" | "hostname" | "custom"

export interface ServiceCveView {
  id: string
  severity: "critical" | "high" | "medium" | "low"
  score: number | null
  title: string
  affectedVersions: string
  fixedIn: string
  published: string
  status: string
  module: string
}

export interface NginxServiceView {
  id: string
  /** Resolved label shown in fleet UI */
  displayName: string
  name: string
  role: NginxServiceRole
  inventoryHostname: string
  hostname: string
  fleetLabelMode: NginxFleetLabelMode | null
  fleetLabelCustom: string | null
  ip: string
  os: string
  version: string
  latestVersion: string
  latestMainlineVersion: string
  status: NginxServiceStatus
  lastChecked: string
  sshConfigured: boolean
  overallRisk: string
  recommendation: string | null
  configTestOk: boolean | null
  nginxUiActive: boolean | null
  sourceJobId: number | null
  assessmentId: number | null
  cves: ServiceCveView[]
}
