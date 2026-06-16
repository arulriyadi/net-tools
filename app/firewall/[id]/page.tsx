import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { FirewallDeviceDetail } from "@/components/firewall/firewall-device-detail"

interface FirewallDevicePageProps {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: "Firewall Device · Net-Tools",
  description: "Security, NAT, routes, and address objects for a firewall device.",
}

export default async function FirewallDevicePage({ params }: FirewallDevicePageProps) {
  const { id } = await params

  return (
    <DashboardLayout>
      <FirewallDeviceDetail deviceId={id} />
    </DashboardLayout>
  )
}
