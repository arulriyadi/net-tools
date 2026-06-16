import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DeviceOverviewPanel } from "@/components/resource-pool/device-overview-panel"

interface DeviceOverviewPageProps {
  params: Promise<{ id: string }>
}

export default async function DeviceOverviewPage({ params }: DeviceOverviewPageProps) {
  const { id } = await params

  return (
    <DashboardLayout>
      <DeviceOverviewPanel deviceId={id} />
    </DashboardLayout>
  )
}
