import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DnsDeviceList } from "@/components/dns/dns-device-list"

export const metadata = {
  title: "DNS Management · Net-Tools",
  description: "Browse DNS devices from Device Inventory — zones, records, and resolver stats.",
}

export default function DnsPage() {
  return (
    <DashboardLayout>
      <DnsDeviceList />
    </DashboardLayout>
  )
}
