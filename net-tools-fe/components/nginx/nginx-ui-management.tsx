"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
  Server,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  fetchNginxMonitors,
  fetchNginxSites,
  fetchNginxCertificates,
  mapMonitorToInstance,
  removeNginxMonitor,
  type NginxMonitorRecord,
  type NginxUiInstanceView,
  type NginxUiSiteRecord,
  type NginxUiCertificateRecord,
} from "@/lib/nginx/api"
import {
  fetchNginxJobs,
  latestJobByServer,
} from "@/lib/resource-pool/servers"
import { AddNginxUiDialog } from "./add-nginx-ui-dialog"
import { EditNginxUiDialog } from "./edit-nginx-ui-dialog"
import { NginxMetricsPanel } from "./nginx-metrics-panel"

function InstanceDetail({
  instance,
  onBack,
}: {
  instance: NginxUiInstanceView
  onBack: () => void
}) {
  const [activeTab, setActiveTab] = useState<"sites" | "certificates">("sites")
  const [sites, setSites] = useState<NginxUiSiteRecord[]>([])
  const [sitesLoading, setSitesLoading] = useState(true)
  const [sitesError, setSitesError] = useState<string | null>(null)
  const [certificates, setCertificates] = useState<NginxUiCertificateRecord[]>([])
  const [certificatesLoading, setCertificatesLoading] = useState(false)
  const [certificatesError, setCertificatesError] = useState<string | null>(null)
  const [certificatesLoaded, setCertificatesLoaded] = useState(false)

  const loadSites = useCallback(async () => {
    setSitesLoading(true)
    setSitesError(null)
    try {
      const data = await fetchNginxSites(instance.id)
      setSites(data)
    } catch (err) {
      setSitesError(err instanceof Error ? err.message : "Failed to load sites")
      setSites([])
    } finally {
      setSitesLoading(false)
    }
  }, [instance.id])

  const loadCertificates = useCallback(async () => {
    setCertificatesLoading(true)
    setCertificatesError(null)
    try {
      const data = await fetchNginxCertificates(instance.id)
      setCertificates(data)
      setCertificatesLoaded(true)
    } catch (err) {
      setCertificatesError(err instanceof Error ? err.message : "Failed to load certificates")
      setCertificates([])
    } finally {
      setCertificatesLoading(false)
    }
  }, [instance.id])

  useEffect(() => {
    void loadSites()
  }, [loadSites])

  useEffect(() => {
    if (activeTab === "certificates" && !certificatesLoaded && !certificatesLoading) {
      void loadCertificates()
    }
  }, [activeTab, certificatesLoaded, certificatesLoading, loadCertificates])

  const formatDate = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleString("id-ID") : "—"

  const expiryBadgeClass = (notAfter: string | null | undefined) => {
    if (!notAfter) return ""
    const daysLeft = (new Date(notAfter).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (daysLeft < 0) return "bg-destructive/15 text-destructive border-destructive/30"
    if (daysLeft <= 30) return "bg-warning/15 text-warning border-warning/30"
    return "bg-success/15 text-success border-success/30"
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-2">Back</span>
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{instance.name}</h2>
            <p className="text-sm text-muted-foreground">
              {instance.hostname} · {instance.ip}:{instance.port}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={instance.panelUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            <span className="ml-2">Open nginx-ui</span>
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Connection</p>
          <Badge
            className={cn(
              "mt-2",
              instance.connection === "online" && "bg-success/15 text-success border-success/30",
            )}
          >
            {instance.connection}
          </Badge>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">nginx version</p>
          <p className="mt-1 text-sm font-medium">{instance.nginxVersion}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Last nginx check</p>
          <p className="mt-1 text-sm font-medium">{instance.lastChecked}</p>
        </div>
      </div>

      <NginxMetricsPanel serverId={instance.id} />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "sites" | "certificates")}
        className="space-y-0"
      >
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/50 px-4 py-3">
            <div>
              <TabsList className="h-9">
                <TabsTrigger value="sites">Sites</TabsTrigger>
                <TabsTrigger value="certificates">Certificates</TabsTrigger>
              </TabsList>
              <p className="mt-2 text-xs text-muted-foreground">
                Loaded from nginx-ui API · {instance.panelUsername}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (activeTab === "sites" ? loadSites() : loadCertificates())}
              disabled={activeTab === "sites" ? sitesLoading : certificatesLoading}
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  (activeTab === "sites" ? sitesLoading : certificatesLoading) && "animate-spin",
                )}
              />
              <span className="ml-2">Refresh</span>
            </Button>
          </div>

          <TabsContent value="sites" className="mt-0">
            {sitesError && (
              <p className="text-sm text-destructive border-b border-destructive/20 bg-destructive/5 px-4 py-3">
                {sitesError}
              </p>
            )}

            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Site</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">URL</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Proxy target</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sitesLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading sites from nginx-ui…
                    </td>
                  </tr>
                ) : sites.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      No sites found on this instance.
                    </td>
                  </tr>
                ) : (
                  sites.map((site) => (
                    <tr key={site.name} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium">{site.name}</td>
                      <td className="px-4 py-3 text-sm">
                        {site.urls.length > 0 ? (
                          <div className="space-y-1">
                            {site.urls.map((url) => (
                              <code key={url} className="block rounded bg-muted px-2 py-0.5 text-xs">
                                {url}
                              </code>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {site.proxy_target ? (
                          <code className="rounded bg-muted px-2 py-0.5 text-xs">{site.proxy_target}</code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={site.status === "enabled" ? "default" : "secondary"}
                          className={cn(
                            site.status === "enabled" && "bg-success/15 text-success border-success/30",
                            site.status === "maintenance" && "bg-warning/15 text-warning border-warning/30",
                          )}
                        >
                          {site.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(site.modified_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TabsContent>

          <TabsContent value="certificates" className="mt-0">
            {certificatesError && (
              <p className="text-sm text-destructive border-b border-destructive/20 bg-destructive/5 px-4 py-3">
                {certificatesError}
              </p>
            )}

            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Domains</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Issuer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Expires</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Auto renew</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {certificatesLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading certificates from nginx-ui…
                    </td>
                  </tr>
                ) : certificates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No certificates found on this instance.
                    </td>
                  </tr>
                ) : (
                  certificates.map((cert) => (
                    <tr key={cert.id || cert.name} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium">{cert.name}</td>
                      <td className="px-4 py-3 text-sm">
                        {cert.domains.length > 0 ? (
                          <div className="space-y-1">
                            {cert.domains.map((domain) => (
                              <code key={domain} className="block rounded bg-muted px-2 py-0.5 text-xs">
                                {domain}
                              </code>
                            ))}
                          </div>
                        ) : cert.certificate_info?.subject_name ? (
                          <code className="rounded bg-muted px-2 py-0.5 text-xs">
                            {cert.certificate_info.subject_name}
                          </code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {cert.certificate_info?.issuer_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {cert.certificate_info?.not_after ? (
                          <Badge className={cn(expiryBadgeClass(cert.certificate_info.not_after))}>
                            {formatDate(cert.certificate_info.not_after)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={cert.auto_cert === "enabled" ? "default" : "secondary"}
                          className={cn(
                            cert.auto_cert === "enabled" && "bg-success/15 text-success border-success/30",
                            cert.auto_cert === "self-signed" && "bg-muted text-muted-foreground",
                          )}
                        >
                          {cert.auto_cert}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {cert.status ? (
                          <Badge
                            variant={cert.status === "success" ? "default" : "secondary"}
                            className={cn(
                              cert.status === "success" && "bg-success/15 text-success border-success/30",
                              cert.status === "failure" && "bg-destructive/15 text-destructive border-destructive/30",
                              cert.status === "pending" && "bg-warning/15 text-warning border-warning/30",
                            )}
                          >
                            {cert.status}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

export function NginxUIManagement() {
  const [monitors, setMonitors] = useState<NginxMonitorRecord[]>([])
  const [instances, setInstances] = useState<NginxUiInstanceView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editMonitor, setEditMonitor] = useState<NginxMonitorRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NginxMonitorRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [monitorList, jobs] = await Promise.all([fetchNginxMonitors(), fetchNginxJobs()])
      const jobMap = latestJobByServer(jobs)
      setMonitors(monitorList)
      setInstances(monitorList.map((s) => mapMonitorToInstance(s, jobMap.get(s.id))))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load nginx-ui instances")
      setMonitors([])
      setInstances([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const monitorById = useMemo(() => new Map(monitors.map((m) => [String(m.id), m])), [monitors])

  const handleDeleteMonitor = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError(null)
    try {
      await removeNginxMonitor(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove nginx-ui")
    } finally {
      setDeleting(false)
    }
  }

  const selected = instances.find((i) => i.id === selectedId)

  if (selected) {
    return <InstanceDetail instance={selected} onBack={() => setSelectedId(null)} />
  }

  const onlineCount = instances.filter((i) => i.connection === "online").length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {loading
            ? "Loading…"
            : `${instances.length} monitored instance${instances.length !== 1 ? "s" : ""} · ${onlineCount} online`}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="ml-2">Add nginx-ui</span>
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      <AddNginxUiDialog open={addOpen} onOpenChange={setAddOpen} onAdded={load} />

      <EditNginxUiDialog
        monitor={editMonitor}
        onOpenChange={(open) => !open && setEditMonitor(null)}
        onUpdated={load}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove nginx-ui monitor?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> akan dihapus dari daftar nginx-ui monitoring. Device
              tetap ada di Resource Pool.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDeleteMonitor()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removing…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          {error}
        </p>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Instance</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Address</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">nginx</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Connection</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Last checked</th>
              <th className="w-20 px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading from PostgreSQL…
                </td>
              </tr>
            ) : instances.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Server className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="font-medium">No nginx monitors yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Klik <strong>Add nginx-ui</strong> untuk memilih device dari Resource Pool.
                  </p>
                  <Button size="sm" className="mt-3" onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add nginx-ui
                  </Button>
                </td>
              </tr>
            ) : (
              instances.map((instance) => (
                <tr
                  key={instance.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => setSelectedId(instance.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium">{instance.name}</p>
                        <p className="text-xs text-muted-foreground">{instance.hostname}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-muted px-2 py-1 text-xs">
                      {instance.ip}:{instance.port}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-sm">{instance.nginxVersion}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={instance.connection === "online" ? "default" : "secondary"}
                      className={cn(
                        instance.connection === "online" && "bg-success/15 text-success border-success/30",
                      )}
                    >
                      {instance.connection}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{instance.lastChecked}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedId(instance.id)
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem
                            onClick={() => {
                              const monitor = monitorById.get(instance.id)
                              if (monitor) setEditMonitor(monitor)
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit credentials
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              const monitor = monitorById.get(instance.id)
                              if (monitor) setDeleteTarget(monitor)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Data from PostgreSQL (<code className="text-xs">servers</code> where nginx_monitored=true) and latest nginx
        check jobs. Site and certificate lists are loaded live from nginx-ui API.
      </p>
    </div>
  )
}
