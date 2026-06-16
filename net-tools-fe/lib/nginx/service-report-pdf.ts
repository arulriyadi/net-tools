import jsPDF from "jspdf"
import type { NginxServiceView, ServiceCveView } from "@/lib/nginx/service-types"

const MARGIN = 14
const PAGE_W = 210
const CONTENT_W = PAGE_W - MARGIN * 2
const FOOTER_Y = 285

const BRAND = { r: 25, g: 55, b: 95 }
const MUTED = { r: 60, g: 60, b: 60 }
const SUCCESS = { r: 34, g: 139, b: 84 }
const WARNING = { r: 180, g: 120, b: 20 }
const DANGER = { r: 180, g: 50, b: 50 }

function severityRgb(severity: ServiceCveView["severity"]) {
  if (severity === "critical" || severity === "high") return DANGER
  if (severity === "medium") return WARNING
  return MUTED
}

function formatNow() {
  return new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDateOnly() {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

class ReportBuilder {
  private doc: jsPDF
  private y = MARGIN
  private page = 1
  private headerLabel: string

  constructor(headerLabel: string) {
    this.doc = new jsPDF({ unit: "mm", format: "a4" })
    this.headerLabel = headerLabel
  }

  private footer() {
    this.doc.setFont("helvetica", "italic")
    this.doc.setFontSize(8)
    this.doc.setTextColor(120, 120, 120)
    this.doc.text(`Generated ${formatDateOnly()} | NetTools Internal`, PAGE_W / 2, FOOTER_Y, {
      align: "center",
    })
  }

  private header() {
    if (this.page === 1) return
    this.doc.setFont("helvetica", "italic")
    this.doc.setFontSize(8)
    this.doc.setTextColor(100, 100, 100)
    this.doc.text(`Nginx Service Report — ${this.headerLabel}`, MARGIN, 10)
    this.doc.text(`Page ${this.page}`, PAGE_W - MARGIN, 10, { align: "right" })
    this.doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b)
    this.doc.line(MARGIN, 12, PAGE_W - MARGIN, 12)
    this.y = 18
  }

  private newPage() {
    this.footer()
    this.doc.addPage()
    this.page += 1
    this.header()
  }

  ensureSpace(height: number) {
    if (this.y + height > FOOTER_Y - 8) this.newPage()
  }

  sectionTitle(title: string) {
    this.ensureSpace(16)
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(13)
    this.doc.setTextColor(BRAND.r, BRAND.g, BRAND.b)
    this.doc.text(title, MARGIN, this.y)
    this.y += 5
    this.doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b)
    this.doc.line(MARGIN, this.y, PAGE_W - MARGIN, this.y)
    this.y += 6
    this.doc.setTextColor(0, 0, 0)
  }

  bodyText(text: string) {
    this.doc.setFont("helvetica", "normal")
    this.doc.setFontSize(10)
    const lines = this.doc.splitTextToSize(text, CONTENT_W)
    this.ensureSpace(lines.length * 5 + 4)
    this.doc.text(lines, MARGIN, this.y)
    this.y += lines.length * 5 + 3
  }

  bullet(text: string) {
    this.doc.setFont("helvetica", "normal")
    this.doc.setFontSize(10)
    const lines = this.doc.splitTextToSize(`  •  ${text}`, CONTENT_W)
    this.ensureSpace(lines.length * 5 + 2)
    this.doc.text(lines, MARGIN, this.y)
    this.y += lines.length * 5 + 1
  }

  metaLine(label: string, value: string) {
    this.doc.setFont("helvetica", "normal")
    this.doc.setFontSize(11)
    this.doc.setTextColor(0, 0, 0)
    this.doc.text(`${label}: ${value}`, MARGIN, this.y)
    this.y += 6
  }

  dataTable(headers: string[], rows: string[][], colWidths: number[], rowH = 7) {
    const tableW = colWidths.reduce((a, b) => a + b, 0)
    if (tableW > CONTENT_W) {
      const scale = CONTENT_W / tableW
      colWidths = colWidths.map((w) => w * scale)
    }

    this.ensureSpace(rowH + 4)

    let x = MARGIN
    this.doc.setFillColor(BRAND.r, BRAND.g, BRAND.b)
    this.doc.setTextColor(255, 255, 255)
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(8)
    headers.forEach((h, i) => {
      this.doc.rect(x, this.y, colWidths[i], rowH, "F")
      this.doc.text(h, x + 2, this.y + 4.8)
      x += colWidths[i]
    })
    this.y += rowH

    this.doc.setTextColor(0, 0, 0)
    this.doc.setFont("helvetica", "normal")
    rows.forEach((row, ri) => {
      this.ensureSpace(rowH + 2)
      x = MARGIN
      const fill = ri % 2 === 0
      row.forEach((cell, i) => {
        if (fill) this.doc.setFillColor(245, 248, 252)
        else this.doc.setFillColor(255, 255, 255)
        this.doc.rect(x, this.y, colWidths[i], rowH, fill ? "FD" : "S")
        const clipped = cell.length > 48 ? `${cell.slice(0, 45)}…` : cell
        this.doc.text(clipped, x + 2, this.y + 4.8)
        x += colWidths[i]
      })
      this.y += rowH
    })
    this.y += 4
  }

  cveBlock(cve: ServiceCveView) {
    const color = severityRgb(cve.severity)
    this.ensureSpace(28)
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(11)
    this.doc.setTextColor(color.r, color.g, color.b)
    this.doc.text(`${cve.id}  [${cve.severity.toUpperCase()}]`, MARGIN, this.y)
    this.y += 6
    this.doc.setTextColor(0, 0, 0)
    this.doc.setFont("helvetica", "normal")
    this.doc.setFontSize(10)
    this.bullet(`Module: ${cve.module}`)
    this.bullet(`Description: ${cve.title}`)
    this.bullet(`Fixed in stable: ${cve.fixedIn}`)
    this.y += 2
  }

  cover(server: NginxServiceView, cveCount: number, outdated: boolean) {
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(22)
    this.doc.setTextColor(BRAND.r, BRAND.g, BRAND.b)
    this.y = 28
    this.doc.text("Nginx Service Report", MARGIN, this.y)
    this.y += 10
    this.doc.setFontSize(14)
    this.doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
    this.doc.text("Vulnerability & Service Assessment", MARGIN, this.y)
    this.y += 14

    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(16)
    this.doc.setTextColor(0, 0, 0)
    this.doc.text(server.displayName, MARGIN, this.y)
    this.y += 8
    this.doc.setFont("helvetica", "normal")
    this.doc.setFontSize(11)
    this.metaLine("Report date", formatNow())
    this.metaLine("Device name", server.name)
    this.metaLine("Hostname", server.inventoryHostname)
    this.metaLine("IP address", server.ip)
    this.metaLine("Operating system", server.os)
    this.metaLine("Service status", server.status.toUpperCase())
    this.metaLine("Installed nginx", server.version)
    this.metaLine("Latest stable", server.latestVersion)
    this.metaLine("Overall risk", server.overallRisk.toUpperCase())
    this.y += 2

    const risk = cveCount > 0 ? "ELEVATED" : outdated ? "MODERATE" : "LOW"
    const riskColor = cveCount > 0 ? DANGER : outdated ? WARNING : SUCCESS
    this.doc.setFillColor(240, 245, 250)
    this.doc.rect(MARGIN, this.y, CONTENT_W, 14, "F")
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(10)
    this.doc.setTextColor(BRAND.r, BRAND.g, BRAND.b)
    this.doc.text("Overall risk assessment", MARGIN + 3, this.y + 5)
    this.doc.setTextColor(riskColor.r, riskColor.g, riskColor.b)
    this.doc.text(risk, MARGIN + 3, this.y + 11)
    this.y += 20

    this.doc.setFont("helvetica", "normal")
    this.doc.setFontSize(9)
    this.doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
    const refs = [
      "CVE data source: NetTools CVE assessment (nginx.org advisories)",
      "Report generated by NetTools — Nginx Service Management",
    ]
    refs.forEach((ref) => {
      this.doc.text(ref, MARGIN, this.y)
      this.y += 5
    })
    this.y += 6
  }

  fleetCover(
    servers: NginxServiceView[],
    totals: { running: number; outdated: number; vulns: number },
  ) {
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(22)
    this.doc.setTextColor(BRAND.r, BRAND.g, BRAND.b)
    this.y = 28
    this.doc.text("Nginx Fleet Service Report", MARGIN, this.y)
    this.y += 10
    this.doc.setFontSize(14)
    this.doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
    this.doc.text("All Monitored Servers — Vulnerability & Service Assessment", MARGIN, this.y)
    this.y += 14

    this.doc.setFont("helvetica", "normal")
    this.doc.setFontSize(11)
    this.metaLine("Report date", formatNow())
    this.metaLine("Monitored hosts", String(servers.length))
    this.metaLine("Running", String(totals.running))
    this.metaLine("Outdated", String(totals.outdated))
    this.metaLine("Open CVEs (total)", String(totals.vulns))
    this.y += 2

    const fleetRisk =
      totals.vulns > 0 ? "ELEVATED" : totals.outdated > 0 ? "MODERATE" : "LOW"
    const riskColor =
      totals.vulns > 0 ? DANGER : totals.outdated > 0 ? WARNING : SUCCESS
    this.doc.setFillColor(240, 245, 250)
    this.doc.rect(MARGIN, this.y, CONTENT_W, 14, "F")
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(10)
    this.doc.setTextColor(BRAND.r, BRAND.g, BRAND.b)
    this.doc.text("Fleet risk assessment", MARGIN + 3, this.y + 5)
    this.doc.setTextColor(riskColor.r, riskColor.g, riskColor.b)
    this.doc.text(fleetRisk, MARGIN + 3, this.y + 11)
    this.y += 20

    this.doc.setFont("helvetica", "normal")
    this.doc.setFontSize(9)
    this.doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
    this.doc.text("CVE data source: NetTools CVE assessment (nginx.org advisories)", MARGIN, this.y)
    this.y += 5
    this.doc.text("Report generated by NetTools — Nginx Service Management", MARGIN, this.y)
    this.y += 8
  }

  save(filename: string) {
    this.footer()
    this.doc.save(filename)
  }

  spacer(mm = 2) {
    this.y += mm
  }

  subheading(title: string) {
    this.ensureSpace(10)
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(11)
    this.doc.setTextColor(BRAND.r, BRAND.g, BRAND.b)
    this.doc.text(title, MARGIN, this.y)
    this.y += 6
    this.doc.setTextColor(0, 0, 0)
  }
}

function isOutdated(server: NginxServiceView): boolean {
  if (!server.version || server.version === "—") return false
  return server.version !== server.latestVersion
}

function executiveSummary(server: NginxServiceView, cves: ServiceCveView[], outdated: boolean): string {
  const parts = [
    `Automated assessment for nginx ${server.version} on ${server.displayName} (${server.ip}).`,
    `Service is ${server.status}; last checked ${server.lastChecked}.`,
  ]
  if (cves.length > 0) {
    parts.push(
      `${cves.length} open CVE finding(s): ${cves.map((c) => c.id).join(", ")}.`,
    )
  } else {
    parts.push("No open CVE findings recorded for this server.")
  }
  if (outdated) {
    parts.push(
      `Version is behind latest stable ${server.latestVersion}. Upgrade recommended after change control.`,
    )
  } else if (server.version !== "—") {
    parts.push("Version matches latest stable target.")
  }
  if (server.recommendation) {
    parts.push(server.recommendation)
  }
  return parts.join(" ")
}

export function generateNginxServiceReport(server: NginxServiceView): void {
  const cves = server.cves
  const outdated = isOutdated(server)
  const report = new ReportBuilder(server.displayName)

  report.cover(server, cves.length, outdated)

  report.sectionTitle("1. Executive Summary")
  report.bodyText(executiveSummary(server, cves, outdated))

  report.sectionTitle("2. Server Information")
  report.dataTable(
    ["Field", "Value"],
    [
      ["Asset name", server.displayName],
      ["Device name", server.name],
      ["Inventory hostname", server.inventoryHostname],
      ["Detected hostname", server.hostname],
      ["IP address", server.ip],
      ["Operating system", server.os],
      ["Last checked", server.lastChecked],
      ["Installed version", server.version],
      ["Latest stable", server.latestVersion],
      ["Update status", outdated ? "Outdated" : server.version === "—" ? "Unknown" : "Up to date"],
      ["Config test", server.configTestOk === null ? "—" : server.configTestOk ? "PASS" : "FAIL"],
    ],
    [52, 128],
  )

  report.sectionTitle("3. Service Status")
  report.dataTable(
    ["Metric", "Value"],
    [
      ["Status", server.status.toUpperCase()],
      ["Overall risk", server.overallRisk.toUpperCase()],
      ["Nginx UI active", server.nginxUiActive === null ? "—" : server.nginxUiActive ? "Yes" : "No"],
    ],
    [55, 125],
  )

  report.sectionTitle("4. CVE Findings")
  if (cves.length === 0) {
    report.bodyText(`No open vulnerabilities recorded for nginx ${server.version}.`)
  } else {
    report.dataTable(
      ["CVE", "Severity", "Module", "Description", "Fixed in"],
      cves.map((c) => [c.id, c.severity.toUpperCase(), c.module, c.title, c.fixedIn]),
      [28, 22, 24, 62, 24],
      8,
    )
  }

  report.sectionTitle("5. Vulnerability Details")
  if (cves.length === 0) {
    report.bodyText("No CVE advisories to detail for this server.")
  } else {
    cves.forEach((cve) => report.cveBlock(cve))
  }

  report.sectionTitle("6. Recommendations")
  if (outdated) {
    report.bullet(`Plan upgrade to nginx ${server.latestVersion} via approved change window.`)
    report.bullet("Run nginx -t and reload after package upgrade.")
    report.bullet("Re-run SSH check and export updated report post-upgrade.")
  }
  if (cves.length > 0) {
    report.bullet("Review affected modules and apply distro/vendor patches when available.")
    report.bullet("Monitor nginx error.log for worker crash or segfault patterns.")
  }
  if (!outdated && cves.length === 0 && server.version !== "—") {
    report.bullet("Continue monitoring nginx.org and vendor security advisories.")
    report.bullet("Re-assess after any package update or configuration change.")
  }

  report.save(`nginx-report-${server.displayName}-${Date.now()}.pdf`)
}

function fleetExecutiveSummary(
  servers: NginxServiceView[],
  totals: { running: number; stopped: number; outdated: number; vulns: number },
): string {
  return [
    `Fleet assessment covering ${servers.length} nginx hosts from device inventory.`,
    `${totals.running} running, ${totals.stopped} stopped, ${totals.outdated} behind latest stable.`,
    totals.vulns > 0
      ? `${totals.vulns} open CVE finding(s) across the fleet.`
      : "No open CVEs detected across the fleet.",
    "Per-server summaries and consolidated CVE tables are included below.",
  ].join(" ")
}

export function generateNginxFleetReport(servers: NginxServiceView[]): void {
  const totals = {
    running: servers.filter((s) => s.status === "running").length,
    stopped: servers.filter((s) => s.status === "stopped").length,
    outdated: servers.filter(isOutdated).length,
    vulns: servers.reduce((a, s) => a + s.cves.length, 0),
  }

  const report = new ReportBuilder("Fleet Overview")
  report.fleetCover(servers, totals)

  report.sectionTitle("1. Executive Summary")
  report.bodyText(fleetExecutiveSummary(servers, totals))

  report.sectionTitle("2. Fleet Inventory")
  report.dataTable(
    ["Asset", "IP", "Status", "Version", "Latest", "CVEs"],
    servers.map((s) => [
      s.displayName,
      s.ip,
      s.status.toUpperCase(),
      s.version,
      s.latestVersion,
      String(s.cves.length),
    ]),
    [38, 28, 22, 24, 24, 16],
  )

  report.sectionTitle("3. Consolidated CVE Findings")
  const cveRows: string[][] = []
  servers.forEach((s) => {
    if (s.cves.length === 0) {
      cveRows.push([s.displayName, s.version, "—", "—", "—"])
      return
    }
    s.cves.forEach((c) => {
      cveRows.push([s.displayName, s.version, c.id, c.severity.toUpperCase(), c.fixedIn])
    })
  })
  report.dataTable(
    ["Asset", "Version", "CVE", "Severity", "Fixed in"],
    cveRows,
    [34, 22, 36, 22, 32],
    7,
  )

  report.sectionTitle("4. Per-Server Summary")
  servers.forEach((server) => {
    const cves = server.cves
    const outdated = isOutdated(server)
    report.subheading(`${server.displayName} (${server.ip})`)
    report.bullet(`Status: ${server.status.toUpperCase()} · OS: ${server.os} · checked ${server.lastChecked}`)
    report.bullet(
      `Version: ${server.version} → latest ${server.latestVersion} (${outdated ? "outdated" : server.version === "—" ? "unknown" : "up to date"})`,
    )
    if (cves.length === 0) {
      report.bullet("CVEs: none open")
    } else {
      report.bullet(`CVEs: ${cves.map((c) => `${c.id} (${c.severity})`).join(", ")}`)
    }
  })

  report.sectionTitle("5. Fleet Recommendations")
  if (totals.outdated > 0) {
    report.bullet(`Upgrade ${totals.outdated} outdated host(s) to latest stable after change control.`)
  }
  if (totals.vulns > 0) {
    report.bullet("Prioritize hosts with open CVEs; apply distro/vendor patches when available.")
  }
  if (totals.stopped > 0) {
    report.bullet(`Review ${totals.stopped} stopped host(s) and restore service if unexpected.`)
  }
  report.bullet("Re-run fleet SSH check after any package upgrade or config change.")

  report.save(`nginx-fleet-report-${Date.now()}.pdf`)
}
