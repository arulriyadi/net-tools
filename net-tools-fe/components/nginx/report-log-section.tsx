"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  FileText,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  downloadReportLogPdf,
  fetchReportLog,
  runSecurityScanReport,
} from "@/lib/nginx/report-log-api"
import type { ReportLogEntryView } from "@/lib/nginx/report-log-types"
import {
  REPORT_TONE_STYLES,
  REPORT_TYPE_LABELS,
} from "@/lib/nginx/report-log-types"
import type {
  FindingSource,
  NginxSecurityScanView,
  ScanAreaStatus,
  SecuritySeverity,
} from "@/lib/nginx/security-types"
import {
  FINDING_SOURCE_LABELS,
  SCAN_AREA_STATUS_STYLES,
} from "@/lib/nginx/security-types"
import type { NginxUpgradeResultView } from "@/lib/nginx/service-api"

const severityStyles: Record<Exclude<SecuritySeverity, "clean">, string> = {
  critical: "bg-danger/10 text-danger border-danger/30",
  high: "bg-danger/10 text-danger border-danger/20",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
}

const severityBadge: Record<SecuritySeverity, string> = {
  critical: "bg-danger/10 text-danger border-danger/30",
  high: "bg-danger/10 text-danger border-danger/20",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
  clean: "bg-success/10 text-success border-success/30",
}

function entryKey(entry: ReportLogEntryView): string {
  return `${entry.report_type}-${entry.job_id}`
}

function latestHeaderLabel(entry: ReportLogEntryView): string {
  return `${REPORT_TYPE_LABELS[entry.report_type]}: ${entry.status_label}`
}

function formatScannedAt(value: string): string {
  try {
    return new Date(value).toLocaleString("id-ID")
  } catch {
    return value
  }
}

function nginxUiPanelLabel(scan: NginxSecurityScanView): string {
  if (scan.nginx_ui_active === null) return "—"
  if (!scan.nginx_ui_active) return "Inactive"
  if (scan.nginx_ui_exposed) return "Publicly reachable"
  if (scan.nginx_ui_binds_all && scan.public_ip) {
    return "Bind 0.0.0.0, public blocked"
  }
  return "Not publicly exposed"
}

function areaStatusLabel(status: ScanAreaStatus): string {
  if (status === "clean") return "Clean"
  if (status === "skipped") return "Skipped"
  if (status === "critical") return "Issue"
  return "Review"
}

function ScanAreasSummary({ scan }: { scan: NginxSecurityScanView }) {
  const areas = scan.scan_areas ?? []
  if (areas.length === 0) return null

  return (
    <div className="border-b border-border px-5 py-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Scan coverage
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {areas.map((area) => (
          <div
            key={area.area}
            className="rounded-lg border border-border bg-card px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{area.label}</span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                  SCAN_AREA_STATUS_STYLES[area.status],
                )}
              >
                {areaStatusLabel(area.status)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{area.summary}</p>
            {area.checks_run.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                {area.checks_run.map((check) => (
                  <li key={check} className="flex gap-1.5">
                    <span className="text-success">✓</span>
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function FindingsBySource({ scan }: { scan: NginxSecurityScanView }) {
  const grouped = scan.findings.reduce<Record<string, typeof scan.findings>>((acc, f) => {
    const key = f.source ?? "config"
    acc[key] = acc[key] ?? []
    acc[key].push(f)
    return acc
  }, {})

  const sources = (["config", "log", "database", "network"] as FindingSource[]).filter(
    (s) => grouped[s]?.length,
  )

  if (sources.length === 0) {
    return (
      <div className="flex items-center gap-2 px-5 py-6 text-sm text-success">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        No malicious patterns in config, logs, or nginx-ui database.
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {sources.map((source) => (
        <div key={source} className="overflow-x-auto">
          <div className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30">
            {FINDING_SOURCE_LABELS[source]} findings ({grouped[source].length})
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-2 text-left">Severity</th>
                <th className="px-5 py-2 text-left">Category</th>
                <th className="px-5 py-2 text-left">Location</th>
                <th className="px-5 py-2 text-left">Matched line</th>
                <th className="px-5 py-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {grouped[source].map((f, i) => (
                <tr key={`${source}-${f.file_path}-${i}`} className="hover:bg-accent/30">
                  <td className="px-5 py-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium capitalize",
                        severityStyles[f.severity],
                      )}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {f.severity}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 font-mono text-xs">{f.category}</td>
                  <td
                    className="px-5 py-2.5 font-mono text-xs max-w-[180px] truncate"
                    title={f.file_path ?? undefined}
                  >
                    {f.file_path ?? "—"}
                    {f.line_number != null ? `:${f.line_number}` : ""}
                  </td>
                  <td
                    className="px-5 py-2.5 font-mono text-xs max-w-[240px] truncate"
                    title={f.matched_line}
                  >
                    {f.matched_line}
                  </td>
                  <td className="px-5 py-2.5">{f.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

function SecurityScanDetail({
  scan,
  onDownload,
  downloading,
}: {
  scan: NginxSecurityScanView
  onDownload: () => void
  downloading: boolean
}) {
  return (
    <div className="border-t border-border bg-muted/20">
      <div className="flex items-center justify-end border-b border-border px-5 py-2">
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading || scan.job_id == null}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          Download PDF
        </button>
      </div>
      <ScanAreasSummary scan={scan} />

      <div className="grid gap-3 border-b border-border px-5 py-4 md:grid-cols-3">
        <div>
          <div className="text-xs text-muted-foreground">Scanned at</div>
          <div className="mt-1 text-sm font-medium">{formatScannedAt(scan.scanned_at)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Findings</div>
          <div className="mt-1 text-sm font-medium">
            {scan.findings.length === 0
              ? "None"
              : `${scan.findings.length} issue${scan.findings.length === 1 ? "" : "s"}`}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">nginx-ui panel</div>
          <div className="mt-1 text-sm font-medium">{nginxUiPanelLabel(scan)}</div>
        </div>
      </div>

      {scan.nginx_ui_active && (
        <div className="border-b border-border px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            nginx-ui exposure evidence
          </div>
          <dl className="grid gap-2 text-sm md:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Public IP (from server)</dt>
              <dd className="font-mono text-xs mt-0.5">{scan.public_ip ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Private IP</dt>
              <dd className="font-mono text-xs mt-0.5">{scan.private_ip}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Panel port</dt>
              <dd className="font-mono text-xs mt-0.5">{scan.nginx_ui_port ?? 9000}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Config bind all interfaces</dt>
              <dd className="mt-0.5">
                {scan.nginx_ui_binds_all == null
                  ? "—"
                  : scan.nginx_ui_binds_all
                    ? "Yes (Host 0.0.0.0)"
                    : "No"}
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-xs text-muted-foreground">Public reachability probe (NetTools)</dt>
              <dd className="font-mono text-xs mt-0.5 break-all">
                {scan.nginx_ui_public_probe ??
                  (scan.public_ip
                    ? "Not probed"
                    : "Skipped — public IP unavailable from server")}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <FindingsBySource scan={scan} />

      {scan.timeline.length > 0 && (
        <div className="border-t border-border">
          <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Timeline preview
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-2 text-left">Time</th>
                  <th className="px-5 py-2 text-left">Event</th>
                  <th className="px-5 py-2 text-left">Source IP</th>
                  <th className="px-5 py-2 text-left">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {scan.timeline.map((e, i) => (
                  <tr key={`${e.timestamp_wib}-${i}`} className="hover:bg-accent/30">
                    <td className="px-5 py-2.5 font-mono text-xs whitespace-nowrap">
                      {e.timestamp_wib}
                    </td>
                    <td className="px-5 py-2.5">{e.event}</td>
                    <td className="px-5 py-2.5 font-mono text-xs">{e.source_ip ?? "—"}</td>
                    <td className="px-5 py-2.5 text-xs text-muted-foreground">{e.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {scan.recommendations.length > 0 && (
        <div className="border-t border-border px-5 py-4 bg-card">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Recommendations
          </div>
          <ul className="space-y-1.5 text-sm">
            {scan.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                    r.priority === "urgent"
                      ? "bg-danger/10 text-danger"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {r.priority === "urgent" ? "Urgent" : "Follow-up"}
                </span>
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function UpgradeReportDetail({
  upgrade,
  onDownload,
  downloading,
  pdfAvailable,
}: {
  upgrade: NginxUpgradeResultView
  onDownload: () => void
  downloading: boolean
  pdfAvailable: boolean
}) {
  return (
    <div className="border-t border-border bg-muted/20">
      {pdfAvailable && (
        <div className="flex items-center justify-end border-b border-border px-5 py-2">
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            Download PDF
          </button>
        </div>
      )}
      <div className="grid gap-3 px-5 py-4 md:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">Channel</div>
          <div className="mt-1 text-sm font-medium capitalize">{upgrade.channel}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Target version</div>
          <div className="mt-1 font-mono text-sm font-medium">{upgrade.target_version}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Previous</div>
          <div className="mt-1 font-mono text-sm">{upgrade.previous_version ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Installed</div>
          <div className="mt-1 font-mono text-sm">{upgrade.new_version ?? "—"}</div>
        </div>
      </div>
      <div className="border-t border-border px-5 py-4">
        <p className="text-sm">{upgrade.message}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          nginx -t: {upgrade.config_test_ok ? "PASS" : "FAIL"} · nginx service:{" "}
          {upgrade.nginx_active ? "active" : "inactive"}
        </p>
      </div>
    </div>
  )
}

interface ReportLogSectionProps {
  serverId: string
  sshConfigured: boolean
  refreshTrigger?: number
  onLog?: (line: string) => void
}

export function ReportLogSection({
  serverId,
  sshConfigured,
  refreshTrigger = 0,
  onLog,
}: ReportLogSectionProps) {
  const [entries, setEntries] = useState<ReportLogEntryView[]>([])
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [downloadingJobId, setDownloadingJobId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadEntries = useCallback(async (expandLatest = false) => {
    setLoading(true)
    setError(null)
    try {
      const items = await fetchReportLog(serverId)
      setEntries(items)
      if (expandLatest && items.length > 0) {
        setExpandedKey(entryKey(items[0]))
      } else if (items.length === 0) {
        setExpandedKey(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report log")
    } finally {
      setLoading(false)
    }
  }, [serverId])

  useEffect(() => {
    void loadEntries(true)
  }, [loadEntries, refreshTrigger])

  const runScan = async () => {
    if (!sshConfigured) return
    setScanning(true)
    setError(null)
    onLog?.(`> security scan ${serverId}`)
    try {
      const result = await runSecurityScanReport(serverId)
      await loadEntries(false)
      setExpandedKey(`security_scan-${result.job_id ?? result.scanned_at}`)
      onLog?.(
        `✓ security scan completed — ${result.findings.length} finding(s), severity ${result.overall_severity}`,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "Security scan failed"
      setError(message)
      onLog?.(`✗ ${message}`)
    } finally {
      setScanning(false)
    }
  }

  const toggleExpanded = (key: string) => {
    setExpandedKey((current) => (current === key ? null : key))
  }

  const downloadReport = async (jobId: number | null) => {
    if (jobId == null) return
    setDownloadingJobId(jobId)
    setError(null)
    onLog?.(`> download report PDF job ${jobId}`)
    try {
      await downloadReportLogPdf(jobId)
      onLog?.(`✓ report PDF downloaded (job ${jobId})`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "PDF download failed"
      setError(message)
      onLog?.(`✗ ${message}`)
    } finally {
      setDownloadingJobId(null)
    }
  }

  const latest = entries[0] ?? null

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Report Log</h3>
          {latest && (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-medium",
                REPORT_TONE_STYLES[latest.status_tone],
              )}
            >
              Latest: {latestHeaderLabel(latest)}
            </span>
          )}
          {entries.length > 0 && (
            <span className="text-xs text-muted-foreground">{entries.length} report(s)</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void runScan()}
          disabled={scanning || !sshConfigured}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
          title="Run new security scan"
        >
          {scanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Security scan
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading report log…
        </div>
      ) : error ? (
        <div className="px-5 py-8 text-center text-sm text-destructive">{error}</div>
      ) : entries.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          {!sshConfigured
            ? "Configure SSH key to generate reports."
            : "No reports yet. Run a security scan or nginx upgrade to add entries."}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {entries.map((entry, index) => {
            const key = entryKey(entry)
            const isExpanded = expandedKey === key
            const scan = entry.security_scan
            const upgrade = entry.nginx_upgrade
            return (
              <li key={key}>
                <div className="flex w-full items-center gap-2 px-5 py-3 hover:bg-accent/40 transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(key)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{formatScannedAt(entry.created_at)}</span>
                        {index === 0 && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                            Latest
                          </span>
                        )}
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {REPORT_TYPE_LABELS[entry.report_type]}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-xs font-medium",
                            REPORT_TONE_STYLES[entry.status_tone],
                          )}
                        >
                          {entry.status_label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{entry.summary}</p>
                    </div>
                  </button>
                  {entry.pdf_available && (
                    <button
                      type="button"
                      onClick={() => void downloadReport(entry.job_id)}
                      disabled={downloadingJobId === entry.job_id}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
                      title="Download PDF report"
                    >
                      {downloadingJobId === entry.job_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      PDF
                    </button>
                  )}
                </div>
                {isExpanded && scan && (
                  <SecurityScanDetail
                    scan={scan}
                    onDownload={() => void downloadReport(entry.job_id)}
                    downloading={downloadingJobId === entry.job_id}
                  />
                )}
                {isExpanded && upgrade && (
                  <UpgradeReportDetail
                    upgrade={upgrade}
                    pdfAvailable={entry.pdf_available}
                    onDownload={() => void downloadReport(entry.job_id)}
                    downloading={downloadingJobId === entry.job_id}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** @deprecated Use ReportLogSection */
export const SecurityCheckSection = ReportLogSection
