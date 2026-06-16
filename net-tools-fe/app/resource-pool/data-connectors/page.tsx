import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DataConnectorsPanel } from "@/components/resource-pool/data-connectors-panel"

export default function DataConnectorsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Data Connectors</h1>
          <p className="text-muted-foreground">
            Reusable templates for live data collection — API, SNMP, SSH, and other protocols.
            Mapped to Device Types, then configured per device in Inventory.
          </p>
        </div>
        <DataConnectorsPanel />
      </div>
    </DashboardLayout>
  )
}
