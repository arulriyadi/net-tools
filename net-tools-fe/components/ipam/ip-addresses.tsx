"use client"

import { useState } from "react"
import {
  Hash,
  Plus,
  Edit2,
  Trash2,
  Search,
  Download,
  Upload,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
} from "lucide-react"

interface IPAddress {
  id: string
  ip: string
  subnet: string
  hostname: string
  macAddress: string
  status: "used" | "available" | "reserved" | "dhcp" | "gateway"
  type: "static" | "dhcp" | "reserved"
  owner: string
  site: string
  description: string
  lastSeen: string
}

const initialIPs: IPAddress[] = [
  {
    id: "1",
    ip: "10.10.0.1",
    subnet: "10.10.0.0/24",
    hostname: "gw-main-01",
    macAddress: "00:1A:2B:3C:4D:01",
    status: "gateway",
    type: "static",
    owner: "Network Team",
    site: "DC-MAIN",
    description: "Primary gateway",
    lastSeen: "Online",
  },
  {
    id: "2",
    ip: "10.10.0.10",
    subnet: "10.10.0.0/24",
    hostname: "web-srv-01",
    macAddress: "00:1A:2B:3C:4D:10",
    status: "used",
    type: "static",
    owner: "Web Team",
    site: "DC-MAIN",
    description: "Production web server",
    lastSeen: "2 min ago",
  },
  {
    id: "3",
    ip: "10.10.0.11",
    subnet: "10.10.0.0/24",
    hostname: "web-srv-02",
    macAddress: "00:1A:2B:3C:4D:11",
    status: "used",
    type: "static",
    owner: "Web Team",
    site: "DC-MAIN",
    description: "Production web server",
    lastSeen: "5 min ago",
  },
  {
    id: "4",
    ip: "10.10.0.20",
    subnet: "10.10.0.0/24",
    hostname: "db-srv-01",
    macAddress: "00:1A:2B:3C:4D:20",
    status: "used",
    type: "static",
    owner: "Database Team",
    site: "DC-MAIN",
    description: "MySQL primary",
    lastSeen: "1 min ago",
  },
  {
    id: "5",
    ip: "10.10.0.21",
    subnet: "10.10.0.0/24",
    hostname: "db-srv-02",
    macAddress: "00:1A:2B:3C:4D:21",
    status: "used",
    type: "static",
    owner: "Database Team",
    site: "DC-MAIN",
    description: "MySQL replica",
    lastSeen: "1 min ago",
  },
  {
    id: "6",
    ip: "10.10.0.50",
    subnet: "10.10.0.0/24",
    hostname: "",
    macAddress: "",
    status: "reserved",
    type: "reserved",
    owner: "Infrastructure",
    site: "DC-MAIN",
    description: "Reserved for new load balancer",
    lastSeen: "-",
  },
  {
    id: "7",
    ip: "10.10.0.100",
    subnet: "10.10.0.0/24",
    hostname: "dhcp-client-01",
    macAddress: "00:1A:2B:3C:4D:64",
    status: "dhcp",
    type: "dhcp",
    owner: "DHCP Pool",
    site: "DC-MAIN",
    description: "DHCP assigned",
    lastSeen: "10 min ago",
  },
  {
    id: "8",
    ip: "10.10.0.101",
    subnet: "10.10.0.0/24",
    hostname: "",
    macAddress: "",
    status: "available",
    type: "static",
    owner: "",
    site: "DC-MAIN",
    description: "",
    lastSeen: "-",
  },
  {
    id: "9",
    ip: "10.20.0.10",
    subnet: "10.20.0.0/24",
    hostname: "drc-web-01",
    macAddress: "00:2A:2B:3C:4D:10",
    status: "used",
    type: "static",
    owner: "Web Team",
    site: "DC-DRC",
    description: "DRC web server",
    lastSeen: "3 min ago",
  },
  {
    id: "10",
    ip: "103.10.20.10",
    subnet: "103.10.20.0/27",
    hostname: "pub-web-01",
    macAddress: "00:3A:2B:3C:4D:10",
    status: "used",
    type: "static",
    owner: "Web Team",
    site: "DC-MAIN",
    description: "Public web server",
    lastSeen: "1 min ago",
  },
]

export function IPAddressesManagement() {
  const [ips, setIPs] = useState<IPAddress[]>(initialIPs)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterSite, setFilterSite] = useState<string>("all")
  const [selectedIPs, setSelectedIPs] = useState<Set<string>>(new Set())

  const sites = [...new Set(ips.map((ip) => ip.site))]

  const filteredIPs = ips.filter((ip) => {
    const matchesSearch =
      ip.ip.includes(searchTerm) ||
      ip.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ip.macAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ip.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || ip.status === filterStatus
    const matchesSite = filterSite === "all" || ip.site === filterSite
    return matchesSearch && matchesStatus && matchesSite
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "used":
        return CheckCircle2
      case "available":
        return AlertCircle
      case "reserved":
        return Clock
      case "dhcp":
        return Hash
      case "gateway":
        return Ban
      default:
        return AlertCircle
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "used":
        return "text-emerald-500 bg-emerald-500/10"
      case "available":
        return "text-blue-500 bg-blue-500/10"
      case "reserved":
        return "text-amber-500 bg-amber-500/10"
      case "dhcp":
        return "text-purple-500 bg-purple-500/10"
      case "gateway":
        return "text-red-500 bg-red-500/10"
      default:
        return "text-muted-foreground bg-muted"
    }
  }

  const toggleSelectIP = (id: string) => {
    const newSelected = new Set(selectedIPs)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIPs(newSelected)
  }

  const selectAll = () => {
    if (selectedIPs.size === filteredIPs.length) {
      setSelectedIPs(new Set())
    } else {
      setSelectedIPs(new Set(filteredIPs.map((ip) => ip.id)))
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const deleteIP = (id: string) => {
    setIPs(ips.filter((ip) => ip.id !== id))
    selectedIPs.delete(id)
    setSelectedIPs(new Set(selectedIPs))
  }

  const stats = {
    total: ips.length,
    used: ips.filter((ip) => ip.status === "used").length,
    available: ips.filter((ip) => ip.status === "available").length,
    reserved: ips.filter((ip) => ip.status === "reserved").length,
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Hash className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total IPs</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.used}</p>
              <p className="text-sm text-muted-foreground">In Use</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.available}</p>
              <p className="text-sm text-muted-foreground">Available</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.reserved}</p>
              <p className="text-sm text-muted-foreground">Reserved</p>
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
              placeholder="Search IP, hostname, MAC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="used">Used</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="dhcp">DHCP</option>
            <option value="gateway">Gateway</option>
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
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add IP
          </button>
        </div>
      </div>

      {/* Selected Actions */}
      {selectedIPs.size > 0 && (
        <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/50 p-3">
          <span className="text-sm font-medium text-foreground">
            {selectedIPs.size} selected
          </span>
          <button className="text-sm text-primary hover:underline">Reserve</button>
          <button className="text-sm text-primary hover:underline">Release</button>
          <button className="text-sm text-destructive hover:underline">Delete</button>
        </div>
      )}

      {/* IP Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIPs.size === filteredIPs.length && filteredIPs.length > 0}
                    onChange={selectAll}
                    className="rounded border-input"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Hostname
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  MAC Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Site
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Last Seen
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredIPs.map((ip) => {
                const StatusIcon = getStatusIcon(ip.status)
                return (
                  <tr key={ip.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIPs.has(ip.id)}
                        onChange={() => toggleSelectIP(ip.id)}
                        className="rounded border-input"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 text-sm font-mono text-foreground">
                          {ip.ip}
                        </code>
                        <button
                          onClick={() => copyToClipboard(ip.ip)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{ip.subnet}</p>
                    </td>
                    <td className="px-4 py-3">
                      {ip.hostname ? (
                        <span className="font-medium text-foreground">{ip.hostname}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {ip.macAddress ? (
                        <code className="text-xs font-mono text-muted-foreground">{ip.macAddress}</code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(ip.status)}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        <span className="capitalize">{ip.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground">{ip.site}</span>
                    </td>
                    <td className="px-4 py-3">
                      {ip.owner ? (
                        <span className="text-sm text-foreground">{ip.owner}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${ip.lastSeen === "Online" ? "text-emerald-500" : "text-muted-foreground"}`}>
                        {ip.lastSeen}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteIP(ip.id)}
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add IP Address</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">IP Address</label>
                  <input
                    type="text"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="10.10.0.100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Subnet</label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option>10.10.0.0/24</option>
                    <option>10.10.1.0/24</option>
                    <option>10.20.0.0/24</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Hostname</label>
                  <input
                    type="text"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="server-01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">MAC Address</label>
                  <input
                    type="text"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="00:1A:2B:3C:4D:5E"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="available">Available</option>
                    <option value="used">Used</option>
                    <option value="reserved">Reserved</option>
                    <option value="dhcp">DHCP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Owner</label>
                  <input
                    type="text"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Team/Person"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                <textarea
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Description..."
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
                Add IP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
