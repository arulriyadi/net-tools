"use client"

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const data = [
  { time: "00:00", cpu: 45, memory: 62, network: 30 },
  { time: "02:00", cpu: 38, memory: 58, network: 25 },
  { time: "04:00", cpu: 32, memory: 55, network: 20 },
  { time: "06:00", cpu: 48, memory: 60, network: 35 },
  { time: "08:00", cpu: 65, memory: 72, network: 55 },
  { time: "10:00", cpu: 72, memory: 78, network: 68 },
  { time: "12:00", cpu: 68, memory: 75, network: 62 },
  { time: "14:00", cpu: 58, memory: 68, network: 48 },
  { time: "16:00", cpu: 62, memory: 70, network: 52 },
  { time: "18:00", cpu: 70, memory: 76, network: 60 },
  { time: "20:00", cpu: 55, memory: 65, network: 45 },
  { time: "22:00", cpu: 42, memory: 58, network: 32 },
]

interface SystemChartProps {
  title: string
  dataKey: "cpu" | "memory" | "network"
  color: string
  unit: string
}

export function SystemChart({ title, dataKey, color, unit }: SystemChartProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium text-card-foreground">{title}</h3>
        <span className="text-sm text-muted-foreground">Last 24h</span>
      </div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              dx={-10}
              tickFormatter={(value) => `${value}${unit}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "var(--card-foreground)" }}
              formatter={(value: number) => [`${value}${unit}`, title]}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${dataKey})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
