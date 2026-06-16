"use client"

import { useState, useEffect } from "react"
import {
  Play,
  Pause,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react"

interface Hop {
  hop: number
  host: string
  ip: string
  loss: number
  sent: number
  last: number
  avg: number
  best: number
  worst: number
  stDev: number
}

interface PathMonitorTarget {
  id: string
  name: string
  target: string
  description?: string
  isRunning: boolean
  hops: Hop[]
  lastUpdate?: Date
}

// Mock data - MTR style output
const mockHops: Hop[] = [
  { hop: 1, host: "gateway.local", ip: "192.168.1.1", loss: 0, sent: 100, last: 1.2, avg: 1.5, best: 0.8, worst: 3.2, stDev: 0.4 },
  { hop: 2, host: "isp-gw1.provider.net", ip: "10.0.1.1", loss: 0, sent: 100, last: 5.4, avg: 6.2, best: 4.1, worst: 12.3, stDev: 1.2 },
  { hop: 3, host: "core-rtr1.provider.net", ip: "10.0.2.1", loss: 0.5, sent: 100, last: 8.7, avg: 9.1, best: 7.2, worst: 15.8, stDev: 1.8 },
  { hop: 4, host: "edge-rtr1.provider.net", ip: "10.0.3.1", loss: 0, sent: 100, last: 12.3, avg: 13.5, best: 10.1, worst: 22.4, stDev: 2.3 },
  { hop: 5, host: "peer-gw.transit.net", ip: "203.0.113.1", loss: 2.0, sent: 100, last: 25.6, avg: 28.4, best: 20.2, worst: 45.8, stDev: 5.2 },
  { hop: 6, host: "core.drc-datacenter.net", ip: "10.1.0.1", loss: 0, sent: 100, last: 35.2, avg: 36.8, best: 30.5, worst: 52.3, stDev: 4.1 },
  { hop: 7, host: "drc-server.local", ip: "10.1.0.10", loss: 0, sent: 100, last: 38.5, avg: 40.2, best: 32.1, worst: 58.7, stDev: 5.8 },
]

const initialTargets: PathMonitorTarget[] = [
  {
    id: "1",
    name: "Main Site to DRC",
    target: "10.1.0.10",
    description: "Primary link monitoring to DRC datacenter",
    isRunning: true,
    hops: mockHops,
    lastUpdate: new Date(),
  },
  {
    id: "2",
    name: "Main Site to Cloud",
    target: "8.8.8.8",
    description: "Internet connectivity to Google DNS",
    isRunning: false,
    hops: [],
  },
]

function getLossColor(loss: number): string {
  if (loss === 0) return "text-emerald-500"
  if (loss < 1) return "text-amber-500"
  if (loss < 5) return "text-orange-500"
  return "text-red-500"
}

function getLatencyColor(latency: number): string {
  if (latency < 10) return "text-emerald-500"
  if (latency < 50) return "text-amber-500"
  if (latency < 100) return "text-orange-500"
  return "text-red-500"
}

function LatencyTrend({ current, avg }: { current: number; avg: number }) {
  const diff = current - avg
  const percentage = ((diff / avg) * 100).toFixed(1)
  
  if (Math.abs(diff) < 1) {
    return <Minus className="h-3 w-3 text-muted-foreground" />
  }
  
  if (diff > 0) {
    return (
      <span className="flex items-center text-red-500 text-xs">
        <TrendingUp className="h-3 w-3" />
        +{percentage}%
      </span>
    )
  }
  
  return (
    <span className="flex items-center text-emerald-500 text-xs">
      <TrendingDown className="h-3 w-3" />
      {percentage}%
    </span>
  )
}

interface AddTargetModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (target: { name: string; target: string; description?: string }) => void
}

function AddTargetModal({ isOpen, onClose, onAdd }: AddTargetModalProps) {
  const [name, setName] = useState("")
  const [target, setTarget] = useState("")
  const [description, setDescription] = useState("")

  const handleSubmit = () => {
    if (name && target) {
      onAdd({ name, target, description: description || undefined })
      setName("")
      setTarget("")
      setDescription("")
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-foreground mb-4">Add Path Monitor</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="e.g., Main Site to DRC"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Target (IP/Hostname)</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="e.g., 10.1.0.10 or drc-server.local"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="e.g., Primary link monitoring"
            />
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
              Add Monitor
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PathMonitor() {
  const [targets, setTargets] = useState<PathMonitorTarget[]>(initialTargets)
  const [selectedTarget, setSelectedTarget] = useState<string>(initialTargets[0].id)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTargets((prev) =>
        prev.map((t) => {
          if (t.isRunning && t.hops.length > 0) {
            return {
              ...t,
              hops: t.hops.map((hop) => ({
                ...hop,
                last: Math.max(0.5, hop.avg + (Math.random() - 0.5) * hop.stDev * 2),
                sent: hop.sent + 1,
                loss: Math.max(0, Math.min(100, hop.loss + (Math.random() - 0.5) * 0.5)),
              })),
              lastUpdate: new Date(),
            }
          }
          return t
        })
      )
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const currentTarget = targets.find((t) => t.id === selectedTarget)

  const toggleMonitor = (id: string) => {
    setTargets((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          if (!t.isRunning) {
            // Start monitoring - simulate MTR data
            return {
              ...t,
              isRunning: true,
              hops: mockHops.map((h) => ({ ...h, sent: 0 })),
              lastUpdate: new Date(),
            }
          }
          return { ...t, isRunning: false }
        }
        return t
      })
    )
  }

  const handleAddTarget = (data: { name: string; target: string; description?: string }) => {
    const newTarget: PathMonitorTarget = {
      id: `target-${Date.now()}`,
      name: data.name,
      target: data.target,
      description: data.description,
      isRunning: false,
      hops: [],
    }
    setTargets((prev) => [...prev, newTarget])
    setSelectedTarget(newTarget.id)
  }

  const handleDeleteTarget = (id: string) => {
    setTargets((prev) => prev.filter((t) => t.id !== id))
    if (selectedTarget === id && targets.length > 1) {
      setSelectedTarget(targets.find((t) => t.id !== id)?.id || "")
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Path Monitor</h1>
          <p className="text-muted-foreground">MTR-style hop-by-hop network path monitoring</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Monitor
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Target List */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-1">Monitors</h3>
          {targets.map((target) => (
            <div
              key={target.id}
              onClick={() => setSelectedTarget(target.id)}
              className={`
                p-3 rounded-lg border cursor-pointer transition-all
                ${selectedTarget === target.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
                }
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-foreground">{target.name}</span>
                <span className={`h-2 w-2 rounded-full ${target.isRunning ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
              </div>
              <p className="text-xs text-muted-foreground font-mono">{target.target}</p>
              {target.isRunning && target.hops.length > 0 && (
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">{target.hops.length} hops</span>
                  <span className={getLatencyColor(target.hops[target.hops.length - 1]?.avg || 0)}>
                    {target.hops[target.hops.length - 1]?.avg.toFixed(1)}ms
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Monitor Details */}
        <div className="lg:col-span-3">
          {currentTarget ? (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {/* Monitor Header */}
              <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-foreground">{currentTarget.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Target: <span className="font-mono">{currentTarget.target}</span>
                    {currentTarget.description && ` - ${currentTarget.description}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMonitor(currentTarget.id)}
                    className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
                      currentTarget.isRunning
                        ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                    }`}
                  >
                    {currentTarget.isRunning ? (
                      <>
                        <Pause className="h-4 w-4" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Start
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteTarget(currentTarget.id)}
                    className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* MTR Table */}
              {currentTarget.hops.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Host</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Loss%</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Snt</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Last</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Avg</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Best</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Wrst</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">StDev</th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {currentTarget.hops.map((hop) => (
                        <tr key={hop.hop} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-foreground font-medium">{hop.hop}</td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-foreground">{hop.host}</p>
                              <p className="text-xs text-muted-foreground font-mono">{hop.ip}</p>
                            </div>
                          </td>
                          <td className={`px-4 py-3 text-right font-mono ${getLossColor(hop.loss)}`}>
                            {hop.loss.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">{hop.sent}</td>
                          <td className={`px-4 py-3 text-right font-mono ${getLatencyColor(hop.last)}`}>
                            {hop.last.toFixed(1)}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono ${getLatencyColor(hop.avg)}`}>
                            {hop.avg.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-500">{hop.best.toFixed(1)}</td>
                          <td className="px-4 py-3 text-right font-mono text-red-500">{hop.worst.toFixed(1)}</td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">{hop.stDev.toFixed(1)}</td>
                          <td className="px-4 py-3 text-center">
                            <LatencyTrend current={hop.last} avg={hop.avg} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Click Start to begin monitoring</p>
                </div>
              )}

              {/* Footer */}
              {currentTarget.lastUpdate && currentTarget.isRunning && (
                <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Monitoring active
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last update: {currentTarget.lastUpdate.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Select or add a monitor to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
        <span className="font-medium">Latency:</span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {"< 10ms"}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          {"10-50ms"}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          {"50-100ms"}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          {"> 100ms"}
        </span>
      </div>

      <AddTargetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTarget}
      />
    </div>
  )
}
