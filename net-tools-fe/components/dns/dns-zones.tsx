"use client"

import { useState } from "react"
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Globe,
  Server,
  CheckCircle,
  AlertCircle,
  Settings,
  RefreshCw,
} from "lucide-react"

interface DnsZone {
  id: string
  name: string
  type: "primary" | "secondary" | "forward"
  status: "active" | "inactive" | "syncing"
  recordCount: number
  primaryNs: string
  serial: number
  lastSync: string
  ttl: number
}

const mockZones: DnsZone[] = [
  {
    id: "1",
    name: "example.com",
    type: "primary",
    status: "active",
    recordCount: 15,
    primaryNs: "ns1.example.com",
    serial: 2024011501,
    lastSync: "2024-01-15 10:30",
    ttl: 86400,
  },
  {
    id: "2",
    name: "internal.local",
    type: "primary",
    status: "active",
    recordCount: 8,
    primaryNs: "ns1.internal.local",
    serial: 2024011601,
    lastSync: "2024-01-16 08:00",
    ttl: 3600,
  },
  {
    id: "3",
    name: "dev.example.com",
    type: "secondary",
    status: "syncing",
    recordCount: 5,
    primaryNs: "ns1.example.com",
    serial: 2024011401,
    lastSync: "2024-01-14 15:45",
    ttl: 3600,
  },
  {
    id: "4",
    name: "staging.example.com",
    type: "forward",
    status: "active",
    recordCount: 3,
    primaryNs: "8.8.8.8",
    serial: 2024011001,
    lastSync: "2024-01-10 12:00",
    ttl: 7200,
  },
  {
    id: "5",
    name: "legacy.local",
    type: "primary",
    status: "inactive",
    recordCount: 12,
    primaryNs: "ns1.legacy.local",
    serial: 2023120101,
    lastSync: "2023-12-01 09:00",
    ttl: 86400,
  },
]

export function DnsZonesManagement() {
  const [zones, setZones] = useState<DnsZone[]>(mockZones)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [selectedZone, setSelectedZone] = useState<DnsZone | null>(null)

  const filteredZones = zones.filter((zone) => {
    const matchesSearch = zone.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || zone.type === filterType
    return matchesSearch && matchesType
  })

  const handleDelete = (id: string) => {
    setZones(zones.filter((z) => z.id !== id))
  }

  const handleSync = (id: string) => {
    setZones(
      zones.map((z) =>
        z.id === id ? { ...z, status: "syncing" as const } : z
      )
    )
    setTimeout(() => {
      setZones(
        zones.map((z) =>
          z.id === id
            ? { ...z, status: "active" as const, lastSync: new Date().toLocaleString() }
            : z
        )
      )
    }, 2000)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500">
            <CheckCircle className="h-3 w-3" />
            Active
          </span>
        )
      case "inactive":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-medium text-gray-500">
            <AlertCircle className="h-3 w-3" />
            Inactive
          </span>
        )
      case "syncing":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-500">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Syncing
          </span>
        )
      default:
        return null
    }
  }

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      primary: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      secondary: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      forward: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    }
    return (
      <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${colors[type]}`}>
        {type}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">DNS Zones</h1>
          <p className="text-sm text-muted-foreground">
            Manage DNS zones and their configurations
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          Add Zone
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-blue-500/10 p-2">
              <Globe className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{zones.length}</p>
              <p className="text-sm text-muted-foreground">Total Zones</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-green-500/10 p-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {zones.filter((z) => z.status === "active").length}
              </p>
              <p className="text-sm text-muted-foreground">Active Zones</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-purple-500/10 p-2">
              <Server className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {zones.filter((z) => z.type === "primary").length}
              </p>
              <p className="text-sm text-muted-foreground">Primary Zones</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-orange-500/10 p-2">
              <RefreshCw className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {zones.reduce((acc, z) => acc + z.recordCount, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Records</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search zones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Types</option>
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="forward">Forward</option>
        </select>
      </div>

      {/* Zones Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredZones.map((zone) => (
          <div
            key={zone.id}
            className="rounded-lg border border-border bg-card p-5 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{zone.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Serial: {zone.serial}
                  </p>
                </div>
              </div>
              {getStatusBadge(zone.status)}
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                {getTypeBadge(zone.type)}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Records</span>
                <span className="font-medium text-foreground">{zone.recordCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Primary NS</span>
                <span className="font-mono text-xs text-foreground">{zone.primaryNs}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">TTL</span>
                <span className="text-foreground">{zone.ttl}s</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Sync</span>
                <span className="text-foreground">{zone.lastSync}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-border">
              <button
                onClick={() => handleSync(zone.id)}
                disabled={zone.status === "syncing"}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${zone.status === "syncing" ? "animate-spin" : ""}`} />
                Sync
              </button>
              <button className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                <Settings className="h-4 w-4" />
              </button>
              <button className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(zone.id)}
                className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredZones.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground rounded-lg border border-border bg-card">
          <Globe className="h-12 w-12 mb-4 opacity-50" />
          <p>No zones found</p>
        </div>
      )}
    </div>
  )
}
