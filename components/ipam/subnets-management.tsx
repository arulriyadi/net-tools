"use client"

import { useState } from "react"
import {
  GitBranch,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  ChevronRight,
  Network,
  Building2,
} from "lucide-react"
import { formatNumber } from "@/lib/format"

interface Subnet {
  id: string
  network: string
  cidr: number
  name: string
  site: string
  siteCode: string
  vlan: number | null
  gateway: string
  type: "infrastructure" | "servers" | "management" | "nat" | "public" | "dmz" | "guest"
  status: "active" | "reserved" | "deprecated"
  totalHosts: number
  usedHosts: number
  description: string
}

const initialSubnets: Subnet[] = [
  {
    id: "1",
    network: "10.10.0.0",
    cidr: 24,
    name: "Server Farm A",
    site: "Main Datacenter",
    siteCode: "DC-MAIN",
    vlan: 100,
    gateway: "10.10.0.1",
    type: "servers",
    status: "active",
    totalHosts: 254,
    usedHosts: 187,
    description: "Production servers subnet",
  },
  {
    id: "2",
    network: "10.10.1.0",
    cidr: 24,
    name: "Server Farm B",
    site: "Main Datacenter",
    siteCode: "DC-MAIN",
    vlan: 101,
    gateway: "10.10.1.1",
    type: "servers",
    status: "active",
    totalHosts: 254,
    usedHosts: 142,
    description: "Development servers subnet",
  },
  {
    id: "3",
    network: "10.10.10.0",
    cidr: 28,
    name: "Management Network",
    site: "Main Datacenter",
    siteCode: "DC-MAIN",
    vlan: 999,
    gateway: "10.10.10.1",
    type: "management",
    status: "active",
    totalHosts: 14,
    usedHosts: 8,
    description: "Network device management",
  },
  {
    id: "4",
    network: "192.168.100.0",
    cidr: 24,
    name: "NAT Pool Primary",
    site: "Main Datacenter",
    siteCode: "DC-MAIN",
    vlan: null,
    gateway: "192.168.100.1",
    type: "nat",
    status: "active",
    totalHosts: 254,
    usedHosts: 200,
    description: "Primary NAT pool for outbound traffic",
  },
  {
    id: "5",
    network: "103.10.20.0",
    cidr: 27,
    name: "Public Range",
    site: "Main Datacenter",
    siteCode: "DC-MAIN",
    vlan: 50,
    gateway: "103.10.20.1",
    type: "public",
    status: "active",
    totalHosts: 30,
    usedHosts: 24,
    description: "Public IP addresses",
  },
  {
    id: "6",
    network: "10.20.0.0",
    cidr: 24,
    name: "DRC Servers",
    site: "DRC Site",
    siteCode: "DC-DRC",
    vlan: 100,
    gateway: "10.20.0.1",
    type: "servers",
    status: "active",
    totalHosts: 254,
    usedHosts: 89,
    description: "DRC production servers",
  },
  {
    id: "7",
    network: "172.16.0.0",
    cidr: 24,
    name: "DMZ Network",
    site: "Main Datacenter",
    siteCode: "DC-MAIN",
    vlan: 10,
    gateway: "172.16.0.1",
    type: "dmz",
    status: "active",
    totalHosts: 254,
    usedHosts: 45,
    description: "Demilitarized zone for public-facing services",
  },
  {
    id: "8",
    network: "10.100.0.0",
    cidr: 22,
    name: "Guest WiFi",
    site: "Head Office",
    siteCode: "OFF-HQ",
    vlan: 500,
    gateway: "10.100.0.1",
    type: "guest",
    status: "active",
    totalHosts: 1022,
    usedHosts: 156,
    description: "Guest wireless network",
  },
]

export function SubnetsManagement() {
  const [subnets, setSubnets] = useState<Subnet[]>(initialSubnets)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterSite, setFilterSite] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set(["DC-MAIN"]))

  const sites = [...new Set(subnets.map((s) => s.siteCode))]

  const getTypeColor = (type: string) => {
    switch (type) {
      case "servers":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "infrastructure":
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
      case "management":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20"
      case "nat":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
      case "public":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      case "dmz":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "guest":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500"
      case "reserved":
        return "bg-amber-500"
      case "deprecated":
        return "bg-zinc-500"
      default:
        return "bg-zinc-500"
    }
  }

  const toggleSiteExpand = (siteCode: string) => {
    const newExpanded = new Set(expandedSites)
    if (newExpanded.has(siteCode)) {
      newExpanded.delete(siteCode)
    } else {
      newExpanded.add(siteCode)
    }
    setExpandedSites(newExpanded)
  }

  const filteredSubnets = subnets.filter((subnet) => {
    const matchesSearch =
      subnet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subnet.network.includes(searchTerm) ||
      subnet.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSite = filterSite === "all" || subnet.siteCode === filterSite
    const matchesType = filterType === "all" || subnet.type === filterType
    return matchesSearch && matchesSite && matchesType
  })

  const groupedSubnets = filteredSubnets.reduce((acc, subnet) => {
    if (!acc[subnet.siteCode]) {
      acc[subnet.siteCode] = {
        site: subnet.site,
        subnets: [],
      }
    }
    acc[subnet.siteCode].subnets.push(subnet)
    return acc
  }, {} as Record<string, { site: string; subnets: Subnet[] }>)

  const deleteSubnet = (id: string) => {
    setSubnets(subnets.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <GitBranch className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{subnets.length}</p>
              <p className="text-sm text-muted-foreground">Total Subnets</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <Network className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {formatNumber(subnets.reduce((acc, s) => acc + s.totalHosts, 0))}
              </p>
              <p className="text-sm text-muted-foreground">Total Hosts</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Building2 className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{sites.length}</p>
              <p className="text-sm text-muted-foreground">Sites</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Filter className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {((subnets.reduce((acc, s) => acc + s.usedHosts, 0) / subnets.reduce((acc, s) => acc + s.totalHosts, 0)) * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Utilization</p>
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
              placeholder="Search subnets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
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
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Types</option>
            <option value="servers">Servers</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="management">Management</option>
            <option value="nat">NAT</option>
            <option value="public">Public</option>
            <option value="dmz">DMZ</option>
            <option value="guest">Guest</option>
          </select>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Subnet
        </button>
      </div>

      {/* Subnets Grouped by Site */}
      <div className="space-y-4">
        {Object.entries(groupedSubnets).map(([siteCode, { site, subnets: siteSubnets }]) => (
          <div key={siteCode} className="rounded-lg border border-border bg-card overflow-hidden">
            <button
              onClick={() => toggleSiteExpand(siteCode)}
              className="flex w-full items-center justify-between p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ChevronRight
                  className={`h-5 w-5 text-muted-foreground transition-transform ${
                    expandedSites.has(siteCode) ? "rotate-90" : ""
                  }`}
                />
                <Building2 className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <h3 className="font-semibold text-foreground">{site}</h3>
                  <p className="text-sm text-muted-foreground">{siteCode}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{siteSubnets.length} subnets</span>
                <span>
                  {formatNumber(siteSubnets.reduce((acc, s) => acc + s.usedHosts, 0))} /{" "}
                  {formatNumber(siteSubnets.reduce((acc, s) => acc + s.totalHosts, 0))} hosts
                </span>
              </div>
            </button>

            {expandedSites.has(siteCode) && (
              <div className="border-t border-border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                          Network
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                          VLAN
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                          Gateway
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                          Utilization
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
                      {siteSubnets.map((subnet) => {
                        const utilization = (subnet.usedHosts / subnet.totalHosts) * 100
                        return (
                          <tr key={subnet.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <code className="rounded bg-muted px-2 py-1 text-sm font-mono text-foreground">
                                {subnet.network}/{subnet.cidr}
                              </code>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-foreground">{subnet.name}</p>
                                <p className="text-xs text-muted-foreground">{subnet.description}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getTypeColor(subnet.type)}`}>
                                {subnet.type.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground">
                              {subnet.vlan !== null ? (
                                <span className="font-mono">{subnet.vlan}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <code className="text-sm font-mono text-muted-foreground">{subnet.gateway}</code>
                            </td>
                            <td className="px-4 py-3">
                              <div className="w-32">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-muted-foreground">
                                    {subnet.usedHosts}/{subnet.totalHosts}
                                  </span>
                                  <span className="font-medium text-foreground">{utilization.toFixed(0)}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
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
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${getStatusColor(subnet.status)}`} />
                                <span className="text-sm text-foreground capitalize">{subnet.status}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
                                <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => deleteSubnet(subnet.id)}
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
            )}
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add New Subnet</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1.5">Network</label>
                  <input
                    type="text"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="10.10.0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">CIDR</label>
                  <input
                    type="number"
                    min={8}
                    max={30}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="24"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Subnet Name</label>
                <input
                  type="text"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Server Farm A"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Site</label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="DC-MAIN">DC-MAIN - Main Datacenter</option>
                    <option value="DC-DRC">DC-DRC - DRC Site</option>
                    <option value="AWS-SG">AWS-SG - AWS Singapore</option>
                    <option value="OFF-HQ">OFF-HQ - Head Office</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="servers">Servers</option>
                    <option value="infrastructure">Infrastructure</option>
                    <option value="management">Management</option>
                    <option value="nat">NAT</option>
                    <option value="public">Public</option>
                    <option value="dmz">DMZ</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Gateway</label>
                  <input
                    type="text"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="10.10.0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">VLAN (optional)</label>
                  <input
                    type="number"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                <textarea
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Subnet description..."
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
                Add Subnet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
