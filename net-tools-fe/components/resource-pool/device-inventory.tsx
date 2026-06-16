"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Server,
  Plus,
  Search,
  MoreVertical,
  Wifi,
  WifiOff,
  Trash2,
  Loader2,
  RefreshCw,
  Pencil,
  Terminal,
  Shield,
  Router,
  Layers,
  LayoutDashboard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AddDeviceDialog, type DeviceFormData } from "./add-device-dialog"
import { DeviceShellDialog } from "./device-shell-dialog"
import {
  AUTO_CHECK_OPTIONS,
  createDevice,
  deleteDevice,
  fetchDevices,
  fetchNginxJobs,
  groupToRole,
  latestJobByServer,
  roleToGroup,
  runNginxCheck,
  updateDevice,
  type AutoCheckInterval,
  type ServerRecord,
} from "@/lib/resource-pool/servers"
import {
  DATA_MODE_LABELS,
  INVENTORY_CATEGORY_LABELS,
  isNetworkCategory,
  networkDeviceFromForm,
  type DataMode,
  type InventoryCategory,
  type NetworkDeviceRecord,
} from "@/lib/resource-pool/device-inventory-ext"
import { fetchDataConnectors } from "@/lib/resource-pool/data-connectors-api"
import { fetchDeviceTypes } from "@/lib/resource-pool/device-types-api"
import {
  createNetworkDevice,
  deleteNetworkDevice,
  fetchNetworkDevices,
  networkDevicePayloadFromRecord,
  updateNetworkDevice,
} from "@/lib/resource-pool/network-devices-api"
import { initDatasetBindings, rebuildDatasetBindings } from "@/lib/resource-pool/device-overview-mock"

export interface Device {
  id: string
  name: string
  /** System hostname from last SSH check, or DB fallback */
  hostname: string
  /** Hostname stored in PostgreSQL (for edit form) */
  inventoryHostname: string
  ip: string
  status: "online" | "offline" | "unknown"
  category: InventoryCategory
  deviceTypeId?: string
  deviceTypeName?: string
  dataMode?: DataMode
  role: string
  lastSeen: string
  os: string
  nginxVersion: string
  nginxUiVersion: string
  technitiumVersion: string
  sshUser?: string
  sshKeyPath?: string
  notes?: string
  nginxMonitored?: boolean
  connectorAuth?: NetworkDeviceRecord["connectorAuth"]
  enabledDatasetKeys?: string[]
}

function mapServerToDevice(server: ServerRecord, lastJob?: { finished_at: string | null; result: Record<string, unknown> | null }): Device {
  const result = lastJob?.result
  const nginxActive = result?.nginx_active
  let status: Device["status"] = "unknown"
  if (lastJob) {
    status = nginxActive === true ? "online" : "offline"
  }

  const notes = server.notes ?? ""
  const osFromNotes = notes.match(/^OS: (.+)$/m)?.[1]

  return {
    id: String(server.id),
    name: server.name,
    hostname: (result?.hostname as string)?.trim() || server.hostname,
    inventoryHostname: server.hostname,
    ip: server.ip,
    status,
    category: "server",
    role: groupToRole(server.group),
    lastSeen: lastJob?.finished_at
      ? new Date(lastJob.finished_at).toLocaleString("id-ID")
      : "Never checked",
    os: (result?.os_version as string) ?? osFromNotes ?? "—",
    nginxVersion: (result?.nginx_version as string) ?? "—",
    nginxUiVersion: (result?.nginx_ui_version as string) ?? "—",
    technitiumVersion: (result?.technitium_version as string) ?? "—",
    sshUser: server.ssh_user,
    sshKeyPath: server.ssh_key_path ?? undefined,
    notes: server.notes ?? undefined,
    nginxMonitored: server.nginx_monitored,
  }
}

function networkToDevice(record: NetworkDeviceRecord): Device {
  return {
    id: record.id,
    name: record.name,
    hostname: record.hostname,
    inventoryHostname: record.hostname,
    ip: record.ip,
    status: "unknown",
    category: record.category,
    deviceTypeId: record.deviceTypeId,
    deviceTypeName: record.deviceTypeName,
    dataMode: record.dataMode,
    role: "network",
    lastSeen: "—",
    os: record.os || "—",
    nginxVersion: "—",
    nginxUiVersion: "—",
    technitiumVersion: "—",
    notes: record.notes || undefined,
    connectorAuth: record.connectorAuth,
    enabledDatasetKeys: record.datasetBindings.map((binding) => binding.capabilityKey),
  }
}

const CATEGORY_ICONS: Record<InventoryCategory, typeof Server> = {
  server: Server,
  firewall: Shield,
  router: Router,
  switch: Layers,
  other: Server,
}

function CategoryBadge({ category }: { category: InventoryCategory }) {
  const Icon = CATEGORY_ICONS[category]
  const cls =
    category === "firewall"
      ? "bg-success/15 text-success border-success/30"
      : category === "router"
        ? "bg-primary/15 text-primary border-primary/30"
        : category === "switch"
          ? "bg-chart-2/15 text-chart-2 border-chart-2/30"
          : "bg-muted text-muted-foreground border-border"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        cls,
      )}
    >
      <Icon className="h-3 w-3" />
      {INVENTORY_CATEGORY_LABELS[category]}
    </span>
  )
}

export function DeviceInventory() {
  const [devices, setDevices] = useState<Device[]>([])
  const [networkDevices, setNetworkDevices] = useState<NetworkDeviceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [editDevice, setEditDevice] = useState<Device | null>(null)
  const [shellDevice, setShellDevice] = useState<Device | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [autoCheck, setAutoCheck] = useState<AutoCheckInterval>("off")
  const [checkingAll, setCheckingAll] = useState(false)
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set())
  const checkInFlight = useRef(false)
  const devicesRef = useRef<Device[]>([])

  const allDevices = useMemo(
    () => [...networkDevices.map(networkToDevice), ...devices],
    [devices, networkDevices],
  )

  useEffect(() => {
    devicesRef.current = allDevices
  }, [allDevices])

  const loadDevices = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [servers, jobs, network] = await Promise.all([
        fetchDevices(),
        fetchNginxJobs(),
        fetchNetworkDevices(),
      ])
      const jobMap = latestJobByServer(jobs)
      setDevices(servers.map((s) => mapServerToDevice(s, jobMap.get(s.id))))
      setNetworkDevices(network)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices")
      if (!silent) setDevices([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  const runCheckForDevices = useCallback(
    async (targetDevices: Device[], silent = false) => {
      const checkable = targetDevices.filter((d) => d.category === "server" && d.sshKeyPath)
      if (checkable.length === 0) return
      if (checkInFlight.current) return
      checkInFlight.current = true

      const ids = new Set(checkable.map((d) => d.id))
      setCheckingIds((prev) => new Set([...prev, ...ids]))
      if (checkable.length > 1) setCheckingAll(true)

      const failures: string[] = []
      for (const device of checkable) {
        try {
          await runNginxCheck(device.id)
        } catch (err) {
          failures.push(`${device.name}: ${err instanceof Error ? err.message : "check failed"}`)
        }
      }

      await loadDevices(true)

      if (failures.length > 0 && !silent) {
        setError(failures.join(" · "))
      }

      setCheckingIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
      setCheckingAll(false)
      checkInFlight.current = false
    },
    [loadDevices],
  )

  const handleCheckAll = () => runCheckForDevices(allDevices)
  const handleCheckOne = (device: Device) => runCheckForDevices([device])

  useEffect(() => {
    const option = AUTO_CHECK_OPTIONS.find((o) => o.value === autoCheck)
    if (!option || option.ms === 0) return

    const tick = () => {
      const current = devicesRef.current.filter((d) => d.category === "server" && d.sshKeyPath)
      if (current.length === 0) return
      void runCheckForDevices(current, true)
    }

    tick()
    const timer = window.setInterval(tick, option.ms)
    return () => window.clearInterval(timer)
  }, [autoCheck, runCheckForDevices])

  const filteredDevices = allDevices.filter(
    (device) =>
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.ip.includes(searchQuery) ||
      (device.deviceTypeName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false),
  )

  const onlineCount = allDevices.filter((d) => d.status === "online").length
  const offlineCount = allDevices.filter((d) => d.status === "offline").length

  const handleEditDevice = async (data: DeviceFormData) => {
    if (!editDevice) return
    setSaving(true)
    setError(null)
    try {
      if (editDevice && isNetworkCategory(editDevice.category) && isNetworkCategory(data.category)) {
        const [types, connectors] = await Promise.all([fetchDeviceTypes(), fetchDataConnectors()])
        const existing = networkDevices.find((d) => d.id === editDevice.id)
        const record = networkDeviceFromForm(
          {
            name: data.name,
            hostname: data.hostname,
            ip: data.ip,
            category: data.category,
            deviceTypeId: data.deviceTypeId,
            dataMode: data.dataMode,
            os: data.os,
            notes: data.notes,
            connectorAuth: data.connectorAuth,
          },
          existing,
        )
        const datasetBindings = rebuildDatasetBindings(
          record,
          data.enabledDatasetKeys,
          existing?.datasetBindings ?? [],
          { types, connectors },
        )
        const datasetData = { ...(existing?.datasetData ?? {}) }
        for (const key of Object.keys(datasetData)) {
          if (!data.enabledDatasetKeys.includes(key)) {
            delete datasetData[key]
          }
        }
        await updateNetworkDevice(editDevice.id, {
          ...networkDevicePayloadFromRecord({ ...record, datasetBindings, datasetData }),
        })
        setEditDevice(null)
        await loadDevices()
        return
      }

      const notes = [
        data.notes.trim(),
        data.os.trim() ? `OS: ${data.os.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n")

      await updateDevice(editDevice.id, {
        name: data.name.trim(),
        hostname: data.hostname.trim(),
        ip: data.ip.trim(),
        group: roleToGroup(data.role),
        ssh_user: data.sshUser.trim() || "root",
        ssh_key_path: data.sshAuthMethod === "key" ? data.sshKeyPath ?? null : null,
        notes: notes || null,
      })
      setEditDevice(null)
      await loadDevices()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update device")
      throw err
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDevice = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError(null)
    try {
      if (deleteTarget && isNetworkCategory(deleteTarget.category)) {
        await deleteNetworkDevice(deleteTarget.id)
        setDeleteTarget(null)
        await loadDevices()
        return
      }
      await deleteDevice(deleteTarget.id)
      setDeleteTarget(null)
      await loadDevices()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete device")
    } finally {
      setDeleting(false)
    }
  }

  const deviceToForm = (device: Device): Partial<DeviceFormData> => ({
    name: device.name,
    hostname: device.inventoryHostname,
    ip: device.ip,
    category: device.category,
    role: device.role,
    os: device.os === "—" ? "" : device.os,
    deviceTypeId: device.deviceTypeId ?? "",
    dataMode: device.dataMode ?? "datastore",
    sshUser: device.sshUser ?? "root",
    sshAuthMethod: device.sshKeyPath ? "key" : "password",
    sshKeyPath: device.sshKeyPath,
    connectorAuth: device.connectorAuth ?? {},
    enabledDatasetKeys: device.enabledDatasetKeys ?? [],
    notes: device.notes ?? "",
  })

  const handleAddDevice = async (data: DeviceFormData) => {
    setSaving(true)
    setError(null)
    try {
      if (isNetworkCategory(data.category)) {
        const [types, connectors] = await Promise.all([fetchDeviceTypes(), fetchDataConnectors()])
        const type = types.find((item) => item.id === data.deviceTypeId)
        const draft = networkDeviceFromForm(
          {
            name: data.name,
            hostname: data.hostname,
            ip: data.ip,
            category: data.category,
            deviceTypeId: data.deviceTypeId,
            dataMode: data.dataMode,
            os: data.os,
            notes: data.notes,
            connectorAuth: data.connectorAuth,
          },
          undefined,
          { deviceTypeName: type?.name },
        )
        const datasetBindings = initDatasetBindings(draft, {
          types,
          connectors,
          enabledKeys: data.enabledDatasetKeys,
        })
        await createNetworkDevice(
          networkDevicePayloadFromRecord({ ...draft, datasetBindings }),
        )
        setAddOpen(false)
        await loadDevices()
        return
      }

      const notes = [
        data.notes.trim(),
        data.os.trim() ? `OS: ${data.os.trim()}` : "",
        data.sshAuthMethod === "password" ? "[password auth — configure key in keychain for SSH checks]" : "",
      ]
        .filter(Boolean)
        .join("\n")

      await createDevice({
        name: data.name.trim(),
        hostname: data.hostname.trim(),
        ip: data.ip.trim(),
        group: roleToGroup(data.role),
        ssh_user: data.sshUser.trim() || "root",
        ssh_key_path: data.sshAuthMethod === "key" ? data.sshKeyPath ?? null : null,
        notes: notes || null,
      })
      setAddOpen(false)
      await loadDevices()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add device")
      throw err
    } finally {
      setSaving(false)
    }
  }

  const editForm = useMemo(
    () => (editDevice ? deviceToForm(editDevice) : undefined),
    [editDevice],
  )

  const checkNowDisabled =
    mounted && (checkingAll || allDevices.filter((d) => d.category === "server" && d.sshKeyPath).length === 0)
  const addDeviceDisabled = mounted && loading

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Devices</span>
            <Server className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-card-foreground">{allDevices.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Online</span>
            <Wifi className="h-4 w-4 text-success" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-success">{onlineCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Offline</span>
            <WifiOff className="h-4 w-4 text-destructive" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-destructive">{offlineCount}</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-64"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Auto check</span>
            <Select value={autoCheck} onValueChange={(v) => setAutoCheck(v as AutoCheckInterval)}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTO_CHECK_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={handleCheckAll}
            disabled={checkNowDisabled || undefined}
          >
            {checkingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Check now</span>
          </Button>
          <Button onClick={() => setAddOpen(true)} disabled={addDeviceDisabled || undefined}>
            <Plus className="h-4 w-4" />
            <span className="ml-2">Add Device</span>
          </Button>
        </div>
      </div>

      {autoCheck !== "off" && allDevices.some((d) => d.category === "server" && d.sshKeyPath) && (
        <p className="text-xs text-muted-foreground">
          Auto check aktif setiap{" "}
          {AUTO_CHECK_OPTIONS.find((o) => o.value === autoCheck)?.label.toLowerCase()} — SSH nginx check
          ke semua device.
        </p>
      )}

      <AddDeviceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={handleAddDevice}
        saving={saving}
      />

      <AddDeviceDialog
        open={!!editDevice}
        onOpenChange={(open) => !open && setEditDevice(null)}
        onSubmit={handleEditDevice}
        saving={saving}
        mode="edit"
        initialForm={editForm}
      />

      <DeviceShellDialog
        device={shellDevice}
        open={!!shellDevice}
        onOpenChange={(open) => !open && setShellDevice(null)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete device?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deleteTarget?.name}</strong> ({deleteTarget?.ip}) from the resource pool.
              {deleteTarget && isNetworkCategory(deleteTarget.category)
                ? " Dataset bindings for this network device will also be removed."
                : " Related check jobs will also be deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDeleteDevice()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading devices from database…
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 py-16 text-center">
          <Server className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No devices yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add a device to the resource pool — data is stored in PostgreSQL.
          </p>
          <Button className="mt-4" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDevices.map((device) => {
            const isChecking = checkingIds.has(device.id)
            const Icon = CATEGORY_ICONS[device.category]
            const isServer = device.category === "server"
            return (
              <div
                key={device.id}
                className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-muted-foreground/30"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-md",
                        device.status === "online" ? "bg-success/10" : "bg-muted",
                      )}
                    >
                      {isChecking ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <Icon
                          className={cn(
                            "h-5 w-5",
                            device.status === "online" ? "text-success" : "text-muted-foreground",
                          )}
                        />
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/resource-pool/device-inventory/${device.id}`}
                        className="font-medium text-card-foreground hover:text-primary hover:underline"
                      >
                        {device.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <CategoryBadge category={device.category} />
                        {device.dataMode && (
                          <span className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {DATA_MODE_LABELS[device.dataMode]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/resource-pool/device-inventory/${device.id}`}>
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          Device Overview
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setEditDevice(device)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShellDevice(device)}
                        disabled={!device.sshKeyPath || isNetworkCategory(device.category)}
                      >
                        <Terminal className="h-4 w-4 mr-2" />
                        Shell
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(device)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Hostname</span>
                    <span className="text-card-foreground truncate max-w-[160px] text-right">{device.hostname}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">IP Address</span>
                    <code className="rounded bg-muted px-2 py-0.5 text-xs">{device.ip}</code>
                  </div>
                  {device.deviceTypeName && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Device type</span>
                      <span className="text-card-foreground truncate max-w-[160px] text-right text-xs">
                        {device.deviceTypeName}
                      </span>
                    </div>
                  )}
                  {isServer && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Role</span>
                      <span className="text-card-foreground capitalize">{device.role.replace("-", " ")}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">OS</span>
                    <span className="text-card-foreground truncate max-w-[140px]">{device.os}</span>
                  </div>
                  {isServer && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Nginx</span>
                        <span className="text-card-foreground">{device.nginxVersion}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Nginx UI</span>
                        <span className="text-card-foreground">{device.nginxUiVersion}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Technitium</span>
                        <span className="text-card-foreground">{device.technitiumVersion}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                        device.status === "online"
                          ? "bg-success/10 text-success"
                          : device.status === "offline"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          device.status === "online"
                            ? "bg-success"
                            : device.status === "offline"
                              ? "bg-destructive"
                              : "bg-muted-foreground",
                        )}
                      />
                      {isChecking
                        ? "Checking…"
                        : device.status === "online"
                          ? "Online"
                          : device.status === "offline"
                            ? "Offline"
                            : "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground">
                    Last check: {device.lastSeen}
                  </span>
                  <div className="flex items-center gap-1">
                    {device.category === "server" && (
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                        title="Check this device"
                        disabled={isChecking || !device.sshKeyPath}
                        onClick={() => handleCheckOne(device)}
                      >
                        {isChecking ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
