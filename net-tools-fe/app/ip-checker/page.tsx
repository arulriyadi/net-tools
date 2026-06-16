import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { IpCheckerDashboard } from "@/components/ip-checker/ip-checker-dashboard"

export default function IpCheckerPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">IP Checker</h1>
          <p className="text-muted-foreground">
            IP detection, geolocation, leak tests, connectivity, lookup & blacklist — inspired by IPCheck.ing
          </p>
        </div>
        <IpCheckerDashboard />
      </div>
    </DashboardLayout>
  )
}
