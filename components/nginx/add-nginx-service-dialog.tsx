"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ExternalLink, Loader2, Server } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AssetNameInput } from "@/components/nginx/asset-name-input"
import {
  buildAssetNameSuggestions,
  resolveDetectedHostname,
  resolveFleetLabelFromInput,
} from "@/lib/nginx/fleet-display-label"
import { isNginxServiceDevice } from "@/lib/nginx/service-api"
import {
  fetchDevices,
  fetchNginxJobs,
  groupToRole,
  latestJobByServer,
  roleToGroup,
  runNginxCheck,
  updateDevice,
  type ServerRecord,
} from "@/lib/resource-pool/servers"

interface AddNginxServiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: () => void | Promise<void>
}

export function AddNginxServiceDialog({ open, onOpenChange, onAdded }: AddNginxServiceDialogProps) {
  const [available, setAvailable] = useState<ServerRecord[]>([])
  const [serverId, setServerId] = useState("")
  const [role, setRole] = useState<"nginx-ui" | "nginx-proxy">("nginx-ui")
  const [assetName, setAssetName] = useState("")
  const [detectedHostnames, setDetectedHostnames] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedServer = available.find((s) => String(s.id) === serverId) ?? null

  const resetForm = useCallback((servers: ServerRecord[]) => {
    const first = servers[0]
    setServerId(first ? String(first.id) : "")
    setRole("nginx-ui")
    setAssetName(first?.name ?? "")
    setError(null)
  }, [])

  const loadAvailable = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [servers, jobs] = await Promise.all([fetchDevices(), fetchNginxJobs(100)])
      const jobMap = latestJobByServer(jobs)
      const eligible = servers.filter((s) => !isNginxServiceDevice(s))
      const detected: Record<number, string> = {}
      for (const server of eligible) {
        const hostname = (jobMap.get(server.id)?.result?.hostname as string | undefined)?.trim()
        if (hostname) detected[server.id] = hostname
      }
      setDetectedHostnames(detected)
      setAvailable(eligible)
      resetForm(eligible)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices")
      setAvailable([])
      resetForm([])
    } finally {
      setLoading(false)
    }
  }, [resetForm])

  useEffect(() => {
    if (open) void loadAvailable()
  }, [open, loadAvailable])

  useEffect(() => {
    if (selectedServer) {
      setAssetName(selectedServer.name)
    }
  }, [selectedServer?.id])

  const selectedDetectedHostname = selectedServer
    ? detectedHostnames[selectedServer.id]
    : undefined

  const suggestions = useMemo(() => {
    if (!selectedServer) return []
    return buildAssetNameSuggestions(
      selectedServer.name,
      selectedServer.hostname,
      selectedDetectedHostname,
    )
  }, [selectedServer, selectedDetectedHostname])

  const previewHostname = selectedServer
    ? resolveDetectedHostname(selectedServer.hostname, selectedDetectedHostname)
    : ""

  const previewName = assetName.trim() || selectedServer?.name || ""

  const handleSubmit = async () => {
    if (!selectedServer) return
    if (!assetName.trim()) {
      setError("Isi asset name terlebih dahulu.")
      return
    }

    const { mode, custom } = resolveFleetLabelFromInput(
      assetName,
      selectedServer.name,
      selectedServer.hostname,
      selectedDetectedHostname,
    )

    setSaving(true)
    setError(null)
    try {
      await updateDevice(String(selectedServer.id), {
        name: selectedServer.name,
        hostname: selectedServer.hostname,
        ip: selectedServer.ip,
        group: roleToGroup(role),
        ssh_user: selectedServer.ssh_user,
        ssh_key_path: selectedServer.ssh_key_path,
        notes: selectedServer.notes,
        nginx_fleet_label_mode: mode,
        nginx_fleet_label_custom: custom,
      })
      if (selectedServer.ssh_key_path) {
        await runNginxCheck(selectedServer.id).catch(() => undefined)
      }
      await onAdded()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add nginx device")
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = Boolean(serverId && assetName.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Nginx</DialogTitle>
          <DialogDescription>
            Pilih device dari Resource Pool dan tentukan peran nginx. Device akan muncul di daftar service
            management setelah role di-set ke Nginx UI atau Nginx Proxy.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading devices…
          </div>
        ) : available.length === 0 ? (
          <div className="rounded-md border border-border px-4 py-10 text-center">
            <Server className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium text-sm">No devices available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Semua device sudah berperan nginx, atau belum ada device di Resource Pool.
            </p>
            <Button variant="link" size="sm" className="mt-2" asChild>
              <Link href="/resource-pool/device-inventory">
                Add device in Resource Pool
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nginx-service-device">Device</Label>
              <Select value={serverId} onValueChange={setServerId}>
                <SelectTrigger id="nginx-service-device">
                  <SelectValue placeholder="Pilih device" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((server) => (
                    <SelectItem key={server.id} value={String(server.id)}>
                      {server.name} · {server.ip}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedServer && (
                <p className="text-xs text-muted-foreground">
                  {previewHostname} · current role: {groupToRole(selectedServer.group)}
                  {!selectedServer.ssh_key_path && " · SSH key belum di-set"}
                </p>
              )}
            </div>

            {selectedServer && (
              <>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                  <p className="font-medium">{previewName}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {selectedServer.name} · {previewHostname} · {selectedServer.ip}
                  </p>
                </div>

                <AssetNameInput
                  id="add-fleet-label-input"
                  value={assetName}
                  onChange={setAssetName}
                  suggestions={suggestions}
                />
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="nginx-service-role">Nginx role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "nginx-ui" | "nginx-proxy")}>
                <SelectTrigger id="nginx-service-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nginx-ui">Nginx UI</SelectItem>
                  <SelectItem value="nginx-proxy">Nginx Proxy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving || !canSubmit || available.length === 0}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Adding…
              </>
            ) : (
              "Add Nginx"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
