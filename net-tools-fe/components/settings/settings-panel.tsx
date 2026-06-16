"use client"

import { useTheme } from "@/components/theme-provider"
import { useEffect, useState } from "react"
import { Moon, Sun, Monitor, Bell, Shield, Database, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

export function SettingsPanel() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ]

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-medium text-card-foreground">Appearance</h3>
          <p className="text-sm text-muted-foreground">Customize how the dashboard looks</p>
        </div>
        <div className="p-4">
          <label className="text-sm font-medium text-card-foreground">Theme</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {mounted &&
              themeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm transition-colors",
                    theme === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                  )}
                >
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-medium text-card-foreground">Notifications</h3>
          <p className="text-sm text-muted-foreground">Configure alert preferences</p>
        </div>
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-card-foreground">Service Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified when services go down</p>
              </div>
            </div>
            <button className="relative h-6 w-11 rounded-full bg-primary transition-colors">
              <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-primary-foreground transition-transform" />
            </button>
          </div>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-card-foreground">Security Alerts</p>
                <p className="text-sm text-muted-foreground">Suspicious activity notifications</p>
              </div>
            </div>
            <button className="relative h-6 w-11 rounded-full bg-primary transition-colors">
              <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-primary-foreground transition-transform" />
            </button>
          </div>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-card-foreground">Resource Warnings</p>
                <p className="text-sm text-muted-foreground">High CPU/Memory usage alerts</p>
              </div>
            </div>
            <button className="relative h-6 w-11 rounded-full bg-muted transition-colors">
              <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-muted-foreground transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-medium text-card-foreground">API Configuration</h3>
          <p className="text-sm text-muted-foreground">Backend connection settings</p>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-card-foreground">API Endpoint</label>
            <div className="mt-1.5 flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="https://api.example.com"
                className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-card-foreground">API Key</label>
            <div className="mt-1.5">
              <input
                type="password"
                placeholder="Enter your API key"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
