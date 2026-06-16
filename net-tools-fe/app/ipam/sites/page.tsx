import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { SitesManagement } from "@/components/ipam/sites-management"

export default function IPAMSitesPage() {
  return (
    <DashboardLayout title="Sites" description="Manage datacenter and office sites">
      <SitesManagement />
    </DashboardLayout>
  )
}
