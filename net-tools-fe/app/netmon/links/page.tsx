import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { LinkStatus } from "@/components/netmon/link-status"

export default function LinkStatusPage() {
  return (
    <DashboardLayout>
      <LinkStatus />
    </DashboardLayout>
  )
}
