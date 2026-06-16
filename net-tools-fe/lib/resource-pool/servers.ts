export interface ServerRecord {
  id: number
  name: string
  hostname: string
  ip: string
  group: string
  ssh_user: string
  ssh_key_path: string | null
  notes: string | null
  nginx_fleet_label_mode: string | null
  nginx_fleet_label_custom: string | null
  nginx_monitored: boolean
  created_at: string
  updated_at: string
}

export interface CreateServerPayload {
  name: string
  hostname: string
  ip: string
  group: string
  ssh_user?: string
  ssh_key_path?: string | null
  notes?: string | null
  nginx_fleet_label_mode?: string | null
  nginx_fleet_label_custom?: string | null
}

export interface NginxJobRecord {
  id: number
  server_id: number
  server_name: string | null
  job_type: string
  status: string
  result: Record<string, unknown> | null
  created_at: string
  finished_at: string | null
}

export async function fetchDevices(): Promise<ServerRecord[]> {
  const res = await fetch("/api/resource-pool/devices", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load devices")
  return res.json()
}

export async function createDevice(payload: CreateServerPayload): Promise<ServerRecord> {
  const res = await fetch("/api/resource-pool/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to create device")
  return data
}

export async function updateDevice(id: string, payload: CreateServerPayload): Promise<ServerRecord> {
  const res = await fetch(`/api/resource-pool/devices/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to update device")
  return data
}

export async function deleteDevice(id: string): Promise<void> {
  const res = await fetch(`/api/resource-pool/devices/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? "Failed to delete device")
  }
}

export function getDeviceShellWsUrl(deviceId: string): string {
  const wsBase =
    process.env.NEXT_PUBLIC_NETTOOLS_WS_URL ||
    (process.env.NEXT_PUBLIC_NETTOOLS_API_URL || "http://127.0.0.1:8090").replace(/^http/, "ws")
  return `${wsBase}/api/servers/${deviceId}/shell`
}

export async function fetchNginxJobs(limit = 50): Promise<NginxJobRecord[]> {
  const res = await fetch(`/api/nginx/jobs?limit=${limit}`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load nginx jobs")
  return res.json()
}

export function roleToGroup(role: string): string {
  const labels: Record<string, string> = {
    "nginx-ui": "Nginx UI",
    "nginx-proxy": "Nginx Proxy",
    dns: "DNS",
    monitoring: "Monitoring",
    lab: "Lab / Dev",
    general: "General",
  }
  return labels[role] ?? role
}

export function groupToRole(group: string): string {
  const normalized = group.toLowerCase()
  if (normalized.includes("nginx proxy")) return "nginx-proxy"
  if (normalized.includes("nginx ui") || normalized.includes("nginx")) return "nginx-ui"
  if (normalized.includes("lab")) return "lab"
  if (normalized.includes("dns")) return "dns"
  if (normalized.includes("monitor")) return "monitoring"
  return "general"
}

export function latestJobByServer(jobs: NginxJobRecord[]): Map<number, NginxJobRecord> {
  const map = new Map<number, NginxJobRecord>()
  for (const job of jobs) {
    if (!map.has(job.server_id)) map.set(job.server_id, job)
  }
  return map
}

export async function runNginxCheck(serverId: string | number): Promise<void> {
  const res = await fetch(`/api/nginx/check/${serverId}`, { method: "POST" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "SSH check failed")
}

export const AUTO_CHECK_OPTIONS = [
  { value: "off", label: "Mati", ms: 0 },
  { value: "15s", label: "15 detik", ms: 15_000 },
  { value: "30s", label: "30 detik", ms: 30_000 },
  { value: "1m", label: "1 menit", ms: 60_000 },
] as const

export type AutoCheckInterval = (typeof AUTO_CHECK_OPTIONS)[number]["value"]

