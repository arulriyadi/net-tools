"use client"

import { useState } from "react"
import {
  Network,
  Plus,
  Edit2,
  Trash2,
  Search,
  Server,
  Database,
  Wifi,
  Shield,
  Monitor,
  Phone,
  Printer,
} from "lucide-react"
import { formatNumber } from "@/lib/format"

interface VLAN {
  id: string
  vlanId: number
  name: string
  site: string
  subnet: string
  gateway: string
  description: string
  type: "servers" | "management" | "users" | "voice" | "security" | "printers" | "guest" | "iot"
  status: "active" | "inactive" | "reserved"
  devices: number
}

const initialVLANs: VLAN[] = [
  {
    id: "1",
    vlanId: 10,
    name: "DMZ",
    site: "DC-MAIN",
    subnet: "172.16.0.0/24",
    gateway: "172.16.0.1",
    description: "Demilitarized zone for public-facing services",
    type: "security",
    status: "active",
    devices: 12,
  },
  {
    id: "2",
    vlanId: 100,
    name: "Server Farm A",
    site: "DC-MAIN",
    subnet: "10.10.0.0/24",
    gateway: "10.10.0.1",
    description: "Production servers",
    type: "servers",
    status: "active",
    devices: 187,
  },
  {
    id: "3",
    vlanId: 101,
    name: "Server Farm B",
    site: "DC-MAIN",
    subnet: "10.10.1.0/24",
    gateway: "10.10.1.1",
    description: "Development servers",
    type: "servers",
    status: "active",
    devices: 142,
  },
  {
    id: "4",
    vlanId: 200,
    name: "Office Users",
    site: "OFF-HQ",
    subnet: "10.100.0.0/22",
    gateway: "10.100.0.1",
    description: "Employee workstations",
    type: "users",
    status: "active",
    devices: 320,
  },
  {
    id: "5",
    vlanId: 300,
    name: "Voice",
    site: "OFF-HQ",
    subnet: "10.100.8.0/24",
    gateway: "10.100.8.1",
    description: "VoIP phones",
    type: "voice",
    status: "active",
    devices: 150,
  },
  {
    id: "6",
    vlanId: 400,
    name: "Printers",
    site: "OFF-HQ",
    subnet: "10.100.9.0/24",
    gateway: "10.100.9.1",
    description: "Network printers and MFPs",
    type: "printers",
    status: "active",
    devices: 45,
  },
  {
    id: "7",
    vlanId: 500,
    name: "Guest WiFi",
    site: "OFF-HQ",
    subnet: "10.100.10.0/24",
    gateway: "10.100.10.1",
    description: "Guest wireless network",
    type: "guest",
    status: "active",
    devices: 78,
  },
  {
    id: "8",
    vlanId: 999,
    name: "Management",
    site: "DC-MAIN",
    subnet: "10.10.10.0/28",
    gateway: "10.10.10.1",
    description: "Network device management",
    type: "management",
    status: "active",
    devices: 24,
  },
  {
    id: "9",
    vlanId: 100,
    name: "DRC Servers",
    site: "DC-DRC",
    subnet: "10.20.0.0/24",
    gateway: "10.20.0.1",
    description: "DRC production servers",
    type: "servers",
    status: "active",
    devices: 89,
  },
  {
    id: "10",
    vlanId: 600,
    name: "IoT Devices",
    site: "OFF-HQ",
    subnet: "10.100.12.0/24",
    gateway: "10.100.12.1",
    description: "IoT and smart devices",
    type: "iot",
    status: "active",
    devices: 65,
  },
]

export function VLANsManagement() {
  const [vlans, setVLANs] = useState<VLAN[]>(initialVLANs)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterType, setFilterType] = useState<string>("all")
  const [filterSite, setFilterSite] = useState<string>("all")

  const sites = [...new Set(vlans.map((v) => v.site))]

  const filteredVLANs = vlans.filter((vlan) => {
    const matchesSearch =
      vlan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vlan.vlanId.toString().includes(searchTerm) ||
      vlan.subnet.includes(searchTerm)
    const matchesType = filterType === "all" || vlan.type === filterType
    const matchesSite = filterSite === "all" || vlan.site === filterSite
    return matchesSearch && matchesType && matchesSite
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "servers":
        return Server
      case "management":
        return Database
      case "users":
        return Monitor
      case "voice":
        return Phone
      case "security":
        return Shield
      case "printers":
        return Printer
      case "guest":
        return Wifi
      case "iot":
        return Network
      default:
        return Network
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "servers":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "management":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20"
      case "users":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      case "voice":
        return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20"
      case "security":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "printers":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20"
      case "guest":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
      case "iot":
        return "bg-pink-500/10 text-pink-500 border-pink-500/20"
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
      case "reserved":
        return "bg-amber-500"
      default:
        return "bg-zinc-500"
    }
  }

  const deleteVLAN = (id: string) => {
    setVLANs(vlans.filter((v) => v.id !== id))
  }

  const stats = {
    total: vlans.length,
    active: vlans.filter((v) => v.status === "active").length,
    devices: vlans.reduce((acc, v) => acc + v.devices, 0),
  }

  // Group by site
  const groupedVLANs = filteredVLANs.reduce((acc, vlan) => {
    if (!acc[vlan.site]) {
      acc[vlan.site] = []
    }
    acc[vlan.site].push(vlan)
    return acc
  }, {} as Record<string, VLAN[]>)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Network className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total VLANs</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <Server className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Monitor className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatNumber(stats.devices)}</p>
              <p className="text-sm text-muted-foreground">Total Devices</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Database className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{sites.length}</p>
              <p className="text-sm text-muted-foreground">Sites</p>
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
              placeholder="Search VLANs..."
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
            <option value="servers">Servers</option>
            <option value="management">Management</option>
            <option value="users">Users</option>
            <option value="voice">Voice</option>
            <option value="security">Security</option>
            <option value="printers">Printers</option>
            <option value="guest">Guest</option>
            <option value="iot">IoT</option>
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
          Add VLAN
        </button>
      </div>

      {/* VLANs Table by Site */}
      {Object.entries(groupedVLANs).map(([site, siteVLANs]) => (
        <div key={site} className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground">{site}</h3>
            <p className="text-sm text-muted-foreground">{siteVLANs.length} VLANs</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    VLAN ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Subnet
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Gateway
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Devices
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {siteVLANs
                  .sort((a, b) => a.vlanId - b.vlanId)
                  .map((vlan) => {
                    const TypeIcon = getTypeIcon(vlan.type)
                    return (
                      <tr key={vlan.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <code className="rounded bg-muted px-2 py-1 text-sm font-mono font-bold text-foreground">
                            {vlan.vlanId}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-foreground">{vlan.name}</p>
                            <p className="text-xs text-muted-foreground">{vlan.description}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${getTypeColor(vlan.type)}`}>
                            <TypeIcon className="h-3.5 w-3.5" />
                            <span className="capitalize">{vlan.type}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-sm font-mono text-muted-foreground">{vlan.subnet}</code>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-sm font-mono text-muted-foreground">{vlan.gateway}</code>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground">{vlan.devices}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${getStatusColor(vlan.status)}`} />
                            <span className="text-sm text-foreground capitalize">{vlan.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteVLAN(vlan.id)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add VLAN</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">VLAN ID</label>
                  <input
                    type="number"
                    min={1}
                    max={4094}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
                  <input
                    type="text"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Server Farm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Site</label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="DC-MAIN">DC-MAIN</option>
                    <option value="DC-DRC">DC-DRC</option>
                    <option value="OFF-HQ">OFF-HQ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="servers">Servers</option>
                    <option value="management">Management</option>
                    <option value="users">Users</option>
                    <option value="voice">Voice</option>
                    <option value="security">Security</option>
                    <option value="printers">Printers</option>
                    <option value="guest">Guest</option>
                    <option value="iot">IoT</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Subnet</label>
                  <input
                    type="text"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="10.10.0.0/24"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Gateway</label>
                  <input
                    type="text"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="10.10.0.1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                <textarea
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="VLAN description..."
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
                Add VLAN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
