export interface NginxJobDetail {
  id: number
  server_id: number
  server_name: string | null
  job_type: string
  status: "running" | "success" | "failed"
  result: Record<string, unknown> | null
  log: string | null
  created_at: string
  finished_at: string | null
}

export async function fetchNginxJob(jobId: number): Promise<NginxJobDetail> {
  const res = await fetch(`/api/nginx/jobs/${jobId}`, { cache: "no-store" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to load job")
  return data as NginxJobDetail
}

export async function fetchActiveUpgradeJob(
  serverId: string | number,
): Promise<NginxJobDetail | null> {
  const res = await fetch(`/api/nginx/upgrade/active/${serverId}`, { cache: "no-store" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to load active upgrade")
  if (!data || data === null) return null
  return data as NginxJobDetail
}
