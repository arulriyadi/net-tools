import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { IPPoolsManagement } from "@/components/ipam/ip-pools"

export default function IPAMPoolsPage() {
  return (
    <DashboardLayout title="IP Pools" description="Manage NAT, DHCP, and other IP pools">
      <IPPoolsManagement />
    </DashboardLayout>
  )
}
