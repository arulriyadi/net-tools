"use client"

import { useState } from "react"
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Search,
  Server,
  Globe,
  Shield,
  Wifi,
  Users,
  Database,
} from "lucide-react"
import { formatNumber } from "@/lib/format"

interface IPPool {
  id: string
  name: string
  type: "nat" | "public" | "private" | "reserved" | "dhcp" | "vpn"
  startIP: string
  endIP: string
  site: string
  totalIPs: number
  usedIPs: number
  description: string
  status: "active" | "inactive" | "full"
}

const initialPools: IPPool[] = [
  {
    id: "1",
    name: "NAT Pool Primary",
    type: "nat",
    startIP: "192.168.100.1",
    endIP: "192.168.100.254",
    site: "DC-MAIN",
    totalIPs: 254,
    usedIPs: 200,
    description: "Primary NAT pool for outbound internet traffic",
    status: "active",
  },
  {
    id: "2",
    name: "NAT Pool Secondary",
    type: "nat",
    startIP: "192.168.101.1",
    endIP: "192.168.101.254",
    site: "DC-MAIN",
    totalIPs: 254,
    usedIPs: 50,
    description: "Secondary NAT pool for overflow",
    status: "active",
  },
  {
    id: "3",
    name: "Public IP Range",
    type: "public",
    startIP: "103.10.20.1",
    endIP: "103.10.20.30",
    site: "DC-MAIN",
    totalIPs: 30,
    usedIPs: 24,
    description: "Public IP addresses for external services",
    status: "active",
  },
  {
    id: "4",
    name: "DHCP Pool Office",
    type: "dhcp",
    startIP: "10.100.0.100",
    endIP: "10.100.3.254",
    site: "OFF-HQ",
    totalIPs: 922,
    usedIPs: 156,
    description: "DHCP pool for office workstations",
    status: "active",
  },
  {
    id: "5",
    name: "VPN Client Pool",
    type: "vpn",
    startIP: "10.200.0.1",
    endIP: "10.200.0.254",
    site: "DC-MAIN",
    totalIPs: 254,
    usedIPs: 89,
    description: "IP pool for VPN clients",
    status: "active",
  },
  {
    id: "6",
    name: "Reserved Infrastructure",
    type: "reserved",
    startIP: "10.10.255.1",
    endIP: "10.10.255.254",
    site: "DC-MAIN",
    totalIPs: 254,
    usedIPs: 0,
    description: "Reserved for future infrastructure expansion",
    status: "inactive",
  },
  {
    id: "7",
    name: "DRC NAT Pool",
    type: "nat",
    startIP: "192.168.200.1",
    endIP: "192.168.200.254",
    site: "DC-DRC",
    totalIPs: 254,
    usedIPs: 80,
    description: "NAT pool for DRC site",
    status: "active",
  },
  {
    id: "8",
    name: "Guest WiFi Pool",
    type: "dhcp",
    startIP: "10.100.10.1",
    endIP: "10.100.10.254",
    site: "OFF-HQ",
    totalIPs: 254,
    usedIPs: 45,
    description: "DHCP pool for guest wireless",
    status: "active",
  },
]

export function IPPoolsManagement() {
  const [pools, setPools] = useState<IPPool[]>(initialPools)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterType, setFilterType] = useState<string>("all")
  const [filterSite, setFilterSite] = useState<string>("all")

  const sites = [...new Set(pools.map((p) => p.site))]

  const filteredPools = pools.filter((pool) => {
    const matchesSearch =
      pool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pool.startIP.includes(searchTerm) ||
      pool.endIP.includes(searchTerm)
    const matchesType = filterType === "all" || pool.type === filterType
    const matchesSite = filterSite === "all" || pool.site === filterSite
    return matchesSearch && matchesType && matchesSite
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "nat":
        return Globe
      case "public":
        return Server
      case "private":
        return Database
      case "reserved":
        return Shield
      case "dhcp":
        return Wifi
      case "vpn":
        return Users
      default:
        return Layers
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "nat":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
      case "public":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      case "private":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "reserved":
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
      case "dhcp":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20"
      case "vpn":
        return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500"
      case "inactive":
        return "bg-zinc-500"
      case "full":
        return "bg-red-500"
      default:
        return "bg-zinc-500"
    }
  }

  const deletePool = (id: string) => {
    setPools(pools.filter((p) => p.id !== id))
  }

  const stats = {
    total: pools.length,
    totalIPs: pools.reduce((acc, p) => acc + p.totalIPs, 0),
    usedIPs: pools.reduce((acc, p) => acc + p.usedIPs, 0),
    active: pools.filter((p) => p.status === "active").length,
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Layers className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Pools</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <Server className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatNumber(stats.totalIPs)}</p>
              <p className="text-sm text-muted-foreground">Total IPs</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Globe className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {((stats.usedIPs / stats.totalIPs) * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Utilization</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Shield className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Active Pools</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search pools..."
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
            <option value="nat">NAT</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="reserved">Reserved</option>
            <option value="dhcp">DHCP</option>
            <option value="vpn">VPN</option>
          </select>
          <select
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Sites</option>
            {sites.map((site) => (
              <option key={site} value={site}>{site}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Pool
        </button>
      </div>

      {/* Pools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredPools.map((pool) => {
          const TypeIcon = getTypeIcon(pool.type)
          const utilization = (pool.usedIPs / pool.totalIPs) * 100
          return (
            <div
              key={pool.id}
              className="rounded-lg border border-border bg-card p-5 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${getTypeColor(pool.type)}`}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{pool.name}</h3>
                      <span className={`h-2 w-2 rounded-full ${getStatusColor(pool.status)}`} />
                    </div>
                    <p className="text-sm text-muted-foreground">{pool.site}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deletePool(pool.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Range</span>
                  <code className="font-mono text-foreground">
                    {pool.startIP} - {pool.endIP}
                  </code>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Usage</span>
                  <span className="font-medium text-foreground">
                    {pool.usedIPs} / {pool.totalIPs}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Utilization</span>
                  <span className={`font-medium ${
                    utilization > 90 ? "text-destructive" : utilization > 70 ? "text-amber-500" : "text-emerald-500"
                  }`}>
                    {utilization.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      utilization > 90
                        ? "bg-destructive"
                        : utilization > 70
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${utilization}%` }}
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-4">{pool.description}</p>

              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getTypeColor(pool.type)}`}>
                  {pool.type.toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground capitalize">{pool.status}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add IP Pool</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Pool Name</label>
                <input
                  type="text"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="NAT Pool Primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="nat">NAT</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="reserved">Reserved</option>
                    <option value="dhcp">DHCP</option>
                    <option value="vpn">VPN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Site</label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="DC-MAIN">DC-MAIN</option>
                    <option value="DC-DRC">DC-DRC</option>
                    <option value="OFF-HQ">OFF-HQ</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Start IP</label>
                  <input
                    type="text"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="192.168.100.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">End IP</label>
                  <input
                    type="text"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="192.168.100.254"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                <textarea
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Pool description..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Add Pool
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
