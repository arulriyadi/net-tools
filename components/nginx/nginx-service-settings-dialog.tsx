"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CHECK_INTERVAL_OPTIONS,
  formatCheckSchedule,
  formatNextCheckAt,
  type NginxServiceCheckSettings,
} from "@/lib/nginx/service-check-settings"

interface NginxServiceSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: NginxServiceCheckSettings
  onSave: (settings: NginxServiceCheckSettings) => void | Promise<void>
}

export function NginxServiceSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave,
}: NginxServiceSettingsDialogProps) {
  const [draft, setDraft] = useState(settings)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setDraft(settings)
  }, [open, settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(draft)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check schedule settings</DialogTitle>
          <DialogDescription>
            Nginx service checks are not realtime — they run on a fixed schedule (by day or month)
            at the time you choose.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="check-interval">Check interval</Label>
            <Select
              value={draft.interval}
              onValueChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  interval: value as NginxServiceCheckSettings["interval"],
                }))
              }
            >
              <SelectTrigger id="check-interval">
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                {CHECK_INTERVAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="check-time">Run check at (local time)</Label>
            <Input
              id="check-time"
              type="time"
              value={draft.checkTime}
              onChange={(e) => setDraft((prev) => ({ ...prev, checkTime: e.target.value || "00:00" }))}
            />
            <p className="text-xs text-muted-foreground">Default 00:00 — midnight local time.</p>
          </div>

          <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 text-sm">
            <p className="font-medium text-foreground">{formatCheckSchedule(draft)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Next scheduled check: {formatNextCheckAt(draft)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              "Save settings"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
