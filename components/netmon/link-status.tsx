"use client"

import { useState, useEffect } from "react"
import {
  Link2,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowRight,
  Wifi,
  WifiOff,
} from "lucide-react"

interface NetworkLink {
  id: string
  name: string
  source: {
    name: string
    ip: string
  }
  destination: {
    name: string
    ip: string
  }
  type: "wan" | "lan" | "vpn" | "mpls"
  bandwidth: string
  status: "up" | "down" | "degraded"
  latency: number
  jitter: number
  packetLoss: number
  uptime: number // percentage
  lastCheck: Date
  history: { time: Date; latency: number; status: "up" | "down" | "degraded" }[]
}

const mockLinks: NetworkLink[] = [
  {
    id: "1",
    name: "Main Site to DRC - Primary",
    source: { name: "Main Site", ip: "10.0.0.1" },
    destination: { name: "DRC Site", ip: "10.1.0.1" },
    type: "mpls",
    bandwidth: "1 Gbps",
    status: "up",
    latency: 38,
    jitter: 2.5,
    packetLoss: 0.1,
    uptime: 99.95,
    lastCheck: new Date(),
    history: Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.now() - i * 3600000),
      latency: 35 + Math.random() * 10,
      status: Math.random() > 0.98 ? "degraded" : "up",
    })),
  },
  {
    id: "2",
    name: "Main Site to DRC - Backup",
    source: { name: "Main Site", ip: "10.0.0.1" },
    destination: { name: "DRC Site", ip: "10.1.0.1" },
    type: "vpn",
    bandwidth: "500 Mbps",
    status: "up",
    latency: 65,
    jitter: 5.2,
    packetLoss: 0.5,
    uptime: 99.8,
    lastCheck: new Date(),
    history: Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.now() - i * 3600000),
      latency: 60 + Math.random() * 15,
      status: Math.random() > 0.95 ? "degraded" : "up",
    })),
  },
  {
    id: "3",
    name: "Office to Cloud - AWS",
    source: { name: "Main Office", ip: "192.168.1.1" },
    destination: { name: "AWS VPC", ip: "10.100.0.1" },
    type: "vpn",
    bandwidth: "500 Mbps",
    status: "degraded",
    latency: 85,
    jitter: 12.5,
    packetLoss: 2.5,
    uptime: 98.5,
    lastCheck: new Date(),
    history: Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.now() - i * 3600000),
      latency: 70 + Math.random() * 30,
      status: i < 3 ? "degraded" : Math.random() > 0.9 ? "degraded" : "up",
    })),
  },
  {
    id: "4",
    name: "Branch Office Link",
    source: { name: "Main Site", ip: "10.0.0.1" },
    destination: { name: "Branch Office", ip: "10.2.0.1" },
    type: "wan",
    bandwidth: "100 Mbps",
    status: "down",
    latency: 0,
    jitter: 0,
    packetLoss: 100,
    uptime: 85.2,
    lastCheck: new Date(),
    history: Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.now() - i * 3600000),
      latency: i < 5 ? 0 : 25 + Math.random() * 10,
      status: i < 5 ? "down" : "up",
    })),
  },
  {
    id: "5",
    name: "LAN Backbone",
    source: { name: "Core Switch", ip: "10.0.0.254" },
    destination: { name: "Distribution Switch", ip: "10.0.1.254" },
    type: "lan",
    bandwidth: "10 Gbps",
    status: "up",
    latency: 0.5,
    jitter: 0.1,
    packetLoss: 0,
    uptime: 100,
    lastCheck: new Date(),
    history: Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.now() - i * 3600000),
      latency: 0.3 + Math.random() * 0.4,
      status: "up" as const,
    })),
  },
]

const statusConfig = {
  up: {
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: CheckCircle2,
    label: "Up",
  },
  down: {
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    icon: XCircle,
    label: "Down",
  },
  degraded: {
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: AlertTriangle,
    label: "Degraded",
  },
}

const typeConfig = {
  wan: { color: "bg-blue-500", label: "WAN" },
  lan: { color: "bg-purple-500", label: "LAN" },
  vpn: { color: "bg-cyan-500", label: "VPN" },
  mpls: { color: "bg-emerald-500", label: "MPLS" },
}

function MiniChart({ history }: { history: NetworkLink["history"] }) {
  const maxLatency = Math.max(...history.map((h) => h.latency), 1)
  const chartHeight = 40
  
  return (
    <div className="flex items-end gap-0.5 h-10">
      {history.slice(0, 24).reverse().map((point, i) => {
        const height = (point.latency / maxLatency) * chartHeight
        return (
          <div
            key={i}
            className={`w-1.5 rounded-t transition-all ${
              point.status === "down"
                ? "bg-red-500"
                : point.status === "degraded"
                ? "bg-amber-500"
                : "bg-emerald-500/70"
            }`}
            style={{ height: Math.max(2, height) }}
            title={`${point.latency.toFixed(1)}ms at ${point.time.toLocaleTimeString()}`}
          />
        )
      })}
    </div>
  )
}

interface AddLinkModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (link: Partial<NetworkLink>) => void
}

function AddLinkModal({ isOpen, onClose, onAdd }: AddLinkModalProps) {
  const [name, setName] = useState("")
  const [sourceName, setSourceName] = useState("")
  const [sourceIp, setSourceIp] = useState("")
  const [destName, setDestName] = useState("")
  const [destIp, setDestIp] = useState("")
  const [type, setType] = useState<NetworkLink["type"]>("wan")
  const [bandwidth, setBandwidth] = useState("")

  const handleSubmit = () => {
    if (name && sourceIp && destIp) {
      onAdd({
        name,
        source: { name: sourceName || "Source", ip: sourceIp },
        destination: { name: destName || "Destination", ip: destIp },
        type,
        bandwidth: bandwidth || "100 Mbps",
      })
      setName("")
      setSourceName("")
      setSourceIp("")
      setDestName("")
      setDestIp("")
      setType("wan")
      setBandwidth("")
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-foreground mb-4">Add Network Link</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Link Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="e.g., Main Site to DRC"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Source Name</label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g., Main Site"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Source IP</label>
              <input
                type="text"
                value={sourceIp}
                onChange={(e) => setSourceIp(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g., 10.0.0.1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Destination Name</label>
              <input
                type="text"
                value={destName}
                onChange={(e) => setDestName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g., DRC Site"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Destination IP</label>
              <input
                type="text"
                value={destIp}
                onChange={(e) => setDestIp(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g., 10.1.0.1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as NetworkLink["type"])}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="wan">WAN</option>
                <option value="lan">LAN</option>
                <option value="vpn">VPN</option>
                <option value="mpls">MPLS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Bandwidth</label>
              <input
                type="text"
                value={bandwidth}
                onChange={(e) => setBandwidth(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g., 1 Gbps"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Add Link
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LinkStatus() {
  const [links, setLinks] = useState<NetworkLink[]>(mockLinks)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLinks((prev) =>
        prev.map((link) => ({
          ...link,
          latency: link.status !== "down" ? link.latency + (Math.random() - 0.5) * 5 : 0,
          jitter: link.status !== "down" ? Math.max(0, link.jitter + (Math.random() - 0.5) * 1) : 0,
          lastCheck: new Date(),
        }))
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setLinks((prev) =>
      prev.map((link) => ({
        ...link,
        lastCheck: new Date(),
      }))
    )
    setIsRefreshing(false)
  }

  const handleAddLink = (data: Partial<NetworkLink>) => {
    const newLink: NetworkLink = {
      id: `link-${Date.now()}`,
      name: data.name || "New Link",
      source: data.source || { name: "Source", ip: "0.0.0.0" },
      destination: data.destination || { name: "Destination", ip: "0.0.0.0" },
      type: data.type || "wan",
      bandwidth: data.bandwidth || "100 Mbps",
      status: "up",
      latency: 0,
      jitter: 0,
      packetLoss: 0,
      uptime: 100,
      lastCheck: new Date(),
      history: [],
    }
    setLinks((prev) => [...prev, newLink])
  }

  const handleDeleteLink = (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id))
  }

  // Stats
  const stats = {
    total: links.length,
    up: links.filter((l) => l.status === "up").length,
    degraded: links.filter((l) => l.status === "degraded").length,
    down: links.filter((l) => l.status === "down").length,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Link Status</h1>
          <p className="text-muted-foreground">Monitor network link health and connectivity</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Link
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Total Links</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-emerald-500" />
            <p className="text-sm text-muted-foreground">Up</p>
          </div>
          <p className="text-2xl font-bold text-emerald-500">{stats.up}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p className="text-sm text-muted-foreground">Degraded</p>
          </div>
          <p className="text-2xl font-bold text-amber-500">{stats.degraded}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-red-500" />
            <p className="text-sm text-muted-foreground">Down</p>
          </div>
          <p className="text-2xl font-bold text-red-500">{stats.down}</p>
        </div>
      </div>

      {/* Links Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {links.map((link) => {
          const StatusIcon = statusConfig[link.status].icon
          return (
            <div
              key={link.id}
              className={`rounded-lg border bg-card overflow-hidden ${statusConfig[link.status].border}`}
            >
              {/* Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusConfig[link.status].bg} ${statusConfig[link.status].color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig[link.status].label}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${typeConfig[link.type].color}`}>
                        {typeConfig[link.type].label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground truncate">{link.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span className="font-mono text-xs">{link.source.name}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-mono text-xs">{link.destination.name}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div className="p-4">
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Latency</p>
                    <p className={`text-lg font-semibold ${link.status === "down" ? "text-muted-foreground" : link.latency > 100 ? "text-red-500" : link.latency > 50 ? "text-amber-500" : "text-foreground"}`}>
                      {link.status === "down" ? "-" : `${link.latency.toFixed(1)}ms`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Jitter</p>
                    <p className={`text-lg font-semibold ${link.status === "down" ? "text-muted-foreground" : link.jitter > 10 ? "text-amber-500" : "text-foreground"}`}>
                      {link.status === "down" ? "-" : `${link.jitter.toFixed(1)}ms`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Packet Loss</p>
                    <p className={`text-lg font-semibold ${link.packetLoss > 5 ? "text-red-500" : link.packetLoss > 1 ? "text-amber-500" : "text-foreground"}`}>
                      {link.packetLoss.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Uptime</p>
                    <p className={`text-lg font-semibold ${link.uptime < 95 ? "text-red-500" : link.uptime < 99 ? "text-amber-500" : "text-emerald-500"}`}>
                      {link.uptime.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Mini Chart */}
                {link.history.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">24h Latency History</p>
                    <MiniChart history={link.history} />
                  </div>
                )}

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Bandwidth: {link.bandwidth}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {link.lastCheck.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <AddLinkModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddLink}
      />
    </div>
  )
}
