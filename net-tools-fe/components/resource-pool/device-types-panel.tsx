"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  Router,
  Layers,
  Database,
  ChevronDown,
  ChevronRight,
  Link2,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import { DeviceTypeDialog } from "@/components/resource-pool/device-type-dialog"
import {
  CATEGORY_LABELS,
  IMPORT_KIND_LABELS,
  capabilitySummary,
  enabledCapabilities,
  summarizeDeviceTypes,
  type DeviceCategory,
  type DeviceTypeFormData,
  type DeviceTypeRecord,
} from "@/lib/resource-pool/device-types-mock"
import {
  connectorSummary,
  PROTOCOL_LABELS,
  resolveConnectors,
  type DataConnectorRecord,
} from "@/lib/resource-pool/data-connectors-mock"
import { fetchDataConnectors } from "@/lib/resource-pool/data-connectors-api"
import {
  createDeviceType,
  deleteDeviceType,
  fetchDeviceTypes,
  mapDeviceTypeFormToPayload,
  updateDeviceType,
} from "@/lib/resource-pool/device-types-api"

const CATEGORY_ICONS: Record<DeviceCategory, typeof Shield> = {
  firewall: Shield,
  router: Router,
  switch: Layers,
}

function CategoryBadge({ category }: { category: DeviceCategory }) {
  const Icon = CATEGORY_ICONS[category]
  const cls =
    category === "firewall"
      ? "bg-success/15 text-success border-success/30"
      : category === "router"
        ? "bg-primary/15 text-primary border-primary/30"
        : "bg-chart-2/15 text-chart-2 border-chart-2/30"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        cls,
      )}
    >
      <Icon className="h-3 w-3" />
      {CATEGORY_LABELS[category]}
    </span>
  )
}

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

export function DeviceTypesPanel() {
  const [types, setTypes] = useState<DeviceTypeRecord[]>([])
  const [connectors, setConnectors] = useState<DataConnectorRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DeviceTypeRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeviceTypeRecord | null>(null)

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [loadedTypes, loadedConnectors] = await Promise.all([
        fetchDeviceTypes(),
        fetchDataConnectors(),
      ])
      setTypes(loadedTypes)
      setConnectors(loadedConnectors)
      setExpandedId((prev) => prev ?? loadedTypes[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load device types")
      setTypes([])
      setConnectors([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  const summary = useMemo(() => summarizeDeviceTypes(types), [types])

  const openAdd = () => {
    setEditTarget(null)
    setDialogOpen(true)
  }

  const openEdit = (type: DeviceTypeRecord) => {
    setEditTarget(type)
    setDialogOpen(true)
  }

  const handleSubmit = async (form: DeviceTypeFormData) => {
    setError(null)
    try {
      const payload = mapDeviceTypeFormToPayload(form, editTarget ?? undefined)
      if (editTarget) {
        await updateDeviceType(editTarget.id, payload)
      } else {
        const created = await createDeviceType(payload)
        setExpandedId(created.id)
      }
      await loadCatalog()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save device type")
      throw err
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setError(null)
    try {
      await deleteDeviceType(deleteTarget.id)
      if (expandedId === deleteTarget.id) setExpandedId(null)
      setDeleteTarget(null)
      await loadCatalog()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete device type")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading device types from database…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Device Types" value={summary.total} hint="Vendor templates" />
        <StatCard label="Firewall Types" value={summary.byCategory.firewall} />
        <StatCard label="Router / Switch" value={summary.byCategory.router + summary.byCategory.switch} />
        <StatCard
          label="Devices Linked"
          value={summary.totalDevices}
          hint="From inventory (when persisted)"
        />
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Device types define <span className="font-medium text-foreground">what</span> datasets a vendor
        supports and which connectors can fetch them live. Stored in PostgreSQL.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {types.length} type{types.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          <span className="ml-2">Add Device Type</span>
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <ul className="divide-y divide-border">
          {types.map((type) => {
            const expanded = expandedId === type.id
            const caps = enabledCapabilities(type)
            const linkedConnectors = resolveConnectors(type.connectorIds, connectors)
            return (
              <li key={type.id}>
                <div className="flex flex-wrap items-start gap-3 px-4 py-4 hover:bg-muted/20">
                  <button
                    type="button"
                    className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={() => setExpandedId(expanded ? null : type.id)}
                    aria-expanded={expanded}
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{type.name}</span>
                      <CategoryBadge category={type.category} />
                      {type.deviceCount > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          {type.deviceCount} device{type.deviceCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {type.vendor}
                      {type.description ? ` · ${type.description}` : ""}
                    </p>
                    {!expanded && (
                      <>
                        <p className="text-[11px] text-muted-foreground">
                          <Database className="mr-1 inline h-3 w-3" />
                          {capabilitySummary(type)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          <Link2 className="mr-1 inline h-3 w-3" />
                          {connectorSummary(type.connectorIds, connectors)}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(type)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(type)}
                      aria-label="Delete"
                      disabled={type.deviceCount > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-border bg-muted/10 px-4 py-4 pl-12">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Enabled datasets ({caps.length})
                    </p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {caps.map((cap) => (
                        <div
                          key={cap.key}
                          className="rounded-lg border border-border bg-card p-3 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">{cap.label}</span>
                            <span className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {IMPORT_KIND_LABELS[cap.importKind]}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{cap.description}</p>
                          <p className="mt-2 font-mono text-[10px] text-muted-foreground/90">
                            {cap.fileHint}
                          </p>
                        </div>
                      ))}
                    </div>
                    {type.capabilities.some((c) => !c.enabled) && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Disabled:{" "}
                        {type.capabilities
                          .filter((c) => !c.enabled)
                          .map((c) => c.label)
                          .join(", ")}
                      </p>
                    )}

                    <p className="mb-3 mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Linked connectors ({linkedConnectors.length})
                    </p>
                    {linkedConnectors.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No live connectors linked — CSV / datastore-only import only.
                      </p>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-2">
                        {linkedConnectors.map((conn) => (
                          <div
                            key={conn.id}
                            className="rounded-lg border border-border bg-card p-3 text-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium">{conn.name}</span>
                              <span className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {PROTOCOL_LABELS[conn.protocol]}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{conn.vendor}</p>
                            <p className="mt-2 font-mono text-[10px] text-muted-foreground/90">
                              {conn.endpointPattern}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <DeviceTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        mode={editTarget ? "edit" : "add"}
        initial={editTarget}
        connectors={connectors}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete device type?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.deviceCount
                ? "This type is linked to inventory devices and cannot be deleted."
                : `Remove "${deleteTarget?.name}" from the catalog.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={(deleteTarget?.deviceCount ?? 0) > 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
