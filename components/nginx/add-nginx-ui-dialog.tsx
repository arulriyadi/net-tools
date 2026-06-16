"use client"

import { useCallback, useEffect, useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addNginxMonitor, fetchAvailableNginxMonitors } from "@/lib/nginx/api"
import type { ServerRecord } from "@/lib/resource-pool/servers"
import { runNginxCheck } from "@/lib/resource-pool/servers"

interface AddNginxUiDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: () => void | Promise<void>
}

function defaultPanelUrl(server?: ServerRecord | null) {
  if (!server) return ""
  return `http://${server.ip}:9000`
}

export function AddNginxUiDialog({ open, onOpenChange, onAdded }: AddNginxUiDialogProps) {
  const [available, setAvailable] = useState<ServerRecord[]>([])
  const [serverId, setServerId] = useState<string>("")
  const [panelUrl, setPanelUrl] = useState("")
  const [username, setUsername] = useState("admin")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedServer = available.find((s) => String(s.id) === serverId) ?? null

  const resetForm = useCallback((servers: ServerRecord[]) => {
    const first = servers[0]
    setServerId(first ? String(first.id) : "")
    setPanelUrl(defaultPanelUrl(first))
    setUsername("admin")
    setPassword("")
    setError(null)
  }, [])

  const loadAvailable = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const servers = await fetchAvailableNginxMonitors()
      setAvailable(servers)
      resetForm(servers)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices")
      setAvailable([])
      resetForm([])
    } finally {
      setLoading(false)
    }
  }, [resetForm])

  useEffect(() => {
    if (open) loadAvailable()
  }, [open, loadAvailable])

  const handleServerChange = (value: string) => {
    setServerId(value)
    const server = available.find((s) => String(s.id) === value)
    setPanelUrl(defaultPanelUrl(server))
  }

  const handleSubmit = async () => {
    if (!serverId || !username.trim() || !password) return
    setSaving(true)
    setError(null)
    try {
      await addNginxMonitor({
        server_id: Number(serverId),
        panel_url: panelUrl.trim() || undefined,
        username: username.trim(),
        password,
      })
      await runNginxCheck(serverId).catch(() => undefined)
      await onAdded()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add nginx-ui")
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = Boolean(serverId && username.trim() && password && panelUrl.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add nginx-ui</DialogTitle>
          <DialogDescription>
            Pilih device dari Resource Pool, lalu masukkan kredensial panel nginx-ui. NetTools akan login ke API
            nginx-ui dan menyimpan koneksi secara aman.
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
              Semua device sudah dimonitor, atau belum ada device di Resource Pool.
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
              <Label htmlFor="nginx-ui-device">Device</Label>
              <Select value={serverId} onValueChange={handleServerChange}>
                <SelectTrigger id="nginx-ui-device">
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
                  {selectedServer.hostname} · {selectedServer.group}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nginx-ui-url">Panel URL</Label>
              <Input
                id="nginx-ui-url"
                value={panelUrl}
                onChange={(e) => setPanelUrl(e.target.value)}
                placeholder="http://172.32.1.228:9000"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nginx-ui-user">Username</Label>
                <Input
                  id="nginx-ui-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nginx-ui-password">Password</Label>
                <Input
                  id="nginx-ui-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !canSubmit || available.length === 0}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Connecting…
              </>
            ) : (
              "Add nginx-ui"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
