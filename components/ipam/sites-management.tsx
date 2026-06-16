"use client"

import { useState } from "react"
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Server,
  Network,
  MoreVertical,
  Search,
  Globe,
} from "lucide-react"
import { formatNumber } from "@/lib/format"

interface Site {
  id: string
  name: string
  code: string
  location: string
  type: "datacenter" | "office" | "colo" | "cloud"
  status: "active" | "inactive" | "maintenance"
  totalSubnets: number
  totalIPs: number
  usedIPs: number
  vlans: number
  description: string
}

const initialSites: Site[] = [
  {
    id: "1",
    name: "Main Datacenter",
    code: "DC-MAIN",
    location: "Jakarta, Indonesia",
    type: "datacenter",
    status: "active",
    totalSubnets: 24,
    totalIPs: 4096,
    usedIPs: 2847,
    vlans: 45,
    description: "Primary production datacenter",
  },
  {
    id: "2",
    name: "DRC Site",
    code: "DC-DRC",
    location: "Surabaya, Indonesia",
    type: "datacenter",
    status: "active",
    totalSubnets: 18,
    totalIPs: 2048,
    usedIPs: 1024,
    vlans: 32,
    description: "Disaster Recovery Center",
  },
  {
    id: "3",
    name: "AWS Singapore",
    code: "AWS-SG",
    location: "Singapore",
    type: "cloud",
    status: "active",
    totalSubnets: 8,
    totalIPs: 512,
    usedIPs: 256,
    vlans: 8,
    description: "AWS VPC Singapore Region",
  },
  {
    id: "4",
    name: "Head Office",
    code: "OFF-HQ",
    location: "Jakarta, Indonesia",
    type: "office",
    status: "active",
    totalSubnets: 4,
    totalIPs: 256,
    usedIPs: 180,
    vlans: 6,
    description: "Corporate headquarters",
  },
]

export function SitesManagement() {
  const [sites, setSites] = useState<Site[]>(initialSites)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [filterType, setFilterType] = useState<string>("all")

  const filteredSites = sites.filter((site) => {
    const matchesSearch =
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || site.type === filterType
    return matchesSearch && matchesType
  })

  const getTypeColor = (type: string) => {
    switch (type) {
      case "datacenter":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "office":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "colo":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20"
      case "cloud":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
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
      case "maintenance":
        return "bg-amber-500"
      default:
        return "bg-zinc-500"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "datacenter":
        return Server
      case "office":
        return Building2
      case "colo":
        return Network
      case "cloud":
        return Globe
      default:
        return Building2
    }
  }

  const totalStats = {
    sites: sites.length,
    subnets: sites.reduce((acc, s) => acc + s.totalSubnets, 0),
    ips: sites.reduce((acc, s) => acc + s.totalIPs, 0),
    used: sites.reduce((acc, s) => acc + s.usedIPs, 0),
  }

  const deleteSite = (id: string) => {
    setSites(sites.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Building2 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalStats.sites}</p>
              <p className="text-sm text-muted-foreground">Total Sites</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Network className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalStats.subnets}</p>
              <p className="text-sm text-muted-foreground">Total Subnets</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <MapPin className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatNumber(totalStats.ips)}</p>
              <p className="text-sm text-muted-foreground">Total IPs</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Server className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {((totalStats.used / totalStats.ips) * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">IP Utilization</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sites..."
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
            <option value="datacenter">Datacenter</option>
            <option value="office">Office</option>
            <option value="colo">Colocation</option>
            <option value="cloud">Cloud</option>
          </select>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Site
        </button>
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredSites.map((site) => {
          const TypeIcon = getTypeIcon(site.type)
          const utilizationPercent = (site.usedIPs / site.totalIPs) * 100
          return (
            <div
              key={site.id}
              className="rounded-lg border border-border bg-card p-5 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${getTypeColor(site.type)}`}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{site.name}</h3>
                      <span className={`h-2 w-2 rounded-full ${getStatusColor(site.status)}`} />
                    </div>
                    <p className="text-sm text-muted-foreground">{site.code}</p>
                  </div>
                </div>
                <div className="relative group">
                  <button className="rounded-md p-1 hover:bg-accent">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 hidden group-hover:block w-32 rounded-md border border-border bg-popover p-1 shadow-lg z-10">
                    <button
                      onClick={() => setEditingSite(site)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteSite(site.id)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <MapPin className="h-4 w-4" />
                <span>{site.location}</span>
              </div>

              <p className="text-sm text-muted-foreground mb-4">{site.description}</p>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IP Usage</span>
                  <span className="font-medium text-foreground">
                    {formatNumber(site.usedIPs)} / {formatNumber(site.totalIPs)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      utilizationPercent > 90
                        ? "bg-destructive"
                        : utilizationPercent > 70
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${utilizationPercent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">{site.totalSubnets}</p>
                  <p className="text-xs text-muted-foreground">Subnets</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">{site.vlans}</p>
                  <p className="text-xs text-muted-foreground">VLANs</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">
                    {utilizationPercent.toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Used</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getTypeColor(site.type)}`}>
                  {site.type.charAt(0).toUpperCase() + site.type.slice(1)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingSite) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 mx-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {editingSite ? "Edit Site" : "Add New Site"}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Site Name
                  </label>
                  <input
                    type="text"
                    defaultValue={editingSite?.name || ""}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Main Datacenter"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Site Code
                  </label>
                  <input
                    type="text"
                    defaultValue={editingSite?.code || ""}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="DC-MAIN"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  defaultValue={editingSite?.location || ""}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Jakarta, Indonesia"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
                  <select
                    defaultValue={editingSite?.type || "datacenter"}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="datacenter">Datacenter</option>
                    <option value="office">Office</option>
                    <option value="colo">Colocation</option>
                    <option value="cloud">Cloud</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
                  <select
                    defaultValue={editingSite?.status || "active"}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Description
                </label>
                <textarea
                  defaultValue={editingSite?.description || ""}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Site description..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingSite(null)
                }}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingSite(null)
                }}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {editingSite ? "Save Changes" : "Add Site"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
