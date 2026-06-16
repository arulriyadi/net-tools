import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DnsRecordsManagement } from "@/components/dns/dns-records"

export default function DnsRecordsPage() {
  return (
    <DashboardLayout>
      <DnsRecordsManagement />
    </DashboardLayout>
  )
}
