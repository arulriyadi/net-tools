export type SecuritySeverity = "critical" | "high" | "medium" | "low" | "clean"
export type FindingSource = "config" | "log" | "database" | "network"
export type ScanAreaStatus = "clean" | "warning" | "critical" | "skipped"

export interface ForensicFindingView {
  severity: "critical" | "high" | "medium" | "low"
  category: string
  source?: FindingSource
  file_path: string | null
  line_number: number | null
  matched_line: string
  description: string
}

export interface TimelineEventView {
  timestamp_utc: string | null
  timestamp_wib: string
  event: string
  source_ip: string | null
  source: string
}

export interface SecurityRecommendationView {
  priority: "urgent" | "follow_up"
  text: string
}

export interface ScanAreaView {
  area: FindingSource
  status: ScanAreaStatus
  label: string
  summary: string
  checks_run: string[]
}

export interface NginxSecurityScanView {
  server_id: number
  server_name: string
  hostname: string | null
  private_ip: string
  public_ip: string | null
  nginx_version: string | null
  nginx_ui_active: boolean | null
  nginx_ui_port: number | null
  nginx_ui_binds_all: boolean | null
  nginx_ui_exposed: boolean | null
  nginx_ui_public_probe: string | null
  findings: ForensicFindingView[]
  timeline: TimelineEventView[]
  recommendations: SecurityRecommendationView[]
  scan_areas?: ScanAreaView[]
  clean_scope: string[]
  overall_severity: SecuritySeverity
  scanned_at: string
  job_id: number | null
}

export const FINDING_SOURCE_LABELS: Record<FindingSource, string> = {
  config: "Config",
  log: "Logs",
  database: "Database",
  network: "Network",
}

export const SCAN_AREA_STATUS_STYLES: Record<ScanAreaStatus, string> = {
  clean: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  critical: "bg-danger/10 text-danger border-danger/30",
  skipped: "bg-muted text-muted-foreground border-border",
}
