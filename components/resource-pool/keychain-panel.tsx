"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { KeyRound, Plus, Trash2, Copy, ExternalLink, Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  type SshKeyEntry,
  fetchSshKeys,
  importSshKeyApi,
  deleteSshKeyApi,
} from "@/lib/resource-pool/ssh-keys"

const emptyForm = { name: "", comment: "", keyContent: "" }

export function KeychainPanel() {
  const [keys, setKeys] = useState<SshKeyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadKeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setKeys(await fetchSshKeys())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load keys")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadKeys()
  }, [loadKeys])

  const resetForm = () => {
    setForm(emptyForm)
    setFile(null)
    setError(null)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    if (!file && !form.keyContent.trim()) {
      setError("Upload a key file or paste private key content")
      return
    }

    setImporting(true)
    setError(null)
    try {
      const body = new FormData()
      body.append("name", form.name.trim())
      if (form.comment.trim()) body.append("comment", form.comment.trim())
      if (file) body.append("file", file)
      else body.append("keyContent", form.keyContent.trim())

      const entry = await importSshKeyApi(body)
      setKeys((prev) => [entry, ...prev])
      resetForm()
      setAddOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
    } finally {
      setImporting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSshKeyApi(id)
      setKeys((prev) => prev.filter((k) => k.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading keychain…" : (
            <>
              {keys.length} key{keys.length !== 1 ? "s" : ""} in keychain — referenced by Device Inventory SSH access
            </>
          )}
        </p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="ml-2">Add Key</span>
        </Button>
      </div>

      {error && !addOpen && (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          {error}
        </p>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Storage</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Fingerprint</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Added</th>
              <th className="w-24 px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading keys…
                </td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No keys yet. Import a private key to get started.
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium">
                      <KeyRound className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        {key.name}
                        {key.comment && (
                          <p className="text-xs font-normal text-muted-foreground">{key.comment}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-muted px-2 py-0.5 text-xs break-all">{key.path}</code>
                    {key.keyType && (
                      <span className="ml-2 text-xs text-muted-foreground">{key.keyType}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell font-mono text-xs">
                    {key.fingerprint ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{key.addedAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                        title="Copy storage path"
                        onClick={() => navigator.clipboard.writeText(key.path)}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Private keys are stored on the server at{" "}
        <code className="text-xs">/opt/nettools/data/keys</code> (files mode 600, directory 700). Used when adding
        devices with SSH auth &quot;Key from Keychain&quot;. Override with env{" "}
        <code className="text-xs">NETTOOLS_SSH_KEYS_DIR</code> if needed.
      </p>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import SSH Key</DialogTitle>
            <DialogDescription>
              Upload or paste a private key. It will be saved securely on the server for reuse across devices.{" "}
              <Link href="/resource-pool/device-inventory" className="text-primary hover:underline inline-flex items-center gap-0.5">
                Device Inventory <ExternalLink className="h-3 w-3" />
              </Link>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Display name *</Label>
              <Input
                id="key-name"
                placeholder="e.g. Jabar Prod"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key-file">Key file</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="key-file"
                  type="file"
                  accept=".pem,.key,.pub,.txt,application/octet-stream"
                  className="cursor-pointer"
                  onChange={(e) => {
                    const picked = e.target.files?.[0] ?? null
                    setFile(picked)
                    if (picked) setForm((f) => ({ ...f, keyContent: "" }))
                  }}
                />
                <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground">OpenSSH or PEM private key (.key, .pem)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="key-paste">Or paste key content</Label>
              <Textarea
                id="key-paste"
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                rows={4}
                value={form.keyContent}
                onChange={(e) => {
                  setForm((f) => ({ ...f, keyContent: e.target.value }))
                  if (e.target.value.trim()) setFile(null)
                }}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key-comment">Comment</Label>
              <Input
                id="key-comment"
                placeholder="Optional label, e.g. capzs@jabar-prod"
                value={form.comment}
                onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              />
            </div>

            {error && addOpen && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={importing}>
                Cancel
              </Button>
              <Button type="submit" disabled={importing || !form.name.trim()}>
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importing…
                  </>
                ) : (
                  "Import Key"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
