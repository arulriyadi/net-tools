"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchSshKeys, type SshKeyEntry } from "@/lib/resource-pool/ssh-keys"
import {
  AUTH_METHOD_LABELS,
  PROTOCOL_LABELS,
  resolveConnectors,
  type ConnectorAuthMethod,
  type DataConnectorRecord,
} from "@/lib/resource-pool/data-connectors-mock"
import { fetchDataConnectors } from "@/lib/resource-pool/data-connectors-api"
import {
  capabilitySummary,
  defaultDeviceDatasetKeys,
  deviceTypesForCategory,
  enabledCapabilities,
  findDeviceType,
  IMPORT_KIND_LABELS,
  type DeviceCategory,
  type DeviceTypeRecord,
  type ImportKind,
} from "@/lib/resource-pool/device-types-mock"
import { fetchDeviceTypes } from "@/lib/resource-pool/device-types-api"
import {
  connectorAuthValid,
  DATA_MODE_HINTS,
  DATA_MODE_LABELS,
  defaultDataMode,
  emptyConnectorAuth,
  INVENTORY_CATEGORY_LABELS,
  isNetworkCategory,
  type ConnectorAuthConfig,
  type DataMode,
  type InventoryCategory,
  type SshAuthMethod,
} from "@/lib/resource-pool/device-inventory-ext"
import { ExternalLink, FileSpreadsheet, KeyRound, Link2, Lock, Plug, Radio, Terminal } from "lucide-react"

function ImportKindIcon({ kind }: { kind: ImportKind }) {
  if (kind === "api") return <Plug className="h-3.5 w-3.5" />
  if (kind === "script_csv") return <Terminal className="h-3.5 w-3.5" />
  return <FileSpreadsheet className="h-3.5 w-3.5" />
}

export type { SshAuthMethod }

export interface DeviceFormData {
  name: string
  hostname: string
  ip: string
  category: InventoryCategory
  role: string
  os: string
  deviceTypeId: string
  dataMode: DataMode
  sshAuthMethod: SshAuthMethod
  sshUser: string
  sshPassword: string
  sshKeyId: string
  sshKeyPath?: string
  sshPort: string
  connectorAuth: Record<string, ConnectorAuthConfig>
  enabledDatasetKeys: string[]
  notes: string
}

const emptyForm: DeviceFormData = {
  name: "",
  hostname: "",
  ip: "",
  category: "server",
  role: "general",
  os: "",
  deviceTypeId: "",
  dataMode: "datastore",
  sshAuthMethod: "key",
  sshUser: "root",
  sshPassword: "",
  sshKeyId: "",
  sshPort: "22",
  connectorAuth: {},
  enabledDatasetKeys: [],
  notes: "",
}

function buildConnectorAuthMap(connectors: DataConnectorRecord[]): Record<string, ConnectorAuthConfig> {
  return Object.fromEntries(connectors.map((conn) => [conn.id, emptyConnectorAuth(conn)]))
}

interface AddDeviceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: DeviceFormData) => void | Promise<void>
  saving?: boolean
  mode?: "add" | "edit"
  initialForm?: Partial<DeviceFormData>
  title?: string
  submitLabel?: string
}

function ProtocolIcon({ protocol }: { protocol: DataConnectorRecord["protocol"] }) {
  if (protocol === "snmp") return <Radio className="h-3.5 w-3.5" />
  if (protocol === "ssh") return <Terminal className="h-3.5 w-3.5" />
  return <Plug className="h-3.5 w-3.5" />
}

export function AddDeviceDialog({
  open,
  onOpenChange,
  onSubmit,
  saving = false,
  mode = "add",
  initialForm,
  title,
  submitLabel,
}: AddDeviceDialogProps) {
  const [form, setForm] = useState<DeviceFormData>(emptyForm)
  const [keys, setKeys] = useState<SshKeyEntry[]>([])
  const [keysLoading, setKeysLoading] = useState(false)
  const [deviceTypes, setDeviceTypes] = useState<DeviceTypeRecord[]>([])
  const [connectors, setConnectors] = useState<DataConnectorRecord[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setKeysLoading(true)
    setCatalogLoading(true)
    Promise.all([fetchSshKeys(), fetchDeviceTypes(), fetchDataConnectors()])
      .then(([loadedKeys, loadedTypes, loadedConnectors]) => {
        setKeys(loadedKeys)
        setDeviceTypes(loadedTypes)
        setConnectors(loadedConnectors)
        const matchedKey =
          loadedKeys.find((k) => k.path === initialForm?.sshKeyPath) ||
          loadedKeys.find((k) => initialForm?.sshKeyId && k.id === initialForm.sshKeyId)
        setForm({
          ...emptyForm,
          ...initialForm,
          connectorAuth: initialForm?.connectorAuth ?? {},
          enabledDatasetKeys: initialForm?.enabledDatasetKeys ?? [],
          sshKeyId: matchedKey?.id || initialForm?.sshKeyId || loadedKeys[0]?.id || "",
        })
      })
      .catch(() => {
        setKeys([])
        setDeviceTypes([])
        setConnectors([])
      })
      .finally(() => {
        setKeysLoading(false)
        setCatalogLoading(false)
      })
  }, [open, initialForm?.name, initialForm?.ip, initialForm?.sshKeyPath, initialForm?.deviceTypeId])

  const selectedType = useMemo(
    () => (form.deviceTypeId ? findDeviceType(form.deviceTypeId, deviceTypes) : undefined),
    [form.deviceTypeId, deviceTypes],
  )

  const typeConnectors = useMemo(
    () => resolveConnectors(selectedType?.connectorIds ?? [], connectors),
    [selectedType, connectors],
  )

  const networkCategory = isNetworkCategory(form.category)
  const showLiveAccess =
    networkCategory && form.dataMode !== "datastore" && typeConnectors.length > 0
  const showServerSsh = form.category === "server"

  const typeDatasetOptions = useMemo(
    () => (selectedType ? enabledCapabilities(selectedType) : []),
    [selectedType],
  )

  const toggleDatasetKey = (key: string) => {
    setForm((prev) => {
      const checked = prev.enabledDatasetKeys.includes(key)
      const enabledDatasetKeys = checked
        ? prev.enabledDatasetKeys.filter((item) => item !== key)
        : [...prev.enabledDatasetKeys, key]
      return { ...prev, enabledDatasetKeys }
    })
  }

  const update = <K extends keyof DeviceFormData>(field: K, value: DeviceFormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }

      if (field === "category") {
        const category = value as InventoryCategory
        if (category === "server" || category === "other") {
          next.deviceTypeId = ""
          next.dataMode = "datastore"
          next.connectorAuth = {}
        } else if (isNetworkCategory(category)) {
          const types = deviceTypesForCategory(category, deviceTypes)
          const firstType = types[0]
          next.deviceTypeId = firstType?.id ?? ""
          const typeConnectors = resolveConnectors(firstType?.connectorIds ?? [], connectors)
          next.dataMode = defaultDataMode(firstType?.id ?? "", typeConnectors)
          next.connectorAuth = buildConnectorAuthMap(typeConnectors)
          next.enabledDatasetKeys = firstType ? defaultDeviceDatasetKeys(firstType) : []
        }
      }

      if (field === "deviceTypeId") {
        const typeId = value as string
        const type = findDeviceType(typeId, deviceTypes)
        const typeConnectors = resolveConnectors(type?.connectorIds ?? [], connectors)
        next.dataMode = defaultDataMode(typeId, typeConnectors)
        next.connectorAuth = buildConnectorAuthMap(typeConnectors)
        next.enabledDatasetKeys = type ? defaultDeviceDatasetKeys(type) : []
        if (type && !next.os.trim()) {
          next.os =
            type.category === "firewall"
              ? "PAN-OS"
              : type.category === "router"
                ? "RouterOS / IOS"
                : "EOS"
        }
      }

      return next
    })
  }

  const updateConnectorAuth = (
    connectorId: string,
    patch: Partial<ConnectorAuthConfig>,
  ) => {
    setForm((prev) => ({
      ...prev,
      connectorAuth: {
        ...prev.connectorAuth,
        [connectorId]: {
          ...(prev.connectorAuth[connectorId] ?? emptyConnectorAuth(
            typeConnectors.find((c) => c.id === connectorId) ?? typeConnectors[0],
          )),
          ...patch,
        },
      },
    }))
  }

  const liveAuthReady = useMemo(() => {
    if (!showLiveAccess) return true
    return typeConnectors.every((conn) =>
      connectorAuthValid(conn, form.connectorAuth[conn.id]),
    )
  }, [showLiveAccess, typeConnectors, form.connectorAuth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.hostname.trim() || !form.ip.trim()) return
    if (networkCategory && !form.deviceTypeId) return
    if (networkCategory && form.enabledDatasetKeys.length === 0) return
    if (showServerSsh && form.sshAuthMethod === "key" && !form.sshKeyId) return
    if (showLiveAccess && !liveAuthReady) return

    const selectedKey = keys.find((k) => k.id === form.sshKeyId)
    await onSubmit({
      ...form,
      sshKeyPath: form.sshAuthMethod === "key" ? selectedKey?.path : undefined,
    })
    setForm(emptyForm)
    onOpenChange(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) setForm(emptyForm)
    onOpenChange(next)
  }

  const catalogTypes =
    form.category !== "server" && form.category !== "other" && isNetworkCategory(form.category)
      ? deviceTypesForCategory(form.category, deviceTypes)
      : []

  const submitDisabled =
    saving ||
    catalogLoading ||
    !form.name.trim() ||
    !form.hostname.trim() ||
    !form.ip.trim() ||
    (networkCategory && !form.deviceTypeId) ||
    (networkCategory && form.enabledDatasetKeys.length === 0) ||
    (showServerSsh && form.sshAuthMethod === "key" && !form.sshKeyId) ||
    (showLiveAccess && !liveAuthReady)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ?? (mode === "edit" ? "Edit Device" : "Add Device")}</DialogTitle>
          <DialogDescription>
            Register a server or network device to the resource pool. Network devices use Device Type
            catalog; live credentials are configured here, dataset binding on Device Overview.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="device-name">Device name *</Label>
              <Input
                id="device-name"
                placeholder="e.g. Maung Prod 1 / pa-edge-01"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-hostname">Hostname *</Label>
              <Input
                id="device-hostname"
                placeholder="nginx-ui-maung-prod"
                value={form.hostname}
                onChange={(e) => update("hostname", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-ip">IP address *</Label>
              <Input
                id="device-ip"
                placeholder="10.118.208.151"
                value={form.ip}
                onChange={(e) => update("ip", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-category">Device category *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => update("category", v as InventoryCategory)}
              >
                <SelectTrigger id="device-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(INVENTORY_CATEGORY_LABELS) as InventoryCategory[]).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {INVENTORY_CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showServerSsh && (
              <div className="space-y-2">
                <Label htmlFor="device-role">Role</Label>
                <Select value={form.role} onValueChange={(v) => update("role", v)}>
                  <SelectTrigger id="device-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="nginx-ui">Nginx UI</SelectItem>
                    <SelectItem value="nginx-proxy">Nginx Proxy</SelectItem>
                    <SelectItem value="dns">DNS</SelectItem>
                    <SelectItem value="monitoring">Monitoring</SelectItem>
                    <SelectItem value="lab">Lab / Dev</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {networkCategory && (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="device-type-catalog">Device type *</Label>
                  <Select
                    value={form.deviceTypeId || undefined}
                    onValueChange={(v) => update("deviceTypeId", v)}
                  >
                    <SelectTrigger id="device-type-catalog">
                      <SelectValue placeholder="Select vendor template" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {catalogTypes.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No device types for this category.{" "}
                      <Link href="/resource-pool/device-types" className="text-primary hover:underline">
                        Add one in Device Types
                      </Link>
                    </p>
                  )}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Data mode</Label>
                  <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-background p-1">
                    {(["datastore", "live", "hybrid"] as DataMode[]).map((modeOption) => (
                      <button
                        key={modeOption}
                        type="button"
                        className={cn(
                          "rounded-md px-2 py-2 text-xs font-medium transition-colors",
                          form.dataMode === modeOption
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent",
                        )}
                        onClick={() => update("dataMode", modeOption)}
                      >
                        {DATA_MODE_LABELS[modeOption]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{DATA_MODE_HINTS[form.dataMode]}</p>
                </div>
              </>
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="device-os">Operating system</Label>
              <Input
                id="device-os"
                placeholder={networkCategory ? "PAN-OS / RouterOS / IOS" : "Ubuntu 22.04 LTS"}
                value={form.os}
                onChange={(e) => update("os", e.target.value)}
              />
            </div>
          </div>

          {selectedType && networkCategory && (
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Type summary</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedType.vendor}
                  {selectedType.description ? ` · ${selectedType.description}` : ""}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Datasets ({form.enabledDatasetKeys.length}/{typeDatasetOptions.length})
                </p>
                <ul className="space-y-2">
                  {typeDatasetOptions.map((cap) => {
                    const checked = form.enabledDatasetKeys.includes(cap.key)
                    return (
                      <li key={cap.key}>
                        <label
                          className={cn(
                            "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                            checked
                              ? "border-primary/40 bg-primary/5"
                              : "border-border bg-background hover:bg-accent/40",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-input"
                            checked={checked}
                            onChange={() => toggleDatasetKey(cap.key)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{cap.label}</span>
                              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                <ImportKindIcon kind={cap.importKind} />
                                {IMPORT_KIND_LABELS[cap.importKind]}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{cap.description}</p>
                            <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">
                              {cap.fileHint}
                            </p>
                          </div>
                        </label>
                      </li>
                    )
                  })}
                </ul>
                {form.enabledDatasetKeys.length === 0 && (
                  <p className="mt-2 text-xs text-destructive">Select at least one dataset.</p>
                )}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {capabilitySummary({
                    ...selectedType,
                    capabilities: selectedType.capabilities.map((cap) => ({
                      ...cap,
                      enabled: form.enabledDatasetKeys.includes(cap.key),
                    })),
                  })}
                </p>
              </div>
              {typeConnectors.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
                    Mapped connectors
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {typeConnectors.map((conn) => (
                      <span
                        key={conn.id}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px]"
                      >
                        <Link2 className="h-3 w-3 text-muted-foreground" />
                        {conn.name}
                        <span className="text-muted-foreground">· {PROTOCOL_LABELS[conn.protocol]}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {showLiveAccess && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">Live access</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Credentials for connectors mapped to this device type. Resolved against IP{" "}
                  <code className="text-[11px]">{form.ip || "{device-ip}"}</code> at sync time.
                </p>
              </div>

              {typeConnectors.map((conn) => {
                const auth =
                  form.connectorAuth[conn.id] ??
                  emptyConnectorAuth(conn)
                return (
                  <div key={conn.id} className="rounded-lg border border-border bg-background p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{conn.name}</span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <ProtocolIcon protocol={conn.protocol} />
                        {PROTOCOL_LABELS[conn.protocol]}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground break-all">
                      {conn.endpointPattern}
                    </p>

                    {(conn.protocol === "api" || conn.protocol === "rest" || conn.protocol === "netconf") && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Port</Label>
                          <Input
                            value={auth.apiPort}
                            onChange={(e) => updateConnectorAuth(conn.id, { apiPort: e.target.value })}
                          />
                        </div>
                        {conn.authMethods.includes("api_key") && (
                          <div className="space-y-2 sm:col-span-2">
                            <Label>API key *</Label>
                            <Input
                              type="password"
                              placeholder="PAN-OS API key"
                              value={auth.apiKey}
                              onChange={(e) => updateConnectorAuth(conn.id, { apiKey: e.target.value })}
                              autoComplete="new-password"
                            />
                          </div>
                        )}
                        {(conn.authMethods.includes("basic") || conn.authMethods.includes("bearer")) && (
                          <>
                            <div className="space-y-2">
                              <Label>API user *</Label>
                              <Input
                                value={auth.apiUser}
                                onChange={(e) => updateConnectorAuth(conn.id, { apiUser: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>API password</Label>
                              <Input
                                type="password"
                                value={auth.apiPassword}
                                onChange={(e) =>
                                  updateConnectorAuth(conn.id, { apiPassword: e.target.value })
                                }
                                autoComplete="new-password"
                              />
                            </div>
                          </>
                        )}
                        <p className="sm:col-span-2 text-[11px] text-muted-foreground">
                          Auth types: {conn.authMethods.map((m) => AUTH_METHOD_LABELS[m as ConnectorAuthMethod]).join(", ")}
                        </p>
                      </div>
                    )}

                    {conn.protocol === "snmp" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>SNMP port</Label>
                          <Input
                            value={auth.snmpPort}
                            onChange={(e) => updateConnectorAuth(conn.id, { snmpPort: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>SNMP version</Label>
                          <Select
                            value={auth.snmpVersion}
                            onValueChange={(v) =>
                              updateConnectorAuth(conn.id, { snmpVersion: v as "v2c" | "v3" })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {conn.authMethods.includes("snmp_v2c") && (
                                <SelectItem value="v2c">SNMP v2c</SelectItem>
                              )}
                              {conn.authMethods.includes("snmp_v3") && (
                                <SelectItem value="v3">SNMP v3</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        {auth.snmpVersion === "v2c" ? (
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Community string *</Label>
                            <Input
                              type="password"
                              value={auth.snmpCommunity}
                              onChange={(e) =>
                                updateConnectorAuth(conn.id, { snmpCommunity: e.target.value })
                              }
                              autoComplete="new-password"
                            />
                          </div>
                        ) : (
                          <div className="space-y-2 sm:col-span-2">
                            <Label>SNMPv3 user *</Label>
                            <Input
                              value={auth.snmpV3User}
                              onChange={(e) => updateConnectorAuth(conn.id, { snmpV3User: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {conn.protocol === "ssh" && (
                      <ConnectorSshFields
                        auth={auth}
                        keys={keys}
                        keysLoading={keysLoading}
                        onChange={(patch) => updateConnectorAuth(conn.id, patch)}
                        onOpenKeychain={() => onOpenChange(false)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {networkCategory && form.dataMode === "datastore" && (
            <p className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-3 text-xs text-muted-foreground">
              Live credentials not required. Import datasets on Device Overview after saving this
              device.
            </p>
          )}

          {showServerSsh && (
            <ServerSshBlock
              form={form}
              keys={keys}
              keysLoading={keysLoading}
              required={showServerSsh}
              onUpdate={update}
              onOpenKeychain={() => onOpenChange(false)}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="device-notes">Notes</Label>
            <Textarea
              id="device-notes"
              placeholder="Optional description, location, or access notes"
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              {saving ? "Saving…" : submitLabel ?? (mode === "edit" ? "Save Changes" : "Add Device")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConnectorSshFields({
  auth,
  keys,
  keysLoading,
  onChange,
  onOpenKeychain,
}: {
  auth: ConnectorAuthConfig
  keys: SshKeyEntry[]
  keysLoading: boolean
  onChange: (patch: Partial<ConnectorAuthConfig>) => void
  onOpenKeychain: () => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>SSH user *</Label>
        <Input value={auth.sshUser} onChange={(e) => onChange({ sshUser: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>SSH port</Label>
        <Input
          type="number"
          min={1}
          max={65535}
          value={auth.sshPort}
          onChange={(e) => onChange({ sshPort: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2 grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/20 p-1">
        <button
          type="button"
          className={cn(
            "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            auth.sshAuthMethod === "key"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange({ sshAuthMethod: "key" })}
        >
          <KeyRound className="h-4 w-4" />
          SSH Key
        </button>
        <button
          type="button"
          className={cn(
            "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            auth.sshAuthMethod === "password"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange({ sshAuthMethod: "password" })}
        >
          <Lock className="h-4 w-4" />
          Password
        </button>
      </div>
      {auth.sshAuthMethod === "key" ? (
        <div className="space-y-2 sm:col-span-2">
          <Label>Key from Keychain *</Label>
          {keysLoading ? (
            <p className="text-sm text-muted-foreground">Loading keychain…</p>
          ) : keys.length > 0 ? (
            <Select value={auth.sshKeyId} onValueChange={(v) => onChange({ sshKeyId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select SSH key" />
              </SelectTrigger>
              <SelectContent>
                {keys.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">
              No keys in keychain.{" "}
              <Link href="/resource-pool/keychain" className="text-primary hover:underline" onClick={onOpenKeychain}>
                Add one first
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2 sm:col-span-2">
          <Label>SSH password</Label>
          <Input
            type="password"
            value={auth.sshPassword}
            onChange={(e) => onChange({ sshPassword: e.target.value })}
            autoComplete="new-password"
          />
        </div>
      )}
    </div>
  )
}

function ServerSshBlock({
  form,
  keys,
  keysLoading,
  required,
  onUpdate,
  onOpenKeychain,
}: {
  form: DeviceFormData
  keys: SshKeyEntry[]
  keysLoading: boolean
  required: boolean
  onUpdate: <K extends keyof DeviceFormData>(field: K, value: DeviceFormData[K]) => void
  onOpenKeychain: () => void
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          SSH access{required ? "" : " (optional)"}
        </p>
        <Link
          href="/resource-pool/keychain"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          onClick={onOpenKeychain}
        >
          Keychain <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-background p-1">
        <button
          type="button"
          className={cn(
            "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            form.sshAuthMethod === "key"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onUpdate("sshAuthMethod", "key")}
        >
          <KeyRound className="h-4 w-4" />
          SSH Key
        </button>
        <button
          type="button"
          className={cn(
            "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            form.sshAuthMethod === "password"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onUpdate("sshAuthMethod", "password")}
        >
          <Lock className="h-4 w-4" />
          User / Password
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="device-ssh-user">SSH user</Label>
          <Input
            id="device-ssh-user"
            value={form.sshUser}
            onChange={(e) => onUpdate("sshUser", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="device-ssh-port">SSH port</Label>
          <Input
            id="device-ssh-port"
            type="number"
            min={1}
            max={65535}
            value={form.sshPort}
            onChange={(e) => onUpdate("sshPort", e.target.value)}
          />
        </div>

        {form.sshAuthMethod === "key" ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="device-ssh-key">Key from Keychain {required ? "*" : ""}</Label>
            {keysLoading ? (
              <p className="text-sm text-muted-foreground">Loading keychain…</p>
            ) : keys.length > 0 ? (
              <Select value={form.sshKeyId} onValueChange={(v) => onUpdate("sshKeyId", v)}>
                <SelectTrigger id="device-ssh-key">
                  <SelectValue placeholder="Select SSH key" />
                </SelectTrigger>
                <SelectContent>
                  {keys.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                No keys in keychain.{" "}
                <Link href="/resource-pool/keychain" className="text-primary hover:underline" onClick={onOpenKeychain}>
                  Add one first
                </Link>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="device-ssh-password">Password</Label>
            <Input
              id="device-ssh-password"
              type="password"
              placeholder="SSH password"
              value={form.sshPassword}
              onChange={(e) => onUpdate("sshPassword", e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Password auth is not stored in the database yet — use SSH key from keychain for production access.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
