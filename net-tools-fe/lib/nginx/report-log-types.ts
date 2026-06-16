import type { NginxSecurityScanView } from "@/lib/nginx/security-types"
import type { NginxUpgradeResultView } from "@/lib/nginx/service-api"

export type ReportType = "security_scan" | "nginx_upgrade"
export type ReportStatusTone = "success" | "warning" | "danger" | "neutral"

export interface ReportLogEntryView {
  job_id: number
  report_type: ReportType
  created_at: string
  summary: string
  status_label: string
  status_tone: ReportStatusTone
  pdf_available: boolean
  security_scan: NginxSecurityScanView | null
  nginx_upgrade: NginxUpgradeResultView | null
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  security_scan: "Security scan",
  nginx_upgrade: "Nginx upgrade",
}

export const REPORT_TONE_STYLES: Record<ReportStatusTone, string> = {
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  neutral: "bg-muted text-muted-foreground border-border",
}
