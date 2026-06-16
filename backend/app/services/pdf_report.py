"""Generate PDF report for nginx check job."""

from datetime import date, datetime
from pathlib import Path

from fpdf import FPDF

from app.config import get_settings
from app.models import Job, Server


class CheckReport(FPDF):
    def __init__(self, server_name: str):
        super().__init__()
        self.server_name = server_name

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, f"NetTools Nginx Check - {self.server_name}", align="L")
        self.cell(0, 8, f"Page {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Generated {date.today().isoformat()} | NetTools Internal", align="C")

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

    def status_line(self, label: str, status: str, detail: str = ""):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", 10)
        self.cell(52, 5.5, f"  [{status.upper()}]")
        self.set_font("Helvetica", "", 10)
        text = label if not detail else f"{label} - {detail}"
        self.multi_cell(0, 5.5, text)
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
                self.cell(col_w[i], 7, val[:80], border=1, fill=True)
            self.ln()
            fill = not fill
        self.ln(2)


def _fmt_dt(dt: datetime | None) -> str:
    if not dt:
        return "-"
    return dt.strftime("%d %B %Y %H:%M UTC")


def generate_check_pdf(job: Job, server: Server) -> Path:
    settings = get_settings()
    settings.reports_dir.mkdir(parents=True, exist_ok=True)

    result = job.result or {}
    filename = f"nginx-check-{server.name}-job{job.id}.pdf"
    out_path = settings.reports_dir / filename

    pdf = CheckReport(server.name)
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(25, 55, 95)
    pdf.ln(10)
    pdf.multi_cell(0, 12, "NGINX Check Report\nNetTools")
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(0, 8, server.name, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 7, f"Job ID: {job.id}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Check time: {_fmt_dt(job.finished_at or job.created_at)}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Status: {job.status.value.upper()}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Risk level: {str(result.get('risk_level', 'unknown')).upper()}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(8)

    pdf.section_title("1. Server Information")
    pdf.data_table(
        ["Field", "Value"],
        [
            ["VM Name", server.name],
            ["Hostname", result.get("hostname") or server.hostname],
            ["Private IP", server.ip],
            ["Group", server.group],
            ["SSH User", server.ssh_user],
        ],
        [50, 140],
    )

    pdf.section_title("2. NGINX Status")
    pdf.data_table(
        ["Item", "Value"],
        [
            ["OS", str(result.get("os_version") or "-")],
            ["nginx version", str(result.get("nginx_version") or "-")],
            ["Package", str(result.get("nginx_package") or "-")],
            ["nginx service", "active" if result.get("nginx_active") else "inactive"],
            ["nginx-ui service", "active" if result.get("nginx_ui_active") else "inactive"],
            ["Config test", "OK" if result.get("config_test_ok") else "FAIL"],
        ],
        [55, 135],
    )

    pdf.section_title("3. Check Results")
    checks = result.get("checks") or []
    if checks:
        for item in checks:
            pdf.status_line(
                item.get("label", "check"),
                item.get("status", "unknown"),
                item.get("detail", ""),
            )
    else:
        pdf.body_text("No structured check results available.")

    if result.get("config_test_output"):
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 6, "nginx -t output", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Courier", "", 8)
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(0, 4.5, str(result.get("config_test_output"))[:1500])

    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(80, 80, 80)
    pdf.multi_cell(
        0,
        5,
        "Disclaimer: Read-only check performed via SSH. This report reflects the state "
        f"at check time (Job #{job.id}).",
    )

    pdf.output(out_path)
    return out_path
