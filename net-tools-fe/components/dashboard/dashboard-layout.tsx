"use client"

import { Navbar } from "./navbar"
import { CommandTaskProvider } from "@/components/command-tasks/command-task-provider"
import { CommandTaskOverlays } from "@/components/command-tasks/command-task-overlays"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <CommandTaskProvider>
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
        <Navbar />
        <main className="min-w-0 flex-1 bg-background p-6">{children}</main>
      </div>
      <CommandTaskOverlays />
    </CommandTaskProvider>
  )
}
