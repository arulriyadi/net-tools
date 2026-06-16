import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { SubnetsManagement } from "@/components/ipam/subnets-management"

export default function IPAMSubnetsPage() {
  return (
    <DashboardLayout title="Subnets" description="Manage network subnets across all sites">
      <SubnetsManagement />
    </DashboardLayout>
  )
}
