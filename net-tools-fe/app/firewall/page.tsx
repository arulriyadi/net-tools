import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { FirewallDeviceList } from "@/components/firewall/firewall-device-list"

export const metadata = {
  title: "Firewall Management · Net-Tools",
  description:
    "Browse firewall devices from Resource Pool and open rules, NAT, routes, and address objects.",
}

export default function FirewallPage() {
  return (
    <DashboardLayout>
      <FirewallDeviceList />
    </DashboardLayout>
  )
}
