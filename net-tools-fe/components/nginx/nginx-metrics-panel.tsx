"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  Cpu,
  Loader2,
  MemoryStick,
  Network,
  RefreshCw,
  Settings,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  fetchNginxMetrics,
  fetchNginxMetricsHistory,
  fetchNginxMetricsLatest,
  fetchNginxMetricsSettings,
  formatBitrate,
  updateNginxMetricsSettings,
  type NginxUiMetricHistoryRecord,
  type NginxUiMetricsRecord,
  type NginxUiMetricsSettingsRecord,
} from "@/lib/nginx/api"

const HISTORY_RANGES = ["1h", "6h", "24h", "7d"] as const
const LIVE_REFRESH_SECONDS = [10, 15, 30] as const

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  progress,
}: {
  label: string
  value: string
  hint?: string
  icon: typeof Cpu
  progress?: number
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {progress !== undefined && (
        <Progress value={Math.min(Math.max(progress, 0), 100)} className="mt-3 h-2" />
      )}
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function HistoryChart({
  title,
  data,
  dataKey,
  color,
  unit,
  formatter,
}: {
  title: string
  data: Array<Record<string, string | number | null>>
  dataKey: string
  color: string
  unit: string
  formatter?: (value: number) => string
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <p className="mb-3 text-sm font-medium">{title}</p>
      <div className="h-[160px]">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No samples yet — collector runs in background
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [
                  formatter ? formatter(value) : `${value}${unit}`,
                  title,
                ]}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${dataKey})`}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export function NginxMetricsPanel({ serverId }: { serverId: string }) {
  const [monitorTab, setMonitorTab] = useState<"live" | "historical">("live")
  const [liveRefreshSeconds, setLiveRefreshSeconds] = useState<(typeof LIVE_REFRESH_SECONDS)[number]>(10)
  const [metrics, setMetrics] = useState<NginxUiMetricsRecord | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [rxRate, setRxRate] = useState<number | null>(null)
  const [txRate, setTxRate] = useState<number | null>(null)
  const prevNetworkRef = useRef<{ rx: number; tx: number; at: number } | null>(null)

  const [historyRange, setHistoryRange] = useState<(typeof HISTORY_RANGES)[number]>("24h")
  const [history, setHistory] = useState<NginxUiMetricHistoryRecord | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<NginxUiMetricsSettingsRecord>({
    poll_interval_seconds: 30,
    retention_days: 7,
  })
  const [settingsDraft, setSettingsDraft] = useState(settings)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  const applyNetworkRates = useCallback((data: NginxUiMetricsRecord) => {
    if (data.network_rx_bytes == null || data.network_tx_bytes == null) return
    const now = Date.parse(data.collected_at) || Date.now()
    const prev = prevNetworkRef.current
    if (prev) {
      const elapsed = (now - prev.at) / 1000
      if (elapsed > 0) {
        setRxRate(Math.max(0, (data.network_rx_bytes - prev.rx) / elapsed))
        setTxRate(Math.max(0, (data.network_tx_bytes - prev.tx) / elapsed))
      }
    }
    prevNetworkRef.current = { rx: data.network_rx_bytes, tx: data.network_tx_bytes, at: now }
  }, [])

  const loadLatestMetrics = useCallback(async () => {
    setMetricsLoading(true)
    setMetricsError(null)
    try {
      const data = await fetchNginxMetricsLatest(serverId)
      setMetrics(data)
      applyNetworkRates(data)
    } catch (err) {
      setMetricsError(err instanceof Error ? err.message : "Failed to load metrics")
      setMetrics(null)
    } finally {
      setMetricsLoading(false)
    }
  }, [applyNetworkRates, serverId])

  const refreshMetrics = useCallback(async () => {
    setMetricsLoading(true)
    setMetricsError(null)
    try {
      const data = await fetchNginxMetrics(serverId)
      setMetrics(data)
      applyNetworkRates(data)
    } catch (err) {
      setMetricsError(err instanceof Error ? err.message : "Failed to refresh metrics")
    } finally {
      setMetricsLoading(false)
    }
  }, [applyNetworkRates, serverId])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const data = await fetchNginxMetricsHistory(serverId, historyRange)
      setHistory(data)
      setSettings({
        poll_interval_seconds: data.poll_interval_seconds,
        retention_days: data.retention_days,
      })
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Failed to load history")
      setHistory(null)
    } finally {
      setHistoryLoading(false)
    }
  }, [historyRange, serverId])

  const openSettings = useCallback(async () => {
    setSettingsError(null)
    try {
      const data = await fetchNginxMetricsSettings(serverId)
      setSettings(data)
      setSettingsDraft(data)
      setSettingsOpen(true)
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Failed to load settings")
    }
  }, [serverId])

  const saveSettings = async () => {
    setSettingsSaving(true)
    setSettingsError(null)
    try {
      const updated = await updateNginxMetricsSettings(serverId, settingsDraft)
      setSettings(updated)
      setSettingsOpen(false)
      if (monitorTab === "historical") {
        await loadHistory()
      }
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Failed to save settings")
    } finally {
      setSettingsSaving(false)
    }
  }

  useEffect(() => {
    void fetchNginxMetricsSettings(serverId)
      .then(setSettings)
      .catch(() => undefined)
  }, [serverId])

  useEffect(() => {
    void loadLatestMetrics()
  }, [loadLatestMetrics])

  useEffect(() => {
    if (monitorTab !== "live") return
    const timer = window.setInterval(() => {
      void loadLatestMetrics()
    }, liveRefreshSeconds * 1000)
    return () => window.clearInterval(timer)
  }, [loadLatestMetrics, liveRefreshSeconds, monitorTab])

  useEffect(() => {
    if (monitorTab === "historical") {
      void loadHistory()
    }
  }, [loadHistory, monitorTab])

  const chartData = useMemo(
    () =>
      (history?.points ?? []).map((point) => ({
        label: new Date(point.collected_at).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        cpu: point.host_cpu_percent,
        memory: point.host_memory_percent,
        connections: point.active_connections,
        rx: point.rx_bytes_per_sec,
        tx: point.tx_bytes_per_sec,
      })),
    [history?.points],
  )

  const formatPercent = (value: number | null | undefined) =>
    value == null ? "—" : `${value.toFixed(1)}%`

  return (
    <>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/50 px-4 py-3">
          <div>
            <div className="inline-flex rounded-md border border-border p-0.5">
              <Button
                variant={monitorTab === "live" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMonitorTab("live")}
              >
                Live
              </Button>
              <Button
                variant={monitorTab === "historical" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMonitorTab("historical")}
              >
                Historical
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {monitorTab === "live"
                ? `Background collector every ${settings.poll_interval_seconds}s · retention ${settings.retention_days}d`
                : `Stored samples · poll ${settings.poll_interval_seconds}s · retention ${settings.retention_days}d`}
              {metrics?.collected_at && monitorTab === "live"
                ? ` · updated ${new Date(metrics.collected_at).toLocaleTimeString("id-ID")}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {monitorTab === "historical" && (
              <>
                <div className="flex items-center gap-1">
                  {HISTORY_RANGES.map((range) => (
                    <Button
                      key={range}
                      variant={historyRange === range ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHistoryRange(range)}
                    >
                      {range}
                    </Button>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => void openSettings()}>
                  <Settings className="h-4 w-4" />
                  <span className="ml-2">Settings</span>
                </Button>
              </>
            )}
            {monitorTab === "live" && (
              <Select
                value={String(liveRefreshSeconds)}
                onValueChange={(value) =>
                  setLiveRefreshSeconds(Number(value) as (typeof LIVE_REFRESH_SECONDS)[number])
                }
              >
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder="Auto refresh" />
                </SelectTrigger>
                <SelectContent>
                  {LIVE_REFRESH_SECONDS.map((seconds) => (
                    <SelectItem key={seconds} value={String(seconds)}>
                      Auto refresh {seconds}s
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                monitorTab === "live" ? void refreshMetrics() : void loadHistory()
              }
              disabled={monitorTab === "live" ? metricsLoading : historyLoading}
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  (monitorTab === "live" ? metricsLoading : historyLoading) && "animate-spin",
                )}
              />
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
        </div>

        {monitorTab === "live" ? (
          <>
            {metricsError && (
              <p className="text-sm text-destructive border-b border-destructive/20 bg-destructive/5 px-4 py-3">
                {metricsError}
              </p>
            )}
            <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="CPU"
                value={metricsLoading && !metrics ? "…" : formatPercent(metrics?.host_cpu_percent)}
                hint={
                  metrics?.nginx_cpu_percent != null
                    ? `nginx workers ${metrics.nginx_cpu_percent.toFixed(1)}%`
                    : undefined
                }
                icon={Cpu}
                progress={metrics?.host_cpu_percent ?? undefined}
              />
              <MetricCard
                label="Memory"
                value={
                  metricsLoading && !metrics
                    ? "…"
                    : metrics?.host_memory_used_mb != null && metrics.host_memory_total_mb != null
                      ? `${metrics.host_memory_used_mb.toFixed(0)} / ${metrics.host_memory_total_mb.toFixed(0)} MB`
                      : "—"
                }
                hint={
                  metrics?.nginx_memory_mb != null
                    ? `nginx ${metrics.nginx_memory_mb.toFixed(1)} MB`
                    : undefined
                }
                icon={MemoryStick}
                progress={metrics?.host_memory_percent ?? undefined}
              />
              <MetricCard
                label="Bandwidth"
                value={
                  metricsLoading && !metrics
                    ? "…"
                    : rxRate != null && txRate != null
                      ? `${formatBitrate(rxRate)} ↓ · ${formatBitrate(txRate)} ↑`
                      : "Collecting…"
                }
                hint={
                  metrics?.network_interface
                    ? `interface ${metrics.network_interface}`
                    : "Rate from consecutive samples"
                }
                icon={Network}
              />
              <MetricCard
                label="Active connections"
                value={metricsLoading && !metrics ? "…" : String(metrics?.active_connections ?? 0)}
                hint={
                  metrics
                    ? `${metrics.reading} reading · ${metrics.writing} writing · ${metrics.waiting} waiting`
                    : undefined
                }
                icon={Activity}
              />
            </div>
          </>
        ) : (
          <>
            {historyError && (
              <p className="text-sm text-destructive border-b border-destructive/20 bg-destructive/5 px-4 py-3">
                {historyError}
              </p>
            )}
            {historyLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading historical metrics…
              </div>
            ) : (
              <div className="grid gap-4 p-4 lg:grid-cols-2">
                <HistoryChart title="CPU (%)" data={chartData} dataKey="cpu" color="#16a34a" unit="%" />
                <HistoryChart title="Memory (%)" data={chartData} dataKey="memory" color="#2563eb" unit="%" />
                <HistoryChart
                  title="Download"
                  data={chartData}
                  dataKey="rx"
                  color="#0891b2"
                  unit=""
                  formatter={(v) => formatBitrate(v)}
                />
                <HistoryChart
                  title="Upload"
                  data={chartData}
                  dataKey="tx"
                  color="#7c3aed"
                  unit=""
                  formatter={(v) => formatBitrate(v)}
                />
                <div className="lg:col-span-2">
                  <HistoryChart
                    title="Active connections"
                    data={chartData}
                    dataKey="connections"
                    color="#ea580c"
                    unit=""
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Metrics settings</DialogTitle>
            <DialogDescription>
              Background collector runs while the NetTools backend is up. Changes apply to this
              nginx-ui instance only.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="poll-interval">Polling interval (seconds)</Label>
              <Input
                id="poll-interval"
                type="number"
                min={10}
                max={300}
                value={settingsDraft.poll_interval_seconds}
                onChange={(e) =>
                  setSettingsDraft((prev) => ({
                    ...prev,
                    poll_interval_seconds: Number(e.target.value),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">Min 10s, max 300s</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="retention-days">Retention (days)</Label>
              <Input
                id="retention-days"
                type="number"
                min={1}
                max={90}
                value={settingsDraft.retention_days}
                onChange={(e) =>
                  setSettingsDraft((prev) => ({
                    ...prev,
                    retention_days: Number(e.target.value),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">Samples older than this are deleted hourly</p>
            </div>
            {settingsError && <p className="text-sm text-destructive">{settingsError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)} disabled={settingsSaving}>
              Cancel
            </Button>
            <Button onClick={() => void saveSettings()} disabled={settingsSaving}>
              {settingsSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
