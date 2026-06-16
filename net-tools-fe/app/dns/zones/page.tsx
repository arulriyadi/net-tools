import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DnsZonesManagement } from "@/components/dns/dns-zones"

export default function DnsZonesPage() {
  return (
    <DashboardLayout>
      <DnsZonesManagement />
    </DashboardLayout>
  )
}
