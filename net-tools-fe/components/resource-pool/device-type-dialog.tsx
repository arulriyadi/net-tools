"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  CAPABILITY_CATALOG,
  CATEGORY_LABELS,
  IMPORT_KIND_LABELS,
  emptyDeviceTypeForm,
  type DeviceCategory,
  type DeviceTypeFormData,
  type DeviceTypeRecord,
  formFromDeviceType,
} from "@/lib/resource-pool/device-types-mock"
import {
  connectorsForCategory,
  PROTOCOL_LABELS,
  type DataConnectorRecord,
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
import { FileSpreadsheet, Terminal, Plug, Link2 } from "lucide-react"

function ImportKindIcon({ kind }: { kind: keyof typeof IMPORT_KIND_LABELS }) {
  if (kind === "api") return <Plug className="h-3.5 w-3.5" />
  if (kind === "script_csv") return <Terminal className="h-3.5 w-3.5" />
  return <FileSpreadsheet className="h-3.5 w-3.5" />
}

interface DeviceTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (form: DeviceTypeFormData) => void | Promise<void>
  mode?: "add" | "edit"
  initial?: DeviceTypeRecord | null
  connectors?: DataConnectorRecord[]
}

export function DeviceTypeDialog({
  open,
  onOpenChange,
  onSubmit,
  mode = "add",
  initial = null,
  connectors = [],
}: DeviceTypeDialogProps) {
  const [form, setForm] = useState<DeviceTypeFormData>(emptyDeviceTypeForm())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(initial ? formFromDeviceType(initial) : emptyDeviceTypeForm())
  }, [open, initial])

  const update = <K extends keyof DeviceTypeFormData>(field: K, value: DeviceTypeFormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === "category") {
        const category = value as DeviceCategory
        const allowed = new Set(CAPABILITY_CATALOG[category].map((c) => c.key))
        next.enabledCapabilityKeys = CAPABILITY_CATALOG[category]
          .filter((def) => def.defaultEnabled)
          .map((def) => def.key)
          .filter((key) => allowed.has(key))

        const allowedConnectors = new Set(
          connectorsForCategory(category, connectors).map((conn) => conn.id),
        )
        next.enabledConnectorIds = prev.enabledConnectorIds.filter((id) => allowedConnectors.has(id))
      }
      return next
    })
  }

  const toggleCapability = (key: string) => {
    setForm((prev) => {
      const keys = prev.enabledCapabilityKeys.includes(key)
        ? prev.enabledCapabilityKeys.filter((k) => k !== key)
        : [...prev.enabledCapabilityKeys, key]
      return { ...prev, enabledCapabilityKeys: keys }
    })
  }

  const toggleConnector = (id: string) => {
    setForm((prev) => {
      const ids = prev.enabledConnectorIds.includes(id)
        ? prev.enabledConnectorIds.filter((item) => item !== id)
        : [...prev.enabledConnectorIds, id]
      return { ...prev, enabledConnectorIds: ids }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.vendor.trim()) return
    if (form.enabledCapabilityKeys.length === 0) return
    setSubmitting(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  const catalog = CAPABILITY_CATALOG[form.category]
  const categoryConnectors = connectorsForCategory(form.category, connectors)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Device Type" : "Add Device Type"}</DialogTitle>
          <DialogDescription>
            Define a vendor template and which datasets this type supports for CSV / API import on
            Device Overview.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="type-name">Type name *</Label>
              <Input
                id="type-name"
                placeholder="e.g. Palo Alto Networks Firewall"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-vendor">Vendor *</Label>
              <Input
                id="type-vendor"
                placeholder="Palo Alto Networks"
                value={form.vendor}
                onChange={(e) => update("vendor", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-category">Device category *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => update("category", v as DeviceCategory)}
              >
                <SelectTrigger id="type-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="firewall">Firewall</SelectItem>
                  <SelectItem value="router">Router</SelectItem>
                  <SelectItem value="switch">Switch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="type-description">Description</Label>
              <Textarea
                id="type-description"
                placeholder="Supported models, export notes, or import workflow hints"
                rows={2}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Data capabilities</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select datasets available when a device of this type is in datastore-only mode.
                {form.enabledCapabilityKeys.length === 0 && (
                  <span className="text-destructive"> At least one capability is required.</span>
                )}
              </p>
            </div>

            <ul className="space-y-2">
              {catalog.map((def) => {
                const checked = form.enabledCapabilityKeys.includes(def.key)
                return (
                  <li key={def.key}>
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
                        onChange={() => toggleCapability(def.key)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{def.label}</span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            <ImportKindIcon kind={def.importKind} />
                            {IMPORT_KIND_LABELS[def.importKind]}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{def.description}</p>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">
                          {def.fileHint}
                        </p>
                      </div>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Data Connectors</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select live connector templates for devices of this type. Only connectors compatible
                with {CATEGORY_LABELS[form.category].toLowerCase()} are shown.
              </p>
            </div>

            {categoryConnectors.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-background px-3 py-4 text-xs text-muted-foreground">
                No data connectors defined for {CATEGORY_LABELS[form.category].toLowerCase()} yet.
                Create one under Resource Pool → Data Connectors.
              </p>
            ) : (
              <ul className="space-y-2">
                {categoryConnectors.map((conn) => {
                  const checked = form.enabledConnectorIds.includes(conn.id)
                  return (
                    <li key={conn.id}>
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
                          onChange={() => toggleConnector(conn.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{conn.name}</span>
                            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              <Link2 className="h-3 w-3" />
                              {PROTOCOL_LABELS[conn.protocol]}
                            </span>
                            {conn.status === "draft" && (
                              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                                Draft
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {conn.vendor}
                            {conn.description ? ` · ${conn.description}` : ""}
                          </p>
                          <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">
                            {conn.endpointPattern}
                          </p>
                        </div>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
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
                form.enabledCapabilityKeys.length === 0
              }
            >
              {submitting ? "Saving…" : mode === "edit" ? "Save Changes" : "Add Device Type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
