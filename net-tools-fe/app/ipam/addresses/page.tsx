import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { IPAddressesManagement } from "@/components/ipam/ip-addresses"

export default function IPAMAddressesPage() {
  return (
    <DashboardLayout title="IP Addresses" description="Track and manage IP address allocations">
      <IPAddressesManagement />
    </DashboardLayout>
  )
}
