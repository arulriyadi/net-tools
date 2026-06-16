"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ExternalLink, Loader2 } from "lucide-react"
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
import { updateNginxServiceSettings } from "@/lib/nginx/service-api"
import type { NginxServiceRole, NginxServiceView } from "@/lib/nginx/service-types"
import { runNginxCheck } from "@/lib/resource-pool/servers"

interface EditNginxServiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: NginxServiceView | null
  onSaved: () => void | Promise<void>
}

export function EditNginxServiceDialog({
  open,
  onOpenChange,
  server,
  onSaved,
}: EditNginxServiceDialogProps) {
  const [role, setRole] = useState<NginxServiceRole>("nginx-ui")
  const [assetName, setAssetName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && server) {
      setRole(server.role)
      setAssetName(server.displayName)
      setError(null)
    }
  }, [open, server])

  const suggestions = useMemo(() => {
    if (!server) return []
    return buildAssetNameSuggestions(server.name, server.inventoryHostname, server.hostname)
  }, [server])

  const previewName = assetName.trim() || server?.displayName || ""
  const previewHostname = server
    ? resolveDetectedHostname(server.inventoryHostname, server.hostname)
    : ""

  const handleSubmit = async () => {
    if (!server) return
    if (!assetName.trim()) {
      setError("Isi asset name terlebih dahulu.")
      return
    }

    const { mode, custom } = resolveFleetLabelFromInput(
      assetName,
      server.name,
      server.inventoryHostname,
      server.hostname,
    )

    setSaving(true)
    setError(null)
    try {
      await updateNginxServiceSettings(server.id, {
        role,
        fleetLabelMode: mode,
        fleetLabelCustom: custom,
      })
      if (server.sshConfigured) {
        await runNginxCheck(server.id).catch(() => undefined)
      }
      await onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update nginx device")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Nginx</DialogTitle>
          <DialogDescription>
            Ubah label tampilan dan peran nginx untuk device ini. Untuk edit hostname, IP, atau SSH
            key, gunakan Device Inventory.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            {error}
          </p>
        )}

        {server && (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">{previewName}</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {server.name} · {previewHostname} · {server.ip}
              </p>
            </div>

            <AssetNameInput
              value={assetName}
              onChange={setAssetName}
              suggestions={suggestions}
            />

            <div className="space-y-2">
              <Label htmlFor="edit-nginx-service-role">Nginx role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as NginxServiceRole)}>
                <SelectTrigger id="edit-nginx-service-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nginx-ui">Nginx UI</SelectItem>
                  <SelectItem value="nginx-proxy">Nginx Proxy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="link" size="sm" className="h-auto p-0" asChild>
              <Link href="/resource-pool/device-inventory">
                Edit device details in Resource Pool
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving || !server}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
