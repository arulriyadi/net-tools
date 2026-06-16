import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { RouterDeviceDetail } from "@/components/router/router-device-detail"

interface RouterDevicePageProps {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: "Router Device · Net-Tools",
  description: "Routing table, interfaces, firewall filter, and address lists for a router device.",
}

export default async function RouterDevicePage({ params }: RouterDevicePageProps) {
  const { id } = await params

  return (
    <DashboardLayout>
      <RouterDeviceDetail deviceId={id} />
    </DashboardLayout>
  )
}
