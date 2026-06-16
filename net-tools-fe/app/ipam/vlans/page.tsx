import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { VLANsManagement } from "@/components/ipam/vlans-management"

export default function IPAMVLANsPage() {
  return (
    <DashboardLayout title="VLANs" description="Manage VLAN configurations across sites">
      <VLANsManagement />
    </DashboardLayout>
  )
}
