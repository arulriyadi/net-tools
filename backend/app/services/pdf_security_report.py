"""Generate PDF report for nginx security (forensic) scan."""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path
from typing import Any

from fpdf import FPDF

from app.config import get_settings
from app.models import Job, Server
from app.schemas.nginx_security import NginxSecurityScanResult

SOURCE_LABELS = {
    "config": "Config",
    "log": "Logs",
    "database": "Database",
    "network": "Network",
}

AREA_STATUS_LABEL = {
    "clean": "CLEAN",
    "warning": "REVIEW",
    "critical": "ISSUE",
    "skipped": "SKIPPED",
}

MAX_FINDINGS_PER_SOURCE = 25
MAX_TIMELINE_ROWS = 30


def _pdf_text(value: str | None) -> str:
    if not value:
        return "-"
    return (
        value.replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2192", "->")
        .replace("\u2022", "-")
        .encode("ascii", "replace")
        .decode("ascii")
    )


class SecurityReport(FPDF):
    def __init__(self, server_name: str, *, incident: bool = False):
        super().__init__()
        self.server_name = server_name
        self.incident = incident

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, f"NetTools Security Check - {self.server_name}", align="L")
        self.cell(0, 8, f"Page {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Generated {date.today().isoformat()} | Internal / Confidential", align="C")

    def ensure_space(self, height_mm: float) -> None:
        if self.get_y() + height_mm > self.h - self.b_margin:
            self.add_page()

    def section_title(self, title: str, *, red: bool = False):
        self.ensure_space(18)
        self.ln(1)
        color = (180, 30, 30) if red or self.incident else (25, 55, 95)
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(*color)
        self.cell(0, 9, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*color)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(3)
        self.set_text_color(0, 0, 0)

    def body_text(self, text: str):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bullet(self, text: str):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10)
        self.multi_cell(0, 5.5, f"  -  {text}")
        self.ln(0.5)

    def mono_block(self, text: str, *, danger: bool = False, size: float = 7.5):
        lines = text.strip().split("\n") or ["—"]
        self.ensure_space(len(lines) * 4.2 + 8)
        self.set_x(self.l_margin)
        self.set_font("Courier", "", size)
        if danger:
            self.set_fill_color(252, 245, 245)
        else:
            self.set_fill_color(245, 248, 252)
        for line in lines:
            self.cell(0, 4.2, f"  {line[:120]}", fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(3)
        self.set_font("Helvetica", "", 10)

    def data_table(self, headers: list[str], rows: list[list[str]], col_w: list[float], row_h: float = 7):
        if not rows:
            self.body_text("No data.")
            return
        total_h = (1 + min(len(rows), 40)) * row_h + 6
        self.ensure_space(total_h)
        self.set_font("Helvetica", "B", 8)
        self.set_fill_color(25, 55, 95)
        self.set_text_color(255, 255, 255)
        for i, h in enumerate(headers):
            self.cell(col_w[i], row_h, h, border=1, fill=True)
        self.ln()
        self.set_text_color(0, 0, 0)
        self.set_font("Helvetica", "", 7.5)
        fill = False
        for row in rows:
            self.set_fill_color(245, 248, 252 if fill else 255)
            for i, val in enumerate(row):
                self.cell(col_w[i], row_h, _pdf_text(val)[:90], border=1, fill=True)
            self.ln()
            fill = not fill
        self.ln(2)


def _fmt_dt(value: datetime | str | None) -> str:
    if not value:
        return "-"
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value[:19]
    return value.strftime("%d %B %Y %H:%M UTC")


def _parse_scan(job: Job) -> NginxSecurityScanResult:
    return NginxSecurityScanResult.model_validate(job.result or {})


def _executive_summary(scan: NginxSecurityScanResult, server: Server) -> str:
    count = len(scan.findings)
    severity = scan.overall_severity.upper()
    if count == 0:
        return (
            f"Security scan on {server.name} ({server.ip}) completed with overall severity {severity}. "
            f"No malicious patterns were detected across nginx config, logs, nginx-ui database, "
            f"and network exposure checks. Continue periodic re-scan after config changes."
        )

    categories = sorted({f.category for f in scan.findings})
    primary = categories[0].replace("_", " ")
    vector = "nginx-ui panel activity" if any(f.source == "log" for f in scan.findings) else "config tampering"
    if any(f.category == "malicious_redirect" for f in scan.findings):
        vector = "unauthorized nginx redirect in vhost config"

    return (
        f"Forensic analysis on {server.name} ({server.ip}) detected {count} security finding(s) "
        f"with overall severity {severity}. Primary concern: {primary}. "
        f"Scan completed at {_fmt_dt(scan.scanned_at)}. Likely vector: {vector}. "
        f"Review findings by source (config, logs, database, network) and timeline below before remediation."
    )


def _group_findings(scan: NginxSecurityScanResult) -> dict[str, list[Any]]:
    grouped: dict[str, list[Any]] = {}
    for finding in scan.findings:
        grouped.setdefault(finding.source, []).append(finding)
    return grouped


def generate_security_pdf(job: Job, server: Server) -> Path:
    settings = get_settings()
    settings.reports_dir.mkdir(parents=True, exist_ok=True)

    scan = _parse_scan(job)
    incident = scan.overall_severity in ("critical", "high")
    filename = f"nginx-security-{server.name}-job{job.id}.pdf"
    out_path = settings.reports_dir / filename

    pdf = SecurityReport(server.name, incident=incident)
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    title_color = (180, 30, 30) if incident else (25, 55, 95)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(*title_color)
    pdf.ln(6)
    pdf.multi_cell(0, 10, "Security Check Report\nNginx Forensic Scan")
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(0, 6, f"Server: {server.name} ({server.ip})", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Scan job: #{job.id}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Scanned: {_fmt_dt(scan.scanned_at)}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Overall severity: {scan.overall_severity.upper()}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Findings: {len(scan.findings)}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.section_title("1. Executive Summary", red=incident)
    pdf.body_text(_pdf_text(_executive_summary(scan, server)))

    pdf.section_title("2. Server & Environment")
    pdf.data_table(
        ["Field", "Value"],
        [
            ["VM Name", server.name],
            ["Hostname", scan.hostname or server.hostname or "-"],
            ["Private IP", scan.private_ip],
            ["Public IP", scan.public_ip or "-"],
            ["Nginx version", scan.nginx_version or "-"],
            ["nginx-ui active", "Yes" if scan.nginx_ui_active else "No"],
            ["nginx-ui port", str(scan.nginx_ui_port or 9000)],
            ["Public exposure", "Yes" if scan.nginx_ui_exposed else "No"],
        ],
        [55, 125],
    )
    if scan.nginx_ui_public_probe:
        pdf.body_text("Public reachability probe:")
        pdf.mono_block(_pdf_text(scan.nginx_ui_public_probe))

    pdf.section_title("3. Scan Coverage")
    area_rows = [
        [
            area.label,
            AREA_STATUS_LABEL.get(area.status, area.status.upper()),
            _pdf_text(area.summary)[:100],
        ]
        for area in scan.scan_areas
    ]
    pdf.data_table(["Area", "Status", "Summary"], area_rows, [45, 25, 110])
    for area in scan.scan_areas:
        if area.checks_run:
            pdf.set_font("Helvetica", "B", 9)
            pdf.cell(0, 5, area.label, new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "", 8)
            for check in area.checks_run:
                pdf.cell(0, 4.5, f"    - {_pdf_text(check)}", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(2)

    pdf.section_title("4. Findings", red=incident and len(scan.findings) > 0)
    if not scan.findings:
        pdf.body_text("No malicious or suspicious patterns detected.")
    else:
        grouped = _group_findings(scan)
        for source in ("config", "log", "database", "network"):
            items = grouped.get(source, [])
            if not items:
                continue
            label = SOURCE_LABELS.get(source, source)
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(0, 6, f"{label} ({len(items)} finding(s))", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(1)
            shown = items[:MAX_FINDINGS_PER_SOURCE]
            rows = [
                [
                    f.severity.upper(),
                    f.category,
                    _pdf_text(f.file_path)[:40],
                    _pdf_text(f.matched_line)[:55],
                ]
                for f in shown
            ]
            pdf.data_table(["Sev", "Category", "Location", "Matched"], rows, [14, 38, 48, 80], row_h=6)
            if len(items) > MAX_FINDINGS_PER_SOURCE:
                pdf.body_text(f"Showing {MAX_FINDINGS_PER_SOURCE} of {len(items)} {label.lower()} findings.")

    pdf.section_title("5. Timeline of Events")
    timeline = scan.timeline[:MAX_TIMELINE_ROWS]
    if timeline:
        pdf.data_table(
            ["Time", "Event", "Source IP", "Source"],
            [
                [
                    _pdf_text(e.timestamp_wib)[:20],
                    _pdf_text(e.event)[:45],
                    e.source_ip or "-",
                    _pdf_text(e.source)[:20],
                ]
                for e in timeline
            ],
            [32, 68, 28, 52],
            row_h=6,
        )
        if len(scan.timeline) > MAX_TIMELINE_ROWS:
            pdf.body_text(f"Showing {MAX_TIMELINE_ROWS} of {len(scan.timeline)} timeline events.")
    else:
        pdf.body_text("No timeline events collected.")

    pdf.section_title("6. Recommended Actions")
    if scan.recommendations:
        for rec in scan.recommendations:
            tag = "URGENT" if rec.priority == "urgent" else "FOLLOW-UP"
            pdf.bullet(_pdf_text(f"[{tag}] {rec.text}"))
    else:
        pdf.bullet("No recommendations — scan is clean.")

    pdf.section_title("7. Verification Commands", red=False)
    pdf.mono_block(
        "\n".join(
            [
                f"grep -rnE 't\\.me|telegram|return 301' /etc/nginx/",
                f"grep nginx-ui /var/log/syslog | tail -50",
                f"sqlite3 /usr/local/etc/nginx-ui/database.db \"SELECT id,name,created_at FROM users\"",
                f"curl -sI http://{scan.public_ip or 'PUBLIC_IP'}:{scan.nginx_ui_port or 9000}/",
            ]
        )
    )

    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(
        0,
        4.5,
        "Disclaimer: This report was generated from read-only SSH forensic collection. "
        "No configuration changes were made on the target server. "
        "Findings require human verification before remediation.",
    )

    pdf.output(str(out_path))
    return out_path
