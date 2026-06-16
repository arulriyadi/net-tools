"use client"

import { useEffect, useState } from "react"
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
import { updateNginxMonitor, type NginxMonitorRecord } from "@/lib/nginx/api"

interface EditNginxUiDialogProps {
  monitor: NginxMonitorRecord | null
  onOpenChange: (open: boolean) => void
  onUpdated: () => void | Promise<void>
}

export function EditNginxUiDialog({ monitor, onOpenChange, onUpdated }: EditNginxUiDialogProps) {
  const [panelUrl, setPanelUrl] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!monitor) return
    setPanelUrl(monitor.nginx_ui?.panel_url ?? `http://${monitor.ip}:9000`)
    setUsername(monitor.nginx_ui?.username ?? "admin")
    setPassword("")
    setError(null)
  }, [monitor])

  const handleSubmit = async () => {
    if (!monitor || !username.trim() || !panelUrl.trim()) return
    setSaving(true)
    setError(null)
    try {
      await updateNginxMonitor(monitor.id, {
        panel_url: panelUrl.trim(),
        username: username.trim(),
        ...(password ? { password } : {}),
      })
      await onUpdated()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update nginx-ui credentials")
    } finally {
      setSaving(false)
    }
  }

  const open = !!monitor
  const canSubmit = Boolean(username.trim() && panelUrl.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit nginx-ui credentials</DialogTitle>
          <DialogDescription>
            Update panel URL, username, and password for this nginx-ui connection. Device info (name, IP, SSH)
            diubah di Resource Pool.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            {error}
          </p>
        )}

        {monitor && (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{monitor.name}</span>
                <span className="text-muted-foreground">· {monitor.ip}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {monitor.hostname} ·{" "}
                <Link href="/resource-pool/device-inventory" className="underline underline-offset-2">
                  Edit device in Resource Pool
                  <ExternalLink className="ml-1 inline h-3 w-3" />
                </Link>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-nginx-ui-url">Panel URL</Label>
              <Input
                id="edit-nginx-ui-url"
                value={panelUrl}
                onChange={(e) => setPanelUrl(e.target.value)}
                placeholder="http://172.32.1.228:9000"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-nginx-ui-user">Username</Label>
                <Input
                  id="edit-nginx-ui-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nginx-ui-password">Password</Label>
                <Input
                  id="edit-nginx-ui-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak diubah"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !canSubmit}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Verifying…
              </>
            ) : (
              "Save credentials"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
