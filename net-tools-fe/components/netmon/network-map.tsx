"use client"

import { useState, useCallback, useMemo } from "react"
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  BackgroundVariant,
  NodeProps,
  Handle,
  Position,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  Router,
  Server,
  Building2,
  Wifi,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react"

// Node Types
type NodeType = "router" | "server" | "site" | "switch"

interface DeviceData {
  label: string
  type: NodeType
  ip?: string
  status: "online" | "offline" | "warning"
  latency?: number
  packetLoss?: number
}

const nodeIcons: Record<NodeType, React.ComponentType<{ className?: string }>> = {
  router: Router,
  server: Server,
  site: Building2,
  switch: Wifi,
}

const statusColors = {
  online: "bg-emerald-500",
  offline: "bg-red-500",
  warning: "bg-amber-500",
}

const statusBorderColors = {
  online: "border-emerald-500",
  offline: "border-red-500",
  warning: "border-amber-500",
}

// Custom Node Component
function DeviceNode({ data, selected }: NodeProps<Node<DeviceData>>) {
  const Icon = nodeIcons[data.type]
  
  return (
    <div
      className={`
        relative px-4 py-3 rounded-lg border-2 bg-card shadow-lg min-w-[140px]
        ${statusBorderColors[data.status]}
        ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
        transition-all duration-200 hover:shadow-xl
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
      <Handle type="target" position={Position.Left} className="!bg-primary !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-primary !w-3 !h-3" />
      
      {/* Status Indicator */}
      <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full ${statusColors[data.status]} border-2 border-background`} />
      
      <div className="flex flex-col items-center gap-2">
        <div className="p-2 rounded-lg bg-muted">
          <Icon className="h-6 w-6 text-foreground" />
        </div>
        <div className="text-center">
          <p className="font-medium text-sm text-foreground">{data.label}</p>
          {data.ip && (
            <p className="text-xs text-muted-foreground">{data.ip}</p>
          )}
        </div>
        {(data.latency !== undefined || data.packetLoss !== undefined) && (
          <div className="flex gap-2 text-xs">
            {data.latency !== undefined && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {data.latency}ms
              </span>
            )}
            {data.packetLoss !== undefined && data.packetLoss > 0 && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" />
                {data.packetLoss}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const nodeTypes = {
  device: DeviceNode,
}

// Initial nodes - Example: Main Site to DRC with 3 routers
const initialNodes: Node<DeviceData>[] = [
  {
    id: "mainsite",
    type: "device",
    position: { x: 100, y: 200 },
    data: { label: "Main Site", type: "site", ip: "10.0.0.1", status: "online" },
  },
  {
    id: "router1",
    type: "device",
    position: { x: 350, y: 100 },
    data: { label: "Router-GW1", type: "router", ip: "10.0.1.1", status: "online", latency: 2, packetLoss: 0 },
  },
  {
    id: "router2",
    type: "device",
    position: { x: 550, y: 200 },
    data: { label: "Router-Core", type: "router", ip: "10.0.2.1", status: "online", latency: 5, packetLoss: 0.1 },
  },
  {
    id: "router3",
    type: "device",
    position: { x: 750, y: 100 },
    data: { label: "Router-GW2", type: "router", ip: "10.0.3.1", status: "warning", latency: 15, packetLoss: 2.5 },
  },
  {
    id: "drc",
    type: "device",
    position: { x: 1000, y: 200 },
    data: { label: "DRC Site", type: "site", ip: "10.1.0.1", status: "online" },
  },
  {
    id: "server1",
    type: "device",
    position: { x: 100, y: 400 },
    data: { label: "Web Server", type: "server", ip: "10.0.0.10", status: "online", latency: 1 },
  },
  {
    id: "server2",
    type: "device",
    position: { x: 1000, y: 400 },
    data: { label: "DB Server", type: "server", ip: "10.1.0.10", status: "online", latency: 3 },
  },
]

const initialEdges: Edge[] = [
  { id: "e1", source: "mainsite", target: "router1", type: "smoothstep", animated: true, style: { stroke: "#10b981", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e2", source: "router1", target: "router2", type: "smoothstep", animated: true, style: { stroke: "#10b981", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e3", source: "router2", target: "router3", type: "smoothstep", animated: true, style: { stroke: "#f59e0b", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e4", source: "router3", target: "drc", type: "smoothstep", animated: true, style: { stroke: "#10b981", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e5", source: "mainsite", target: "server1", type: "smoothstep", style: { stroke: "#6b7280", strokeWidth: 1 } },
  { id: "e6", source: "drc", target: "server2", type: "smoothstep", style: { stroke: "#6b7280", strokeWidth: 1 } },
]

interface AddNodeModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (node: Partial<DeviceData>) => void
}

function AddNodeModal({ isOpen, onClose, onAdd }: AddNodeModalProps) {
  const [label, setLabel] = useState("")
  const [type, setType] = useState<NodeType>("router")
  const [ip, setIp] = useState("")

  const handleSubmit = () => {
    if (label) {
      onAdd({ label, type, ip: ip || undefined, status: "online" })
      setLabel("")
      setType("router")
      setIp("")
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Add Device</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Device Name</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="e.g., Router-Core"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as NodeType)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="router">Router</option>
              <option value="server">Server</option>
              <option value="site">Site</option>
              <option value="switch">Switch</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">IP Address</label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="e.g., 10.0.0.1"
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
              Add Device
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function NetworkMap() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#10b981", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds
        )
      ),
    [setEdges]
  )

  const handleAddNode = (data: Partial<DeviceData>) => {
    const newNode: Node<DeviceData> = {
      id: `node-${Date.now()}`,
      type: "device",
      position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 100 },
      data: {
        label: data.label || "New Device",
        type: data.type || "router",
        ip: data.ip,
        status: data.status || "online",
      },
    }
    setNodes((nds) => [...nds, newNode])
  }

  const handleDeleteSelected = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode))
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode && e.target !== selectedNode))
      setSelectedNode(null)
    }
  }

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  // Stats
  const stats = useMemo(() => {
    const online = nodes.filter((n) => n.data.status === "online").length
    const warning = nodes.filter((n) => n.data.status === "warning").length
    const offline = nodes.filter((n) => n.data.status === "offline").length
    return { online, warning, offline, total: nodes.length }
  }, [nodes])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Network Map</h1>
          <p className="text-muted-foreground">Visual topology of your network infrastructure</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Device
          </button>
          {selectedNode && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Devices</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="text-sm text-muted-foreground">Online</p>
          </div>
          <p className="text-2xl font-bold text-emerald-500">{stats.online}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <p className="text-sm text-muted-foreground">Warning</p>
          </div>
          <p className="text-2xl font-bold text-amber-500">{stats.warning}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <X className="h-4 w-4 text-red-500" />
            <p className="text-sm text-muted-foreground">Offline</p>
          </div>
          <p className="text-2xl font-bold text-red-500">{stats.offline}</p>
        </div>
      </div>

      {/* Network Map */}
      <div className="h-[600px] rounded-lg border border-border bg-card overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-background" />
          <Controls className="!bg-card !border-border !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-accent" />
          <MiniMap 
            className="!bg-card !border-border"
            nodeColor={(node) => {
              const status = (node.data as DeviceData).status
              return status === "online" ? "#10b981" : status === "warning" ? "#f59e0b" : "#ef4444"
            }}
          />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Router className="h-4 w-4" />
          <span>Router</span>
        </div>
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4" />
          <span>Server</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span>Site</span>
        </div>
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          <span>Switch</span>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <span>Online</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-500" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span>Offline</span>
          </div>
        </div>
      </div>

      <AddNodeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddNode}
      />
    </div>
  )
}
