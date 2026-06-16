import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { PathMonitor } from "@/components/netmon/path-monitor"

export default function PathMonitorPage() {
  return (
    <DashboardLayout>
      <PathMonitor />
    </DashboardLayout>
  )
}
