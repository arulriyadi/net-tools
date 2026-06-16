import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DeviceTypesPanel } from "@/components/resource-pool/device-types-panel"

export default function DeviceTypesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Device Types</h1>
          <p className="text-muted-foreground">
            Catalog of vendor templates — defines which datasets (security rules, NAT, routes, objects)
            are available per device category when importing CSV or API data.
          </p>
        </div>
        <DeviceTypesPanel />
      </div>
    </DashboardLayout>
  )
}
