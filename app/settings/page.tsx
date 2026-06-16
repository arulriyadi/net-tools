import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { SettingsPanel } from "@/components/settings/settings-panel"

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your dashboard preferences</p>
        </div>
        <SettingsPanel />
      </div>
    </DashboardLayout>
  )
}
