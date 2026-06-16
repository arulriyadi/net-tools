import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { NginxUIManagement } from "@/components/nginx/nginx-ui-management"

export default function NginxUIPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Nginx UI Management</h1>
          <p className="text-muted-foreground">Manage nginx-ui instances and monitor site status</p>
        </div>
        <NginxUIManagement />
      </div>
    </DashboardLayout>
  )
}
