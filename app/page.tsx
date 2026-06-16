import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { StatCard } from "@/components/dashboard/stat-card"
import { ServiceStatus } from "@/components/dashboard/service-status"
import { RecentLogs } from "@/components/dashboard/recent-logs"
import { SystemChart } from "@/components/dashboard/system-chart"
import { Cpu, MemoryStick, HardDrive, Wifi } from "lucide-react"

export default function OverviewPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Overview</h1>
          <p className="text-muted-foreground">System health and activity summary</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="CPU Usage"
            value="58%"
            subtitle="8 cores active"
            icon={Cpu}
            trend={{ value: 2.5, isPositive: false }}
          />
          <StatCard
            title="Memory"
            value="12.4 GB"
            subtitle="of 32 GB used"
            icon={MemoryStick}
            trend={{ value: 1.2, isPositive: false }}
          />
          <StatCard
            title="Disk Usage"
            value="456 GB"
            subtitle="of 1 TB used"
            icon={HardDrive}
          />
          <StatCard
            title="Network"
            value="1.2 Gbps"
            subtitle="Current throughput"
            icon={Wifi}
            trend={{ value: 15.3, isPositive: true }}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid gap-4 lg:grid-cols-3">
          <SystemChart
            title="CPU Usage"
            dataKey="cpu"
            color="oklch(0.65 0.18 160)"
            unit="%"
          />
          <SystemChart
            title="Memory Usage"
            dataKey="memory"
            color="oklch(0.65 0.18 250)"
            unit="%"
          />
          <SystemChart
            title="Network I/O"
            dataKey="network"
            color="oklch(0.75 0.15 85)"
            unit="%"
          />
        </div>

        {/* Service Status and Logs */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ServiceStatus />
          <RecentLogs />
        </div>
      </div>
    </DashboardLayout>
  )
}
