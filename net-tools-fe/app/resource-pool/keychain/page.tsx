import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { KeychainPanel } from "@/components/resource-pool/keychain-panel"

export default function KeychainPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Keychain</h1>
          <p className="text-muted-foreground">
            Manage SSH keys for device access across NetTools modules
          </p>
        </div>
        <KeychainPanel />
      </div>
    </DashboardLayout>
  )
}
