"use client"

import Link from "next/link"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpCircle,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  HardDrive,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { generateNginxFleetReport, generateNginxServiceReport } from "@/lib/nginx/service-report-pdf"
import {
  loadNginxServiceFleet,
  removeNginxServiceDevice,
  runNginxServiceCheck,
} from "@/lib/nginx/service-api"
import { useCommandTasks } from "@/components/command-tasks/command-task-provider"
import {
  buildNginxUpgradeOptions,
  defaultUpgradeOptionId,
  isNginxOutdated,
} from "@/lib/nginx/nginx-upgrade-versions"
import type { NginxServiceView, ServiceCveView } from "@/lib/nginx/service-types"
import {
  DEFAULT_SERVICE_CHECK_SETTINGS,
  formatCheckSchedule,
  formatNextCheckAt,
  loadServiceCheckSettings,
  saveServiceCheckSettings,
  type NginxServiceCheckSettings,
} from "@/lib/nginx/service-check-settings"
import { AddNginxServiceDialog } from "./add-nginx-service-dialog"
import { EditNginxServiceDialog } from "./edit-nginx-service-dialog"
import { NginxServiceSettingsDialog } from "./nginx-service-settings-dialog"
import { ReportLogSection } from "./report-log-section"

const severityStyles: Record<ServiceCveView["severity"], string> = {
  critical: "bg-danger/10 text-danger border-danger/30",
  high: "bg-danger/10 text-danger border-danger/20",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
}

function StatusDot({ status }: { status: NginxServiceView["status"] }) {
  const map = {
    running: "bg-success",
    stopped: "bg-danger",
    unknown: "bg-muted-foreground",
  } as const
  return <span className={cn("inline-block h-2 w-2 rounded-full", map[status])} />
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  hint?: string
  tone?: "default" | "success" | "warning" | "danger"
}) {
  const toneMap = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="uppercase tracking-wide">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <div className={cn("mt-2 text-2xl font-semibold tracking-tight", toneMap[tone])}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

function ServerDetail({
  server,
  onBack,
  onRefresh,
  log,
  pushLog,
}: {
  server: NginxServiceView
  onBack: () => void
  onRefresh: () => Promise<void>
  log: string[]
  pushLog: (line: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [upgradeConfirmOpen, setUpgradeConfirmOpen] = useState(false)
  const [reportLogRefresh, setReportLogRefresh] = useState(0)
  const {
    tasks,
    startNginxUpgrade,
    registerOnComplete,
    resumeActiveUpgradeForServer,
  } = useCommandTasks()

  const upgradeTask = tasks.find(
    (t) => t.serverId === server.id && t.kind === "nginx_upgrade",
  )
  const upgrading = upgradeTask?.status === "running"
  const cves = server.cves
  const outdated = isNginxOutdated(server.version, server.latestVersion)

  const upgradeOptions = useMemo(
    () =>
      outdated
        ? buildNginxUpgradeOptions(
            server.version,
            server.latestVersion,
            server.latestMainlineVersion,
          )
        : [],
    [outdated, server.version, server.latestVersion, server.latestMainlineVersion],
  )

  const [selectedUpgradeId, setSelectedUpgradeId] = useState<string | null>(null)

  useEffect(() => {
    setSelectedUpgradeId(defaultUpgradeOptionId(upgradeOptions))
  }, [server.id, upgradeOptions])

  const selectedUpgrade = useMemo(
    () => upgradeOptions.find((o) => o.id === selectedUpgradeId) ?? upgradeOptions[0],
    [upgradeOptions, selectedUpgradeId],
  )

  const runCheck = async () => {
    if (!server.sshConfigured) {
      pushLog(`✗ SSH key not configured for ${server.name}`)
      return
    }
    setBusy(true)
    pushLog(`> nginx check ${server.displayName} (${server.ip})`)
    try {
      await runNginxServiceCheck(server.id)
      await onRefresh()
      pushLog(`✓ check completed on ${server.displayName}`)
    } catch (err) {
      pushLog(`✗ ${err instanceof Error ? err.message : "Check failed"}`)
    } finally {
      setBusy(false)
    }
  }

  const exportServerPdf = () => {
    generateNginxServiceReport(server)
    pushLog(`✓ exported PDF report for ${server.displayName}`)
  }

  useEffect(() => {
    void resumeActiveUpgradeForServer({
      serverId: server.id,
      serverName: server.displayName,
      serverIp: server.ip,
    })
  }, [server.id, server.displayName, server.ip, resumeActiveUpgradeForServer])

  useEffect(() => {
    return registerOnComplete((task) => {
      if (task.serverId !== server.id || task.kind !== "nginx_upgrade") return
      void (async () => {
        await onRefresh()
        setReportLogRefresh((v) => v + 1)
        pushLog(
          task.status === "success"
            ? `✓ upgraded ${server.displayName} (see Report Log)`
            : `✗ upgrade failed: ${task.resultMessage ?? "unknown error"}`,
        )
      })()
    })
  }, [server.id, server.displayName, onRefresh, pushLog, registerOnComplete])

  const runUpgrade = async () => {
    if (!selectedUpgrade || !server.sshConfigured || upgrading) return
    setUpgradeConfirmOpen(false)
    pushLog(
      `> nginx upgrade ${server.displayName} → ${selectedUpgrade.channel} ${selectedUpgrade.version}`,
    )
    try {
      await startNginxUpgrade({
        serverId: server.id,
        serverName: server.displayName,
        serverIp: server.ip,
        payload: {
          channel: selectedUpgrade.channel,
          target_version: selectedUpgrade.version,
        },
      })
    } catch (err) {
      pushLog(`✗ ${err instanceof Error ? err.message : "Upgrade failed"}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to list
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">{server.displayName}</h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                  server.status === "running"
                    ? "border-success/30 bg-success/10 text-success"
                    : server.status === "stopped"
                      ? "border-danger/30 bg-danger/10 text-danger"
                      : "border-border bg-muted text-muted-foreground",
                )}
              >
                <StatusDot status={server.status} />
                {server.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {server.inventoryHostname} · {server.ip} · {server.os} · checked {server.lastChecked}
            </p>
            {!server.sshConfigured && (
              <p className="mt-2 text-sm text-warning">
                SSH key not configured — assign a key in{" "}
                <Link href="/resource-pool/device-inventory" className="underline underline-offset-2">
                  Device Inventory
                </Link>
                .
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={runCheck} disabled={busy || !server.sshConfigured}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Check now
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat icon={ShieldCheck} label="Risk level" value={server.overallRisk.toUpperCase()} />
          <Stat
            icon={CheckCircle2}
            label="Config test"
            value={
              server.configTestOk === null ? "—" : server.configTestOk ? "PASS" : "FAIL"
            }
            tone={server.configTestOk === false ? "danger" : "default"}
          />
          <Stat
            icon={Server}
            label="Nginx UI"
            value={
              server.nginxUiActive === null ? "—" : server.nginxUiActive ? "Active" : "Inactive"
            }
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Version check
            </h3>
            {outdated ? (
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                Update available
              </span>
            ) : server.version !== "—" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                <CheckCircle2 className="h-3 w-3" /> Up to date
              </span>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Installed</div>
              <div className="mt-1 font-mono text-2xl font-semibold">{server.version}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Latest stable</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-primary">
                {server.latestVersion}
              </div>
            </div>
          </div>
          {outdated && upgradeOptions.length > 0 && (
            <div className="mt-4 space-y-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor={`upgrade-version-${server.id}`}
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Upgrade nginx to
                </label>
                <span className="text-[11px] text-muted-foreground">
                  via nginx.org repository
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={selectedUpgradeId ?? upgradeOptions[0]?.id}
                  onValueChange={setSelectedUpgradeId}
                >
                  <SelectTrigger
                    id={`upgrade-version-${server.id}`}
                    className="min-w-[200px] flex-1 bg-card"
                    size="sm"
                  >
                    <SelectValue placeholder="Select target version" />
                  </SelectTrigger>
                  <SelectContent>
                    {upgradeOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!selectedUpgrade || upgrading || busy || !server.sshConfigured}
                  onClick={() => setUpgradeConfirmOpen(true)}
                >
                  {upgrading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                  )}
                  Upgrade
                </Button>
              </div>
              {selectedUpgrade && (
                <p className="text-xs text-muted-foreground">{selectedUpgrade.hint}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Backs up /etc/nginx, switches APT to nginx.org, installs package, runs nginx -t,
                and holds the package. Allow several minutes; service may restart briefly.
              </p>
              <AlertDialog open={upgradeConfirmOpen} onOpenChange={setUpgradeConfirmOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm nginx upgrade</AlertDialogTitle>
                    <AlertDialogDescription>
                      Upgrade <strong>{server.displayName}</strong> ({server.ip}) from{" "}
                      <strong>{server.version}</strong> to{" "}
                      <strong>
                        {selectedUpgrade?.channel} {selectedUpgrade?.version}
                      </strong>
                      ? This runs remotely over SSH and may restart nginx / nginx-ui.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={upgrading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={upgrading}
                      onClick={(e) => {
                        e.preventDefault()
                        void runUpgrade()
                      }}
                    >
                      {upgrading ? "Upgrading…" : "Run upgrade"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
          {server.recommendation && (
            <p className="mt-4 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              {server.recommendation}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                CVE check
              </h3>
            </div>
            <button
              type="button"
              onClick={runCheck}
              disabled={busy || !server.sshConfigured}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Re-scan
            </button>
          </div>
          <div className="mt-4">
            {cves.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-3 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                {server.version === "—"
                  ? "Run SSH check to assess CVEs"
                  : `No open CVEs for version ${server.version}`}
              </div>
            ) : (
              <div className="text-sm">
                <div className="mb-2 text-xs text-muted-foreground">
                  {cves.length} open finding{cves.length === 1 ? "" : "s"}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cves.map((c) => (
                    <span
                      key={c.id}
                      className={cn(
                        "rounded-md border px-2 py-0.5 font-mono text-xs",
                        severityStyles[c.severity],
                      )}
                    >
                      {c.id}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold">Vulnerability details</h3>
          <button
            type="button"
            onClick={exportServerPdf}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-accent"
            title={`Export PDF for ${server.displayName}`}
          >
            <Download className="h-3 w-3" /> Server report
          </button>
        </div>
        {cves.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No open vulnerabilities recorded for this server.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-2 text-left">CVE</th>
                  <th className="px-5 py-2 text-left">Severity</th>
                  <th className="px-5 py-2 text-left">Module</th>
                  <th className="px-5 py-2 text-left">Description</th>
                  <th className="px-5 py-2 text-left">Fixed in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cves.map((c) => (
                  <tr key={c.id} className="hover:bg-accent/30">
                    <td className="px-5 py-2.5 font-mono text-xs">{c.id}</td>
                    <td className="px-5 py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium capitalize",
                          severityStyles[c.severity],
                        )}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {c.severity}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 font-mono text-xs">{c.module}</td>
                    <td className="px-5 py-2.5">{c.title}</td>
                    <td className="px-5 py-2.5 font-mono text-xs">{c.fixedIn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReportLogSection
        serverId={server.id}
        sshConfigured={server.sshConfigured}
        refreshTrigger={reportLogRefresh}
        onLog={pushLog}
      />

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Activity log</h3>
        </div>
        <pre className="max-h-56 overflow-auto bg-secondary/40 px-5 py-3 font-mono text-xs leading-relaxed text-foreground/80">
          {log.join("\n")}
        </pre>
      </div>
    </div>
  )
}

export function NginxServiceManagement() {
  const [servers, setServers] = useState<NginxServiceView[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<NginxServiceView | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NginxServiceView | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [checkSettings, setCheckSettings] = useState<NginxServiceCheckSettings>(
    DEFAULT_SERVICE_CHECK_SETTINGS,
  )
  const [log, setLog] = useState<string[]>(["[boot] Nginx Service Management ready"])

  const reload = useCallback(async () => {
    const fleet = await loadNginxServiceFleet()
    setServers(fleet)
    return fleet
  }, [])

  useEffect(() => {
    setCheckSettings(loadServiceCheckSettings())
    void (async () => {
      try {
        setLoading(true)
        setError(null)
        const fleet = await reload()
        setLog((l) => [
          ...l.slice(-80),
          `[${new Date().toLocaleTimeString()}] loaded ${fleet.length} nginx device(s) from inventory`,
        ])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load nginx fleet")
      } finally {
        setLoading(false)
      }
    })()
  }, [reload])

  const selected = selectedId ? servers.find((s) => s.id === selectedId) : null

  const totals = useMemo(
    () => ({
      running: servers.filter((s) => s.status === "running").length,
      stopped: servers.filter((s) => s.status === "stopped").length,
      unknown: servers.filter((s) => s.status === "unknown").length,
      outdated: servers.filter((s) => isNginxOutdated(s.version, s.latestVersion)).length,
      vulns: servers.reduce((a, s) => a + s.cves.length, 0),
    }),
    [servers],
  )

  const pushLog = (line: string) =>
    setLog((l) => [...l.slice(-80), `[${new Date().toLocaleTimeString()}] ${line}`])

  const exportFleetPdf = () => {
    generateNginxFleetReport(servers)
    pushLog(`✓ exported fleet PDF report (${servers.length} servers)`)
  }

  const runManualCheck = async () => {
    if (servers.length === 0) return
    setChecking(true)
    pushLog(`> manual check triggered for ${servers.length} server(s)`)
    for (const s of servers) {
      if (!s.sshConfigured) {
        pushLog(`⊘ skipped ${s.displayName} — no SSH key`)
        continue
      }
      try {
        await runNginxServiceCheck(s.id)
        pushLog(`✓ ${s.displayName}`)
      } catch (err) {
        pushLog(`✗ ${s.displayName}: ${err instanceof Error ? err.message : "failed"}`)
      }
    }
    try {
      await reload()
      pushLog("✓ fleet snapshot refreshed")
    } catch (err) {
      pushLog(`✗ reload failed: ${err instanceof Error ? err.message : "unknown"}`)
    } finally {
      setChecking(false)
    }
  }

  const handleSaveSettings = async (next: NginxServiceCheckSettings) => {
    saveServiceCheckSettings(next)
    setCheckSettings(next)
    pushLog(`> check schedule updated: ${formatCheckSchedule(next)}`)
    pushLog(`  next run: ${formatNextCheckAt(next)}`)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await removeNginxServiceDevice(deleteTarget.id)
      if (selectedId === deleteTarget.id) setSelectedId(null)
      await reload()
      pushLog(`✓ removed ${deleteTarget.displayName} from nginx service fleet`)
      setDeleteTarget(null)
    } catch (err) {
      pushLog(`✗ delete failed: ${err instanceof Error ? err.message : "unknown"}`)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading nginx fleet…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-6 text-center">
        <p className="text-danger font-medium">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  if (selected) {
    return (
      <ServerDetail
        server={selected}
        onRefresh={reload}
        log={log}
        pushLog={pushLog}
        onBack={() => setSelectedId(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Nginx Service Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {servers.length} nginx device{servers.length !== 1 ? "s" : ""} from inventory · {totals.running}{" "}
            running
            {totals.unknown > 0 ? ` · ${totals.unknown} unchecked` : ""} · scheduled{" "}
            {formatCheckSchedule(checkSettings).toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Nginx
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void runManualCheck()}
            disabled={checking || servers.length === 0}
          >
            {checking ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Check now
          </Button>
          <button
            type="button"
            onClick={exportFleetPdf}
            disabled={servers.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            title="Export PDF for all monitored servers"
          >
            <FileText className="h-4 w-4" />
            Export fleet report
          </button>
        </div>
      </div>

      {servers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Server className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No nginx devices yet</h2>
          <p className="mt-2 max-w-md mx-auto text-sm text-muted-foreground">
            Add servers from Device Inventory with role <strong>Nginx UI</strong> or{" "}
            <strong>Nginx Proxy</strong>, then run an SSH check here.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Nginx
            </Button>
            <Button variant="outline" asChild>
              <Link href="/resource-pool/device-inventory">Open Device Inventory</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={Server} label="Monitored" value={String(servers.length)} hint="Nginx UI / Proxy" />
            <Stat icon={CheckCircle2} label="Running" value={String(totals.running)} tone="success" />
            <Stat
              icon={ArrowUpCircle}
              label="Outdated"
              value={String(totals.outdated)}
              tone="warning"
              hint="Behind latest stable"
            />
            <Stat
              icon={ShieldAlert}
              label="Open CVEs"
              value={String(totals.vulns)}
              tone={totals.vulns ? "danger" : "success"}
            />
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Server</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Address</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Version</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">CVEs</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Last checked</th>
                  <th className="w-20 px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {servers.map((s) => {
                  const vulnCount = s.cves.length
                  const outdated = isNginxOutdated(s.version, s.latestVersion)
                  return (
                    <tr
                      key={s.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => setSelectedId(s.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <p className="font-medium">{s.displayName}</p>
                            <p className="text-xs text-muted-foreground">{s.os}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-muted px-2 py-1 text-xs">{s.ip}</code>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={cn(
                            s.status === "running" && "bg-success/15 text-success border-success/30",
                            s.status === "stopped" && "bg-danger/15 text-danger border-danger/30",
                            s.status === "unknown" && "bg-muted text-muted-foreground",
                          )}
                        >
                          <StatusDot status={s.status} />
                          <span className="ml-1.5 capitalize">{s.status}</span>
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-mono">{s.version}</div>
                        {s.version === "—" ? (
                          <span className="text-xs text-muted-foreground">Run check</span>
                        ) : outdated ? (
                          <span className="text-xs text-warning">→ {s.latestVersion}</span>
                        ) : (
                          <span className="text-xs text-success">Up to date</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {vulnCount > 0 ? (
                          <span className="inline-flex rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
                            {vulnCount} open
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.lastChecked}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => setSelectedId(s.id)}>
                                <ChevronRight className="h-4 w-4 mr-2" />
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditTarget(s)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(s)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove from fleet
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <EditNginxServiceDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        server={editTarget}
        onSaved={async () => {
          await reload()
          pushLog(`✓ updated ${editTarget?.displayName ?? "device"}`)
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove nginx device?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.displayName}</strong> ({deleteTarget?.ip}) akan dihapus dari Nginx Service
              Management. Role device di Resource Pool dikembalikan ke General — device tidak dihapus
              permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Removing…
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddNginxServiceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={async () => {
          await reload()
          pushLog("✓ nginx device added from inventory")
        }}
      />

      <NginxServiceSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={checkSettings}
        onSave={handleSaveSettings}
      />
    </div>
  )
}
