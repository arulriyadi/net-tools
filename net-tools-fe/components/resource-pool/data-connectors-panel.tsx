"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Radio,
  Plug,
  Terminal,
  Network,
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
import { DataConnectorDialog } from "@/components/resource-pool/data-connector-dialog"
import {
  AUTH_METHOD_LABELS,
  POLL_MODE_LABELS,
  PROTOCOL_LABELS,
  capabilityLabels,
  categoryLabels,
  summarizeConnectors,
  type ConnectorProtocol,
  type DataConnectorFormData,
  type DataConnectorRecord,
} from "@/lib/resource-pool/data-connectors-mock"
import {
  createDataConnector,
  deleteDataConnector,
  fetchDataConnectors,
  updateDataConnector,
} from "@/lib/resource-pool/data-connectors-api"

const PROTOCOL_ICONS: Record<ConnectorProtocol, typeof Plug> = {
  api: Plug,
  rest: Plug,
  snmp: Radio,
  ssh: Terminal,
  netconf: Network,
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

function ProtocolBadge({ protocol }: { protocol: ConnectorProtocol }) {
  const Icon = PROTOCOL_ICONS[protocol]
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium">
      <Icon className="h-3 w-3" />
      {PROTOCOL_LABELS[protocol]}
    </span>
  )
}

export function DataConnectorsPanel() {
  const [connectors, setConnectors] = useState<DataConnectorRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DataConnectorRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DataConnectorRecord | null>(null)

  const loadConnectors = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await fetchDataConnectors()
      setConnectors(loaded)
      setExpandedId((prev) => prev ?? loaded[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load connectors")
      setConnectors([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadConnectors()
  }, [loadConnectors])

  const summary = useMemo(() => summarizeConnectors(connectors), [connectors])

  const handleSubmit = async (form: DataConnectorFormData) => {
    setError(null)
    try {
      if (editTarget) {
        await updateDataConnector(editTarget.id, form)
      } else {
        const created = await createDataConnector(form)
        setExpandedId(created.id)
      }
      await loadConnectors()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save connector")
      throw err
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setError(null)
    try {
      await deleteDataConnector(deleteTarget.id)
      if (expandedId === deleteTarget.id) setExpandedId(null)
      setDeleteTarget(null)
      await loadConnectors()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete connector")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading data connectors from database…
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
        <StatCard label="Connectors" value={summary.total} hint="Live collection templates" />
        <StatCard label="Active" value={summary.active} />
        <StatCard
          label="REST / API"
          value={summary.byProtocol.rest + summary.byProtocol.api}
        />
        <StatCard
          label="Linked Types"
          value={summary.linkedTypes}
          hint="Mapped in Device Types"
        />
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Connectors define <span className="font-medium text-foreground">how</span> live data is
        fetched (API, SNMP, SSH). Device IP and credentials are set in{" "}
        <span className="font-medium text-foreground">Device Inventory</span> — not here. Stored in
        PostgreSQL.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {connectors.length} connector{connectors.length !== 1 ? "s" : ""}
        </p>
        <Button
          onClick={() => {
            setEditTarget(null)
            setDialogOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          <span className="ml-2">Add Data Connector</span>
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <ul className="divide-y divide-border">
          {connectors.map((conn) => {
            const expanded = expandedId === conn.id
            return (
              <li key={conn.id}>
                <div className="flex flex-wrap items-start gap-3 px-4 py-4 hover:bg-muted/20">
                  <button
                    type="button"
                    className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={() => setExpandedId(expanded ? null : conn.id)}
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{conn.name}</span>
                      <ProtocolBadge protocol={conn.protocol} />
                      <span
                        className={cn(
                          "rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase",
                          conn.status === "active"
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {conn.status}
                      </span>
                      {conn.typeCount > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          {conn.typeCount} type{conn.typeCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {conn.vendor} · {categoryLabels(conn.compatibleCategories)}
                    </p>
                    {!expanded && (
                      <p className="text-[11px] text-muted-foreground">{capabilityLabels(conn.capabilityKeys)}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditTarget(conn)
                        setDialogOpen(true)
                      }}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(conn)}
                      aria-label="Delete"
                      disabled={conn.typeCount > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-border bg-muted/10 px-4 py-4 pl-12 space-y-4">
                    <p className="text-sm text-muted-foreground">{conn.description}</p>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                      <div>
                        <div className="text-[10px] font-medium uppercase text-muted-foreground">
                          Endpoint pattern
                        </div>
                        <div className="mt-1 font-mono text-xs break-all">{conn.endpointPattern}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium uppercase text-muted-foreground">
                          Default port
                        </div>
                        <div className="mt-1">{conn.defaultPort ?? "—"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium uppercase text-muted-foreground">
                          Poll mode
                        </div>
                        <div className="mt-1">
                          {POLL_MODE_LABELS[conn.pollMode]}
                          {conn.defaultIntervalMinutes != null && (
                            <span className="text-muted-foreground">
                              {" "}
                              · every {conn.defaultIntervalMinutes}m
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium uppercase text-muted-foreground">
                          Auth (per device)
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {conn.authMethods.map((m) => (
                            <span
                              key={m}
                              className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px]"
                            >
                              {AUTH_METHOD_LABELS[m]}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium uppercase text-muted-foreground">
                          Parser
                        </div>
                        <div className="mt-1 font-mono text-xs">{conn.parserId}</div>
                      </div>
                      <div className="sm:col-span-2 lg:col-span-1">
                        <div className="text-[10px] font-medium uppercase text-muted-foreground">
                          Datasets
                        </div>
                        <div className="mt-1 text-xs">{capabilityLabels(conn.capabilityKeys)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <DataConnectorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        mode={editTarget ? "edit" : "add"}
        initial={editTarget}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete data connector?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.typeCount
                ? "This connector is linked to device types and cannot be deleted."
                : `Remove "${deleteTarget?.name}" from the catalog.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={(deleteTarget?.typeCount ?? 0) > 0}
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
