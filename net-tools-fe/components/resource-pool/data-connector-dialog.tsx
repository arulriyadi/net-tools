"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { DeviceCategory } from "@/lib/resource-pool/device-types-mock"
import { CATEGORY_LABELS } from "@/lib/resource-pool/device-types-mock"
import {
  AUTH_METHOD_LABELS,
  POLL_MODE_LABELS,
  PROTOCOL_LABELS,
  capabilitiesForCategories,
  emptyConnectorForm,
  formFromConnector,
  type ConnectorAuthMethod,
  type ConnectorProtocol,
  type ConnectorStatus,
  type DataConnectorFormData,
  type DataConnectorRecord,
  type PollMode,
} from "@/lib/resource-pool/data-connectors-mock"
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

const ALL_CATEGORIES: DeviceCategory[] = ["firewall", "router", "switch"]

const AUTH_BY_PROTOCOL: Record<ConnectorProtocol, ConnectorAuthMethod[]> = {
  api: ["api_key", "basic", "bearer"],
  rest: ["basic", "bearer", "api_key"],
  snmp: ["snmp_v2c", "snmp_v3"],
  ssh: ["ssh_key", "ssh_password"],
  netconf: ["basic", "ssh_key"],
}

interface DataConnectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (form: DataConnectorFormData) => void | Promise<void>
  mode?: "add" | "edit"
  initial?: DataConnectorRecord | null
}

export function DataConnectorDialog({
  open,
  onOpenChange,
  onSubmit,
  mode = "add",
  initial = null,
}: DataConnectorDialogProps) {
  const [form, setForm] = useState<DataConnectorFormData>(emptyConnectorForm())

  useEffect(() => {
    if (!open) return
    setForm(initial ? formFromConnector(initial) : emptyConnectorForm())
  }, [open, initial])

  const update = <K extends keyof DataConnectorFormData>(field: K, value: DataConnectorFormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === "protocol") {
        const allowed = new Set(AUTH_BY_PROTOCOL[value as ConnectorProtocol])
        next.authMethods = prev.authMethods.filter((m) => allowed.has(m))
        if (next.authMethods.length === 0) {
          next.authMethods = [AUTH_BY_PROTOCOL[value as ConnectorProtocol][0]]
        }
      }
      return next
    })
  }

  const toggleCategory = (category: DeviceCategory) => {
    setForm((prev) => {
      const cats = prev.compatibleCategories.includes(category)
        ? prev.compatibleCategories.filter((c) => c !== category)
        : [...prev.compatibleCategories, category]
      const allowedCaps = new Set(
        capabilitiesForCategories(cats.length ? cats : ALL_CATEGORIES).map((c) => c.key),
      )
      return {
        ...prev,
        compatibleCategories: cats,
        capabilityKeys: prev.capabilityKeys.filter((k) => allowedCaps.has(k)),
      }
    })
  }

  const toggleCapability = (key: string) => {
    setForm((prev) => ({
      ...prev,
      capabilityKeys: prev.capabilityKeys.includes(key)
        ? prev.capabilityKeys.filter((k) => k !== key)
        : [...prev.capabilityKeys, key],
    }))
  }

  const toggleAuth = (method: ConnectorAuthMethod) => {
    setForm((prev) => ({
      ...prev,
      authMethods: prev.authMethods.includes(method)
        ? prev.authMethods.filter((m) => m !== method)
        : [...prev.authMethods, method],
    }))
  }

  const capabilityOptions = useMemo(
    () =>
      capabilitiesForCategories(
        form.compatibleCategories.length ? form.compatibleCategories : ALL_CATEGORIES,
      ),
    [form.compatibleCategories],
  )

  const authOptions = AUTH_BY_PROTOCOL[form.protocol]

  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.vendor.trim()) return
    if (form.compatibleCategories.length === 0 || form.capabilityKeys.length === 0) return
    if (form.authMethods.length === 0) return
    setSubmitting(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Data Connector" : "Add Data Connector"}</DialogTitle>
          <DialogDescription>
            Template for how live data is collected. Credentials and device IP are configured later in
            Device Inventory — not here.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="conn-name">Connector name *</Label>
              <Input
                id="conn-name"
                placeholder="e.g. MikroTik RouterOS REST"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conn-vendor">Vendor *</Label>
              <Input
                id="conn-vendor"
                placeholder="MikroTik"
                value={form.vendor}
                onChange={(e) => update("vendor", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conn-protocol">Protocol *</Label>
              <Select
                value={form.protocol}
                onValueChange={(v) => update("protocol", v as ConnectorProtocol)}
              >
                <SelectTrigger id="conn-protocol">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROTOCOL_LABELS) as ConnectorProtocol[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PROTOCOL_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Compatible categories *</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_CATEGORIES.map((cat) => {
                  const active = form.compatibleCategories.includes(cat)
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="conn-desc">Description</Label>
              <Textarea
                id="conn-desc"
                rows={2}
                placeholder="What this connector collects and any vendor/version notes"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 rounded-lg border border-border bg-muted/20 p-4">
            <div className="space-y-2">
              <Label htmlFor="conn-port">Default port</Label>
              <Input
                id="conn-port"
                placeholder="443"
                value={form.defaultPort}
                onChange={(e) => update("defaultPort", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conn-parser">Parser ID</Label>
              <Input
                id="conn-parser"
                placeholder="mikrotik-rest-v1"
                value={form.parserId}
                onChange={(e) => update("parserId", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="conn-endpoint">Endpoint pattern</Label>
              <Input
                id="conn-endpoint"
                placeholder="https://{host}/rest/{resource}"
                value={form.endpointPattern}
                onChange={(e) => update("endpointPattern", e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Use placeholders like {"{host}"}, {"{user}"}, {"{api_key}"} — resolved per device at
                inventory.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="conn-poll">Poll mode</Label>
              <Select value={form.pollMode} onValueChange={(v) => update("pollMode", v as PollMode)}>
                <SelectTrigger id="conn-poll">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(POLL_MODE_LABELS) as PollMode[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {POLL_MODE_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.pollMode === "interval" && (
              <div className="space-y-2">
                <Label htmlFor="conn-interval">Default interval (minutes)</Label>
                <Input
                  id="conn-interval"
                  type="number"
                  min={1}
                  value={form.defaultIntervalMinutes}
                  onChange={(e) => update("defaultIntervalMinutes", e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="conn-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => update("status", v as ConnectorStatus)}
              >
                <SelectTrigger id="conn-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">Auth methods (template)</p>
              <p className="text-xs text-muted-foreground">
                Which credential types devices must provide when using this connector.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {authOptions.map((method) => {
                const active = form.authMethods.includes(method)
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => toggleAuth(method)}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {AUTH_METHOD_LABELS[method]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">Datasets this connector fills *</p>
              <p className="text-xs text-muted-foreground">
                Mapped to Device Type capabilities in the next phase.
              </p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {capabilityOptions.map((cap) => {
                const checked = form.capabilityKeys.includes(cap.key)
                return (
                  <li key={cap.key}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-sm transition-colors",
                        checked
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-background hover:bg-accent/40",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked}
                        onChange={() => toggleCapability(cap.key)}
                      />
                      <span>{cap.label}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                !form.name.trim() ||
                !form.vendor.trim() ||
                form.compatibleCategories.length === 0 ||
                form.capabilityKeys.length === 0 ||
                form.authMethods.length === 0
              }
            >
              {submitting ? "Saving…" : mode === "edit" ? "Save Changes" : "Add Connector"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
