import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { NginxServiceManagement } from "@/components/nginx/nginx-service-management"

export default function NginxServicePage() {
  return (
    <DashboardLayout>
      <NginxServiceManagement />
    </DashboardLayout>
  )
}
