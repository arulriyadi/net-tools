"use client"

import { useState } from "react"
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  MoreHorizontal,
  Globe,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react"

interface DnsRecord {
  id: string
  name: string
  type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SOA" | "PTR"
  value: string
  ttl: number
  zone: string
  status: "active" | "pending" | "error"
  lastModified: string
}

const mockRecords: DnsRecord[] = [
  {
    id: "1",
    name: "example.com",
    type: "A",
    value: "192.168.1.100",
    ttl: 3600,
    zone: "example.com",
    status: "active",
    lastModified: "2024-01-15 10:30",
  },
  {
    id: "2",
    name: "www.example.com",
    type: "CNAME",
    value: "example.com",
    ttl: 3600,
    zone: "example.com",
    status: "active",
    lastModified: "2024-01-15 10:30",
  },
  {
    id: "3",
    name: "mail.example.com",
    type: "MX",
    value: "mail.example.com (priority: 10)",
    ttl: 3600,
    zone: "example.com",
    status: "active",
    lastModified: "2024-01-14 15:45",
  },
  {
    id: "4",
    name: "api.example.com",
    type: "A",
    value: "192.168.1.101",
    ttl: 1800,
    zone: "example.com",
    status: "pending",
    lastModified: "2024-01-16 09:00",
  },
  {
    id: "5",
    name: "_dmarc.example.com",
    type: "TXT",
    value: "v=DMARC1; p=none; rua=mailto:dmarc@example.com",
    ttl: 3600,
    zone: "example.com",
    status: "active",
    lastModified: "2024-01-10 12:00",
  },
  {
    id: "6",
    name: "ns1.internal.local",
    type: "A",
    value: "10.0.0.1",
    ttl: 86400,
    zone: "internal.local",
    status: "active",
    lastModified: "2024-01-08 08:00",
  },
  {
    id: "7",
    name: "db.internal.local",
    type: "A",
    value: "10.0.0.50",
    ttl: 3600,
    zone: "internal.local",
    status: "error",
    lastModified: "2024-01-16 14:20",
  },
]

const recordTypeColors: Record<string, string> = {
  A: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  AAAA: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  CNAME: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  MX: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  TXT: "bg-green-500/10 text-green-500 border-green-500/20",
  NS: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  SOA: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  PTR: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
}

export function DnsRecordsManagement() {
  const [records, setRecords] = useState<DnsRecord[]>(mockRecords)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterZone, setFilterZone] = useState<string>("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<DnsRecord | null>(null)

  const zones = Array.from(new Set(records.map((r) => r.zone)))
  const recordTypes = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "PTR"]

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.value.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || record.type === filterType
    const matchesZone = filterZone === "all" || record.zone === filterZone
    return matchesSearch && matchesType && matchesZone
  })

  const handleDelete = (id: string) => {
    setRecords(records.filter((r) => r.id !== id))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "pending":
        return <div className="h-4 w-4 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">DNS Records</h1>
          <p className="text-sm text-muted-foreground">
            Manage DNS records across all zones
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Record
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-blue-500/10 p-2">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{records.length}</p>
              <p className="text-sm text-muted-foreground">Total Records</p>
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
                {records.filter((r) => r.status === "active").length}
              </p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-yellow-500/10 p-2">
              <Globe className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{zones.length}</p>
              <p className="text-sm text-muted-foreground">Zones</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-red-500/10 p-2">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {records.filter((r) => r.status === "error").length}
              </p>
              <p className="text-sm text-muted-foreground">Errors</p>
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
            placeholder="Search records..."
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
          {recordTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          value={filterZone}
          onChange={(e) => setFilterZone(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Zones</option>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </div>

      {/* Records Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  TTL
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Zone
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-foreground">
                      {record.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${
                        recordTypeColors[record.type]
                      }`}
                    >
                      {record.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-muted-foreground max-w-[200px] truncate block">
                      {record.value}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {record.ttl}s
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {record.zone}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(record.status)}
                      <span className="text-sm capitalize text-muted-foreground">
                        {record.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingRecord(record)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRecords.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-50" />
            <p>No records found</p>
          </div>
        )}
      </div>
    </div>
  )
}
