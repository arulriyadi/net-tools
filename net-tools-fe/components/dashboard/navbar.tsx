"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { BrandLogo } from "./brand-logo"
import { CommandTaskTray } from "@/components/command-tasks/command-task-tray"
import {
  Home,
  Server,
  Settings,
  ChevronDown,
  Monitor,
  Database,
  Activity,
  Network,
  Moon,
  Sun,
  Bell,
  Search,
  Menu,
  X,
  Globe,
  FileText,
  RefreshCw,
  Radar,
  Route,
  Waypoints,
  Link2,
  MapPin,
  Building2,
  GitBranch,
  Layers,
  Hash,
  ScanSearch,
  Boxes,
  KeyRound,
  Shield,
  Router,
} from "lucide-react"

interface NavItem {
  title: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
  disabled?: boolean
  badge?: string
}

const navItems: NavItem[] = [
  {
    title: "Overview",
    href: "/",
    icon: Home,
  },
  {
    title: "Resource Pool",
    icon: Boxes,
    children: [
      {
        title: "Device Inventory",
        href: "/resource-pool/device-inventory",
        icon: Database,
      },
      {
        title: "Device Types",
        href: "/resource-pool/device-types",
        icon: Router,
      },
      {
        title: "Data Connectors",
        href: "/resource-pool/data-connectors",
        icon: Link2,
      },
      {
        title: "Keychain",
        href: "/resource-pool/keychain",
        icon: KeyRound,
      },
    ],
  },
  {
    title: "Nginx Management",
    icon: Server,
    children: [
      {
        title: "Nginx UI",
        href: "/nginx/ui",
        icon: Monitor,
      },
      {
        title: "Service Management",
        href: "/nginx/service",
        icon: Activity,
      },
    ],
  },
  {
    title: "Network Device Management",
    icon: Network,
    children: [
      {
        title: "Firewall Management",
        href: "/firewall",
        icon: Shield,
      },
      {
        title: "Router Management",
        icon: Router,
        disabled: true,
        badge: "Coming soon",
      },
    ],
  },
  {
    title: "DNS Management",
    icon: Globe,
    children: [
      {
        title: "DNS Records",
        href: "/dns/records",
        icon: FileText,
      },
      {
        title: "DNS Zones",
        href: "/dns/zones",
        icon: Database,
      },
      {
        title: "DNS Resolver",
        href: "/dns/resolver",
        icon: RefreshCw,
      },
    ],
  },
  {
    title: "Net-Mon",
    icon: Radar,
    children: [
      {
        title: "Network Map",
        href: "/netmon/map",
        icon: Waypoints,
      },
      {
        title: "Path Monitor",
        href: "/netmon/path",
        icon: Route,
      },
      {
        title: "Link Status",
        href: "/netmon/links",
        icon: Link2,
      },
    ],
  },
  {
    title: "IPAM",
    icon: MapPin,
    children: [
      {
        title: "Sites",
        href: "/ipam/sites",
        icon: Building2,
      },
      {
        title: "Subnets",
        href: "/ipam/subnets",
        icon: GitBranch,
      },
      {
        title: "IP Addresses",
        href: "/ipam/addresses",
        icon: Hash,
      },
      {
        title: "IP Pools",
        href: "/ipam/pools",
        icon: Layers,
      },
      {
        title: "VLANs",
        href: "/ipam/vlans",
        icon: Network,
      },
    ],
  },
  {
    title: "IP Checker",
    href: "/ip-checker",
    icon: ScanSearch,
  },
]

export function Navbar() {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  const isActive = (href?: string) => {
    if (!href) return false
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const isChildActive = (item: NavItem) => {
    if (item.children) {
      return item.children.some((child) => isActive(child.href))
    }
    return false
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <BrandLogo />

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" ref={dropdownRef}>
            {navItems.map((item) => (
              <div key={item.title} className="relative">
                {item.href ? (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === item.title ? null : item.title)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isChildActive(item) || openDropdown === item.title
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform",
                        openDropdown === item.title && "rotate-180"
                      )} />
                    </button>
                    {openDropdown === item.title && item.children && (
                      <div className="absolute left-0 top-full mt-1 w-56 rounded-md border border-border bg-popover p-1 shadow-lg">
                        {item.children.map((child) =>
                          child.disabled || !child.href ? (
                            <div
                              key={child.title}
                              className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground opacity-60"
                              aria-disabled="true"
                            >
                              <child.icon className="h-4 w-4" />
                              <span className="flex-1">{child.title}</span>
                              {child.badge && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                                  {child.badge}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Link
                              key={child.title}
                              href={child.href}
                              onClick={() => setOpenDropdown(null)}
                              className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                                isActive(child.href)
                                  ? "bg-primary text-primary-foreground"
                                  : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                              )}
                            >
                              <child.icon className="h-4 w-4" />
                              <span>{child.title}</span>
                            </Link>
                          )
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="h-9 w-48 lg:w-64 rounded-md border border-input bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <CommandTaskTray />

          {/* Notifications */}
          <button className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
          </button>

          {/* Theme Toggle — always visible; icon updates after mount */}
          <button
            onClick={toggleTheme}
            className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground shrink-0"
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute inset-0 m-auto h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>

          {/* Settings */}
          <Link
            href="/settings"
            className={cn(
              "rounded-md p-2 transition-colors",
              isActive("/settings")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Settings className="h-5 w-5" />
          </Link>

          {/* User Avatar */}
          <div className="ml-2 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">A</span>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-card p-4">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <div key={item.title}>
                {item.href ? (
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === item.title ? null : item.title)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isChildActive(item)
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="flex-1 text-left">{item.title}</span>
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform",
                        openDropdown === item.title && "rotate-180"
                      )} />
                    </button>
                    {openDropdown === item.title && item.children && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-border pl-4">
                        {item.children.map((child) =>
                          child.disabled || !child.href ? (
                            <div
                              key={child.title}
                              className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground opacity-60"
                              aria-disabled="true"
                            >
                              <child.icon className="h-4 w-4" />
                              <span className="flex-1">{child.title}</span>
                              {child.badge && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                                  {child.badge}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Link
                              key={child.title}
                              href={child.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                                isActive(child.href)
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              )}
                            >
                              <child.icon className="h-4 w-4" />
                              <span>{child.title}</span>
                            </Link>
                          )
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
