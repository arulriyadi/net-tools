import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DnsDeviceDetail } from "@/components/dns/dns-device-detail"

interface DnsDevicePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export const metadata = {
  title: "DNS Device · Net-Tools",
  description: "DNS zones, records, and resolver stats for a Technitium DNS server.",
}

export default async function DnsDevicePage({ params, searchParams }: DnsDevicePageProps) {
  const { id } = await params
  const { tab } = await searchParams

  return (
    <DashboardLayout>
      <DnsDeviceDetail deviceId={id} initialTab={tab} />
    </DashboardLayout>
  )
}
