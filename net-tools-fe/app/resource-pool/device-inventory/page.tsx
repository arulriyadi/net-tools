import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DeviceInventory } from "@/components/resource-pool/device-inventory"

export default function DeviceInventoryPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Device Inventory</h1>
          <p className="text-muted-foreground">
            Central resource pool — servers, credentials, and metadata for all modules
          </p>
        </div>
        <DeviceInventory />
      </div>
    </DashboardLayout>
  )
}
