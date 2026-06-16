"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IpDetectionPanel } from "./ip-detection-panel"
import { LeakTestsPanel } from "./leak-tests-panel"
import { ConnectivityPanel } from "./connectivity-panel"
import { LookupPanel } from "./lookup-panel"
import { BlacklistPanel } from "./blacklist-panel"

export function IpCheckerDashboard() {
  return (
    <Tabs defaultValue="detection" className="space-y-6">
      <TabsList className="flex h-auto flex-wrap gap-1">
        <TabsTrigger value="detection">IP & Geo</TabsTrigger>
        <TabsTrigger value="leaks">Leak Tests</TabsTrigger>
        <TabsTrigger value="connectivity">Connectivity</TabsTrigger>
        <TabsTrigger value="lookup">IP Lookup</TabsTrigger>
        <TabsTrigger value="blacklist">Blacklist</TabsTrigger>
      </TabsList>

      <TabsContent value="detection">
        <IpDetectionPanel />
      </TabsContent>
      <TabsContent value="leaks">
        <LeakTestsPanel />
      </TabsContent>
      <TabsContent value="connectivity">
        <ConnectivityPanel />
      </TabsContent>
      <TabsContent value="lookup">
        <LookupPanel />
      </TabsContent>
      <TabsContent value="blacklist">
        <BlacklistPanel />
      </TabsContent>
    </Tabs>
  )
}
