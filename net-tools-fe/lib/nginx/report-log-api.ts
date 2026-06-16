import { runNginxSecurityScan } from "@/lib/nginx/security-api"
import type { ReportLogEntryView } from "@/lib/nginx/report-log-types"

export async function fetchReportLog(
  serverId: string | number,
  limit = 30,
): Promise<ReportLogEntryView[]> {
  const res = await fetch(
    `/api/nginx/report-log?server_id=${serverId}&limit=${limit}`,
    { cache: "no-store" },
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to load report log")
  return (data as ReportLogEntryView[]) ?? []
}

export async function runSecurityScanReport(serverId: string | number) {
  return runNginxSecurityScan(serverId)
}

export async function downloadReportLogPdf(jobId: string | number): Promise<void> {
  const res = await fetch(`/api/nginx/report-log/report/${jobId}`, { cache: "no-store" })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? "Failed to download PDF report")
  }
  const blob = await res.blob()
  const disposition = res.headers.get("content-disposition")
  const filenameMatch = disposition?.match(/filename="?([^";\n]+)"?/)
  const filename = filenameMatch?.[1] ?? `nginx-report-job-${jobId}.pdf`

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
