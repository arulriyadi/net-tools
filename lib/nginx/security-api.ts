import type { NginxSecurityScanView } from "@/lib/nginx/security-types"

export async function runNginxSecurityScan(serverId: string | number): Promise<NginxSecurityScanView> {
  const res = await fetch(`/api/nginx/security-scan/${serverId}`, { method: "POST" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Security scan failed")
  return data as NginxSecurityScanView
}

export async function fetchNginxSecurityScans(
  serverId: string | number,
  limit = 20,
): Promise<NginxSecurityScanView[]> {
  const res = await fetch(
    `/api/nginx/security-scan?server_id=${serverId}&limit=${limit}`,
    { cache: "no-store" },
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to load security scans")
  return (data as NginxSecurityScanView[]) ?? []
}

export async function fetchLatestNginxSecurityScan(
  serverId: string | number,
): Promise<NginxSecurityScanView | null> {
  const res = await fetch(`/api/nginx/security-scan/latest?server_id=${serverId}`, {
    cache: "no-store",
  })
  if (res.status === 404) return null
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to load security scan")
  if (!data) return null
  return data as NginxSecurityScanView
}

export async function downloadNginxSecurityReport(jobId: string | number): Promise<void> {
  const res = await fetch(`/api/nginx/security-scan/report/${jobId}`, { cache: "no-store" })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? "Failed to download PDF report")
  }
  const blob = await res.blob()
  const disposition = res.headers.get("content-disposition")
  const filenameMatch = disposition?.match(/filename="?([^";\n]+)"?/)
  const filename = filenameMatch?.[1] ?? `nginx-security-job-${jobId}.pdf`

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
