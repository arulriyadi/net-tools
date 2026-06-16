import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { RouterDeviceList } from "@/components/router/router-device-list"

export const metadata = {
  title: "Router Management · Net-Tools",
  description:
    "Browse router devices from Device Inventory — routes, interfaces, firewall filter/NAT, and address lists.",
}

export default function RouterPage() {
  return (
    <DashboardLayout>
      <RouterDeviceList />
    </DashboardLayout>
  )
}
