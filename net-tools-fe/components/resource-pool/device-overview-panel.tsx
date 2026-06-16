"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  Database,
  FileSpreadsheet,
  Link2,
  Loader2,
  RefreshCw,
  ScrollText,
  Settings2,
  Upload,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  DATA_MODE_LABELS,
  INVENTORY_CATEGORY_LABELS,
  resolveDeviceTypeName,
  type DataMode,
  type InventoryCategory,
} from "@/lib/resource-pool/device-inventory-ext"
import {
  fetchNetworkDevice,
  importDatasetCsv,
  patchDatasetBinding,
  syncDatasetLive,
  SyncDatasetError,
} from "@/lib/resource-pool/network-devices-api"
import { isPaloImportCapability, parsePaloCsvImport } from "@/lib/firewall/palo-csv-import"
import { fetchDataConnectors } from "@/lib/resource-pool/data-connectors-api"
import { fetchDeviceTypes } from "@/lib/resource-pool/device-types-api"
import type { NetworkDeviceRecord } from "@/lib/resource-pool/device-inventory-ext"
import {
  connectorsForCapability,
  formatSyncTime,
  IMPORT_KIND_LABELS,
  SOURCE_LABELS,
  type DatasetBinding,
  type DatasetSourceType,
  type DatasetSyncLog,
} from "@/lib/resource-pool/device-overview-mock"
import { PROTOCOL_LABELS } from "@/lib/resource-pool/data-connectors-mock"
import type { DataConnectorRecord } from "@/lib/resource-pool/data-connectors-mock"
import type { DeviceTypeRecord } from "@/lib/resource-pool/device-types-mock"
import { fetchDevices, fetchNginxJobs, groupToRole, latestJobByServer } from "@/lib/resource-pool/servers"

interface DeviceOverviewPanelProps {
  deviceId: string
}

interface ServerContext {
  id: string
  name: string
  hostname: string
  ip: string
  category: InventoryCategory
  role: string
  os: string
  lastSeen: string
  nginxVersion: string
}

function SourceBadge({ source }: { source: DatasetSourceType }) {
  const cls =
    source === "live"
      ? "bg-success/15 text-success border-success/30"
      : source === "import"
        ? "bg-primary/15 text-primary border-primary/30"
        : "bg-muted text-muted-foreground border-border"
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", cls)}>
      {SOURCE_LABELS[source]}
    </span>
  )
}

function SyncStatusBadge({ status }: { status: DatasetBinding["syncStatus"] }) {
  if (status === "ok") {
    return (
      <span className="inline-flex rounded-md border border-success/30 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
        OK
      </span>
    )
  }
  if (status === "error") {
    return (
      <span className="inline-flex rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
        Error
      </span>
    )
  }
  if (status === "syncing") {
    return (
      <span className="inline-flex rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
        Syncing
      </span>
    )
  }
  return null
}

function bindingLogPreview(binding: DatasetBinding): DatasetSyncLog | null {
  if (binding.lastSyncLog) return binding.lastSyncLog
  if (!binding.syncMessage && !binding.lastSyncAt) return null
  return {
    at: binding.lastSyncAt ?? new Date().toISOString(),
    status: binding.syncStatus === "error" ? "error" : "ok",
    message: binding.syncMessage ?? "No message recorded",
    rowCount: binding.rowCount,
    connectorId: binding.connectorId,
    connectorName: binding.connectorName,
    details: binding.syncMessage ? [binding.syncMessage] : [],
  }
}

export function DeviceOverviewPanel({ deviceId }: DeviceOverviewPanelProps) {
  const [networkDevice, setNetworkDevice] = useState<NetworkDeviceRecord | null>(null)
  const [bindings, setBindings] = useState<DatasetBinding[]>([])
  const [deviceTypes, setDeviceTypes] = useState<DeviceTypeRecord[]>([])
  const [connectors, setConnectors] = useState<DataConnectorRecord[]>([])
  const [serverCtx, setServerCtx] = useState<ServerContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [configureTarget, setConfigureTarget] = useState<DatasetBinding | null>(null)
  const [configSource, setConfigSource] = useState<DatasetSourceType>("unset")
  const [configConnectorId, setConfigConnectorId] = useState<string>("")
  const [syncingKey, setSyncingKey] = useState<string | null>(null)
  const [logTarget, setLogTarget] = useState<DatasetBinding | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importTargetKey, setImportTargetKey] = useState<string | null>(null)

  const catalogOptions = useMemo(
    () => ({ types: deviceTypes, connectors }),
    [deviceTypes, connectors],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setNetworkDevice(null)
    setServerCtx(null)

    Promise.all([fetchDeviceTypes(), fetchDataConnectors()])
      .then(([types, loadedConnectors]) => {
        if (cancelled) return { types, loadedConnectors }
        setDeviceTypes(types)
        setConnectors(loadedConnectors)
        return { types, loadedConnectors }
      })
      .then(() => fetchNetworkDevice(deviceId))
      .then((device) => {
        if (cancelled) return
        setNetworkDevice(device)
        setBindings(device.datasetBindings ?? [])
      })
      .catch(() => {
        if (cancelled) return
        return Promise.all([fetchDevices(), fetchNginxJobs()]).then(([servers, jobs]) => {
          if (cancelled) return
          const server = servers.find((s) => String(s.id) === deviceId)
          if (!server) {
            setError("Device not found")
            setServerCtx(null)
            return
          }
          const job = latestJobByServer(jobs).get(server.id)
          const result = job?.result
          setServerCtx({
            id: String(server.id),
            name: server.name,
            hostname: (result?.hostname as string)?.trim() || server.hostname,
            ip: server.ip,
            category: "server",
            role: groupToRole(server.group),
            os: (result?.os_version as string) ?? "—",
            lastSeen: job?.finished_at
              ? new Date(job.finished_at).toLocaleString("en-GB")
              : "Never checked",
            nginxVersion: (result?.nginx_version as string) ?? "—",
          })
        })
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load device")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [deviceId])

  const header = useMemo(() => {
    if (networkDevice) {
      const typeName = resolveDeviceTypeName(
        networkDevice.deviceTypeId,
        deviceTypes,
        networkDevice.deviceTypeName,
      )
      return {
        name: networkDevice.name,
        hostname: networkDevice.hostname,
        ip: networkDevice.ip,
        category: networkDevice.category as InventoryCategory,
        deviceTypeName: typeName,
        dataMode: networkDevice.dataMode,
        os: networkDevice.os || "—",
      }
    }
    if (serverCtx) {
      return {
        name: serverCtx.name,
        hostname: serverCtx.hostname,
        ip: serverCtx.ip,
        category: serverCtx.category,
        deviceTypeName: undefined,
        dataMode: undefined,
        os: serverCtx.os,
      }
    }
    return null
  }, [networkDevice, serverCtx, deviceTypes])

  const persistBindingPatch = async (capabilityKey: string, patch: Partial<DatasetBinding>) => {
    if (!networkDevice) return
    const updated = await patchDatasetBinding(
      deviceId,
      capabilityKey,
      patch,
      bindings,
    )
    setNetworkDevice(updated)
    setBindings(updated.datasetBindings ?? [])
  }

  const openConfigure = (binding: DatasetBinding) => {
    if (!networkDevice) return
    const options = connectorsForCapability(
      networkDevice.deviceTypeId,
      binding.capabilityKey,
      catalogOptions,
    )
    setConfigureTarget(binding)
    setConfigSource(binding.source)
    setConfigConnectorId(binding.connectorId ?? options[0]?.id ?? "")
  }

  const saveConfigure = async () => {
    if (!configureTarget || !networkDevice) return
    const options = connectorsForCapability(
      networkDevice.deviceTypeId,
      configureTarget.capabilityKey,
      catalogOptions,
    )
    const connector = options.find((c) => c.id === configConnectorId)
    await persistBindingPatch(configureTarget.capabilityKey, {
      source: configSource,
      connectorId: configSource === "live" ? connector?.id ?? null : connector?.id ?? null,
      connectorName: configSource === "live" ? connector?.name ?? null : connector?.name ?? null,
      syncStatus: configSource === "unset" ? "idle" : configureTarget.syncStatus,
      syncMessage: undefined,
    })
    setConfigureTarget(null)
  }

  const handleImport = async (capabilityKey: string, file: File) => {
    if (!networkDevice) return
    try {
      const csvText = await file.text()
      if (!isPaloImportCapability(capabilityKey)) {
        throw new Error(`Import not supported for ${capabilityKey}`)
      }
      const parsed = parsePaloCsvImport(capabilityKey, csvText)
      const updated = await importDatasetCsv(
        deviceId,
        capabilityKey,
        {
          source: "import",
          importFileName: file.name,
          rowCount: parsed.count,
          lastSyncAt: new Date().toISOString(),
          syncStatus: "ok",
          syncMessage: undefined,
        },
        bindings,
        networkDevice.datasetData ?? {},
        parsed.rows,
      )
      setNetworkDevice(updated)
      setBindings(updated.datasetBindings ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed"
      const now = new Date().toISOString()
      await persistBindingPatch(capabilityKey, {
        syncStatus: "error",
        syncMessage: message,
        lastSyncLog: {
          at: now,
          status: "error",
          message,
          details: [message],
        },
      })
    }
    setImportTargetKey(null)
  }

  const handleSync = async (binding: DatasetBinding) => {
    if (!networkDevice || binding.source !== "live" || !binding.connectorId) return
    setSyncingKey(binding.capabilityKey)
    setBindings((prev) =>
      prev.map((item) =>
        item.capabilityKey === binding.capabilityKey
          ? { ...item, syncStatus: "syncing" as const, syncMessage: undefined }
          : item,
      ),
    )

    try {
      const { device } = await syncDatasetLive(deviceId, binding.capabilityKey)
      setNetworkDevice(device)
      setBindings(device.datasetBindings ?? [])
    } catch (err) {
      if (err instanceof SyncDatasetError && err.device) {
        setNetworkDevice(err.device)
        setBindings(err.device.datasetBindings ?? [])
      } else {
        const message = err instanceof Error ? err.message : "Sync failed"
        await persistBindingPatch(binding.capabilityKey, {
          syncStatus: "error",
          syncMessage: message,
          lastSyncLog: {
            at: new Date().toISOString(),
            status: "error",
            message,
            connectorId: binding.connectorId,
            connectorName: binding.connectorName,
            details: [message],
          },
        })
      }
    } finally {
      setSyncingKey(null)
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && importTargetKey) handleImport(importTargetKey, file)
    e.target.value = ""
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading device overview…
      </div>
    )
  }

  if (error || !header) {
    return (
      <div className="space-y-4">
        <Link
          href="/resource-pool/device-inventory"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Device Inventory
        </Link>
        <p className="text-destructive">{error ?? "Device not found"}</p>
      </div>
    )
  }

  if (!networkDevice) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/resource-pool/device-inventory"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
            >
              <ChevronLeft className="h-4 w-4" />
              Device Inventory
            </Link>
            <h1 className="text-2xl font-semibold text-foreground">{header.name}</h1>
            <p className="text-muted-foreground mt-1">
              {header.hostname} · {header.ip} · {INVENTORY_CATEGORY_LABELS[header.category]}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Server devices use module-specific views (Nginx UI, monitoring). Dataset binding for
            network imports applies to firewall / router / switch inventory entries.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Role</div>
              <div className="font-medium capitalize">{serverCtx?.role.replace("-", " ")}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">OS</div>
              <div className="font-medium">{header.os}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Nginx</div>
              <div className="font-medium">{serverCtx?.nginxVersion}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Last check</div>
              <div className="font-medium">{serverCtx?.lastSeen}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" asChild>
              <Link href="/nginx/ui">Nginx UI</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/resource-pool/device-inventory">Edit in Inventory</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const configuredCount = bindings.filter((b) => b.source !== "unset").length
  const totalRows = bindings.reduce((sum, b) => sum + (b.rowCount ?? 0), 0)

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={onFileChange} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/resource-pool/device-inventory"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
          >
            <ChevronLeft className="h-4 w-4" />
            Device Inventory
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">{header.name}</h1>
            <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium">
              {INVENTORY_CATEGORY_LABELS[header.category]}
            </span>
            {header.dataMode && (
              <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {DATA_MODE_LABELS[header.dataMode as DataMode]}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {header.deviceTypeName} · {header.hostname} · {header.ip}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/resource-pool/device-inventory">Edit device</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Datasets configured</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {configuredCount}/{bindings.length}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Total rows (imported)</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{totalRows.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">OS</div>
          <div className="mt-1 text-sm font-medium">{header.os}</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Dataset bindings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Per-dataset source — CSV import or live connector. Live sync pulls data from the device via the mapped connector.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Dataset</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Detail</th>
                <th className="px-4 py-3 font-medium">Last sync</th>
                <th className="px-4 py-3 font-medium text-right tabular-nums">Rows</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bindings.map((binding) => {
                const syncing = syncingKey === binding.capabilityKey
                return (
                  <tr key={binding.capabilityKey} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{binding.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {IMPORT_KIND_LABELS[binding.importKind]} ·{" "}
                        <span className="font-mono">{binding.fileHint}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <SourceBadge source={binding.source} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[220px]">
                      {binding.source === "import" && binding.importFileName && (
                        <span className="inline-flex items-center gap-1">
                          <FileSpreadsheet className="h-3 w-3 shrink-0" />
                          <span className="truncate">{binding.importFileName}</span>
                        </span>
                      )}
                      {binding.source === "live" && binding.connectorName && (
                        <span className="inline-flex items-center gap-1">
                          <Link2 className="h-3 w-3 shrink-0" />
                          {binding.connectorName}
                        </span>
                      )}
                      {binding.source === "unset" && (
                        <span className="text-muted-foreground/80">Choose import or live connector</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {binding.syncStatus === "syncing" ? (
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Syncing…
                          </span>
                        ) : (
                          <>
                            <span>{formatSyncTime(binding.lastSyncAt)}</span>
                            <SyncStatusBadge status={binding.syncStatus} />
                          </>
                        )}
                        {binding.syncStatus === "error" && binding.syncMessage && (
                          <span className="max-w-[180px] truncate text-destructive" title={binding.syncMessage}>
                            {binding.syncMessage}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {binding.rowCount != null ? binding.rowCount.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Configure source"
                          onClick={() => openConfigure(binding)}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        {(binding.source === "import" || binding.source === "unset") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Import CSV"
                            onClick={() => {
                              setImportTargetKey(binding.capabilityKey)
                              fileInputRef.current?.click()
                            }}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        )}
                        {binding.source === "live" && binding.connectorId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Sync now"
                            disabled={syncing}
                            onClick={() => void handleSync(binding)}
                          >
                            {syncing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="View latest sync log"
                          disabled={!bindingLogPreview(binding)}
                          onClick={() => setLogTarget(binding)}
                        >
                          <ScrollText className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {bindings.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No datasets on this device type. Check Device Types catalog.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
        <Database className="mr-1 inline h-3.5 w-3.5" />
        Hybrid mode: security/NAT/address objects typically stay CSV import; routes can use live API
        when a connector is mapped. Full explorer UI (Firewall module) wires here in a later phase.
      </div>

      <Dialog open={!!configureTarget} onOpenChange={(open) => !open && setConfigureTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure dataset source</DialogTitle>
            <DialogDescription>
              {configureTarget?.label} — choose how this dataset is populated for{" "}
              <strong>{header.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={configSource} onValueChange={(v) => setConfigSource(v as DatasetSourceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Not configured</SelectItem>
                  <SelectItem value="import">CSV / file import</SelectItem>
                  {(networkDevice?.dataMode === "live" || networkDevice?.dataMode === "hybrid") && (
                    <SelectItem value="live">Live connector</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {configSource === "live" && (
              <div className="space-y-2">
                <Label>Connector</Label>
                {(() => {
                  const connectorOptions = configureTarget && networkDevice
                    ? connectorsForCapability(
                        networkDevice.deviceTypeId,
                        configureTarget.capabilityKey,
                        catalogOptions,
                      )
                    : []
                  if (connectorOptions.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground">
                        No connector on this device type supports this dataset.
                      </p>
                    )
                  }
                  return (
                    <Select value={configConnectorId} onValueChange={setConfigConnectorId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select connector" />
                      </SelectTrigger>
                      <SelectContent>
                        {connectorOptions.map((conn) => (
                          <SelectItem key={conn.id} value={conn.id}>
                            {conn.name} · {PROTOCOL_LABELS[conn.protocol]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                })()}
              </div>
            )}

            {configSource === "import" && configureTarget && (
              <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/20 p-3">
                Expected file pattern:{" "}
                <code className="font-mono">{configureTarget.fileHint}</code>
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigureTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveConfigure}
              disabled={
                configSource === "live" &&
                configureTarget != null &&
                networkDevice != null &&
                connectorsForCapability(
                  networkDevice.deviceTypeId,
                  configureTarget.capabilityKey,
                  catalogOptions,
                ).length === 0
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!logTarget} onOpenChange={(open) => !open && setLogTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sync log</DialogTitle>
            <DialogDescription>
              {logTarget?.label} — latest run for <strong>{header.name}</strong>
            </DialogDescription>
          </DialogHeader>
          {logTarget && (() => {
            const log = bindingLogPreview(logTarget)
            if (!log) {
              return (
                <p className="text-sm text-muted-foreground py-4">No sync log recorded yet. Run Sync to generate one.</p>
              )
            }
            return (
              <div className="space-y-3 py-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                      log.status === "ok"
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-destructive/30 bg-destructive/10 text-destructive",
                    )}
                  >
                    {log.status === "ok" ? "Success" : "Failed"}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatSyncTime(log.at)}</span>
                </div>
                <p className="font-medium">{log.message}</p>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  {log.connectorName && (
                    <>
                      <dt className="text-muted-foreground">Connector</dt>
                      <dd>{log.connectorName}</dd>
                    </>
                  )}
                  {log.deviceIp && (
                    <>
                      <dt className="text-muted-foreground">Device IP</dt>
                      <dd className="font-mono">{log.deviceIp}</dd>
                    </>
                  )}
                  {log.rowCount != null && (
                    <>
                      <dt className="text-muted-foreground">Rows</dt>
                      <dd className="tabular-nums">{log.rowCount.toLocaleString()}</dd>
                    </>
                  )}
                  {log.durationMs != null && (
                    <>
                      <dt className="text-muted-foreground">Duration</dt>
                      <dd className="tabular-nums">{log.durationMs} ms</dd>
                    </>
                  )}
                </dl>
                {log.details && log.details.length > 0 && (
                  <div className="rounded-md border border-border bg-muted/30 p-3">
                    <div className="mb-2 text-xs font-medium text-muted-foreground">Details</div>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground">
                      {log.details.join("\n")}
                    </pre>
                  </div>
                )}
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
