import type { NginxJobRecord, ServerRecord } from "@/lib/resource-pool/servers"

export interface NginxUiConnectionRecord {
  panel_url: string
  username: string
  api_connected: boolean
  last_login_at: string | null
  last_error: string | null
}

export interface NginxMonitorRecord extends ServerRecord {
  nginx_ui: NginxUiConnectionRecord | null
}

export interface AddNginxMonitorPayload {
  server_id: number
  panel_url?: string
  username: string
  password: string
}

export interface NginxUiSiteRecord {
  name: string
  status: string
  urls: string[]
  proxy_target: string | null
  modified_at: string | null
}

export interface NginxUiCertificateInfoRecord {
  subject_name: string | null
  issuer_name: string | null
  not_before: string | null
  not_after: string | null
}

export interface NginxUiCertificateRecord {
  id: number
  name: string
  domains: string[]
  filename: string | null
  ssl_certificate_path: string | null
  auto_cert: string
  challenge_method: string | null
  status: string | null
  last_error: string | null
  certificate_info: NginxUiCertificateInfoRecord | null
}

export async function fetchNginxMonitors(): Promise<NginxMonitorRecord[]> {
  const res = await fetch("/api/nginx/monitors", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load nginx monitors")
  return res.json()
}

export async function fetchAvailableNginxMonitors(): Promise<ServerRecord[]> {
  const res = await fetch("/api/nginx/monitors/available", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load available devices")
  return res.json()
}

export async function addNginxMonitor(payload: AddNginxMonitorPayload): Promise<NginxMonitorRecord> {
  const res = await fetch("/api/nginx/monitors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? data.detail ?? "Failed to add nginx-ui monitor")
  return data
}

export interface UpdateNginxMonitorPayload {
  panel_url?: string
  username: string
  password?: string
}

export async function updateNginxMonitor(
  serverId: number | string,
  payload: UpdateNginxMonitorPayload,
): Promise<NginxMonitorRecord> {
  const res = await fetch(`/api/nginx/monitors/${serverId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? data.detail ?? "Failed to update nginx-ui credentials")
  return data
}

export async function removeNginxMonitor(serverId: number | string): Promise<void> {
  const res = await fetch(`/api/nginx/monitors/${serverId}`, { method: "DELETE" })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? data.detail ?? "Failed to remove nginx-ui monitor")
  }
}

export async function fetchNginxSites(serverId: number | string): Promise<NginxUiSiteRecord[]> {
  const res = await fetch(`/api/nginx/monitors/${serverId}/sites`, { cache: "no-store" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? data.detail ?? "Failed to load nginx-ui sites")
  return data
}

export async function fetchNginxCertificates(
  serverId: number | string,
): Promise<NginxUiCertificateRecord[]> {
  const res = await fetch(`/api/nginx/monitors/${serverId}/certificates`, { cache: "no-store" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? data.detail ?? "Failed to load nginx-ui certificates")
  return data
}

export interface NginxUiMetricsRecord {
  collected_at: string
  nginx_running: boolean
  active_connections: number
  reading: number
  writing: number
  waiting: number
  nginx_cpu_percent: number | null
  nginx_memory_mb: number | null
  requests_total: number | null
  host_cpu_percent: number | null
  host_memory_percent: number | null
  host_memory_used_mb: number | null
  host_memory_total_mb: number | null
  network_rx_bytes: number | null
  network_tx_bytes: number | null
  network_interface: string | null
  errors: string[]
}

export async function fetchNginxMetrics(serverId: number | string): Promise<NginxUiMetricsRecord> {
  const res = await fetch(`/api/nginx/monitors/${serverId}/metrics`, { cache: "no-store" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? data.detail ?? "Failed to load nginx-ui metrics")
  return data
}

export async function fetchNginxMetricsLatest(
  serverId: number | string,
): Promise<NginxUiMetricsRecord> {
  const res = await fetch(`/api/nginx/monitors/${serverId}/metrics/latest`, { cache: "no-store" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? data.detail ?? "Failed to load nginx-ui metrics")
  return data
}

export interface NginxUiMetricsSettingsRecord {
  poll_interval_seconds: number
  retention_days: number
}

export interface NginxUiMetricHistoryPoint {
  collected_at: string
  active_connections: number
  host_cpu_percent: number | null
  host_memory_percent: number | null
  nginx_cpu_percent: number | null
  nginx_memory_mb: number | null
  rx_bytes_per_sec: number | null
  tx_bytes_per_sec: number | null
}

export interface NginxUiMetricHistoryRecord {
  range: string
  poll_interval_seconds: number
  retention_days: number
  points: NginxUiMetricHistoryPoint[]
}

export async function fetchNginxMetricsHistory(
  serverId: number | string,
  range: string,
): Promise<NginxUiMetricHistoryRecord> {
  const res = await fetch(
    `/api/nginx/monitors/${serverId}/metrics/history?range=${encodeURIComponent(range)}`,
    { cache: "no-store" },
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? data.detail ?? "Failed to load metrics history")
  return data
}

export async function fetchNginxMetricsSettings(
  serverId: number | string,
): Promise<NginxUiMetricsSettingsRecord> {
  const res = await fetch(`/api/nginx/monitors/${serverId}/metrics/settings`, { cache: "no-store" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? data.detail ?? "Failed to load metrics settings")
  return data
}

export async function updateNginxMetricsSettings(
  serverId: number | string,
  payload: NginxUiMetricsSettingsRecord,
): Promise<NginxUiMetricsSettingsRecord> {
  const res = await fetch(`/api/nginx/monitors/${serverId}/metrics/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? data.detail ?? "Failed to update metrics settings")
  return data
}

export function formatBitrate(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec < 0) return "—"
  if (bytesPerSec >= 1024 * 1024) return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`
  if (bytesPerSec >= 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  return `${Math.round(bytesPerSec)} B/s`
}

export interface NginxUiInstanceView {
  id: string
  name: string
  hostname: string
  ip: string
  port: number
  panelUrl: string
  panelUsername: string
  apiConnected: boolean
  nginxVersion: string
  nginxUiVersion: string
  connection: "online" | "offline"
  lastChecked: string
  nginxMonitored: boolean
}

function parsePanelPort(panelUrl: string, fallbackIp: string): number {
  try {
    const url = new URL(panelUrl)
    if (url.port) return Number(url.port)
    return url.protocol === "https:" ? 443 : 80
  } catch {
    return 9000
  }
}

export function mapMonitorToInstance(
  server: NginxMonitorRecord,
  latestJob?: NginxJobRecord,
): NginxUiInstanceView {
  const result = latestJob?.result
  const nginxActive = result?.nginx_active === true
  const nginxUiActive = result?.nginx_ui_active === true
  const panelUrl = server.nginx_ui?.panel_url ?? `http://${server.ip}:9000`
  const apiOnline = server.nginx_ui?.api_connected === true
  const online = apiOnline || nginxActive || nginxUiActive

  return {
    id: String(server.id),
    name: server.name,
    hostname: (result?.hostname as string)?.trim() || server.hostname,
    ip: server.ip,
    port: parsePanelPort(panelUrl, server.ip),
    panelUrl,
    panelUsername: server.nginx_ui?.username ?? "—",
    apiConnected: apiOnline,
    nginxVersion: (result?.nginx_version as string) ?? "—",
    nginxUiVersion: (result?.nginx_ui_version as string) ?? "—",
    connection: latestJob || apiOnline ? (online ? "online" : "offline") : "offline",
    lastChecked: latestJob?.finished_at
      ? new Date(latestJob.finished_at).toLocaleString("id-ID")
      : "Never",
    nginxMonitored: server.nginx_monitored,
  }
}
