"""Generate PDF report for nginx upgrade job."""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path

from fpdf import FPDF

from app.config import get_settings
from app.models import Job, Server
from app.schemas.nginx_upgrade import NginxUpgradeResult


def _pdf_text(value: str | None) -> str:
    if not value:
        return "-"
    return (
        value.replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2192", "->")
        .encode("ascii", "replace")
        .decode("ascii")
    )


def _fmt_dt(value: datetime | str | None) -> str:
    if not value:
        return "-"
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value[:19]
    return value.strftime("%d %B %Y %H:%M UTC")


class UpgradeReport(FPDF):
    def __init__(self, server_name: str, *, success: bool):
        super().__init__()
        self.server_name = server_name
        self.success = success

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, f"NetTools Nginx Upgrade - {self.server_name}", align="L")
        self.cell(0, 8, f"Page {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Generated {date.today().isoformat()} | Internal / Confidential", align="C")

    def section_title(self, title: str):
        self.ln(1)
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(25, 55, 95)
        self.cell(0, 9, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(25, 55, 95)
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

    def data_table(self, headers: list[str], rows: list[list[str]], col_w: list[float]):
        self.set_font("Helvetica", "B", 8)
        self.set_fill_color(25, 55, 95)
        self.set_text_color(255, 255, 255)
        for i, h in enumerate(headers):
            self.cell(col_w[i], 7, h, border=1, fill=True)
        self.ln()
        self.set_text_color(0, 0, 0)
        self.set_font("Helvetica", "", 8)
        fill = False
        for row in rows:
            self.set_fill_color(245, 248, 252 if fill else 255)
            for i, val in enumerate(row):
                self.cell(col_w[i], 7, _pdf_text(val)[:90], border=1, fill=True)
            self.ln()
            fill = not fill
        self.ln(2)


def generate_upgrade_pdf(job: Job, server: Server) -> Path:
    settings = get_settings()
    settings.reports_dir.mkdir(parents=True, exist_ok=True)

    upgrade = NginxUpgradeResult.model_validate(job.result or {})
    filename = f"nginx-upgrade-{server.name}-job{job.id}.pdf"
    out_path = settings.reports_dir / filename

    pdf = UpgradeReport(server.name, success=upgrade.success)
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    accent = (25, 120, 60) if upgrade.success else (180, 30, 30)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(*accent)
    pdf.ln(6)
    pdf.multi_cell(0, 10, "Nginx Upgrade Report\nNetTools")
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(0, 6, f"Server: {server.name} ({server.ip})", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Job ID: {job.id}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Performed: {_fmt_dt(upgrade.scanned_at)}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Status: {'SUCCESS' if upgrade.success else 'FAILED'}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.section_title("1. Upgrade Summary")
    pdf.body_text(_pdf_text(upgrade.message))
    pdf.data_table(
        ["Field", "Value"],
        [
            ["Channel", upgrade.channel],
            ["Target version", upgrade.target_version],
            ["Previous version", upgrade.previous_version or "-"],
            ["Installed version", upgrade.new_version or "-"],
            ["nginx -t", "PASS" if upgrade.config_test_ok else "FAIL"],
            ["nginx service", "Active" if upgrade.nginx_active else "Inactive"],
        ],
        [55, 125],
    )

    pdf.section_title("2. Post-upgrade verification")
    pdf.bullet("Config backed up under /root/nginx-backup-* before package change")
    pdf.bullet("APT repository switched to nginx.org")
    pdf.bullet("Package held with apt-mark hold nginx")
    pdf.bullet("Re-run NetTools version check and CVE assessment after change window")

    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(
        0,
        4.5,
        "Disclaimer: Upgrade executed via automated SSH workflow. Verify vhosts and reload "
        "behavior in production change record.",
    )

    pdf.output(str(out_path))
    return out_path
