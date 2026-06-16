"""Generate CVE assessment PDF (per-server), styled like the PPDB/SekolahMaung report."""

from datetime import date, datetime
from pathlib import Path
from typing import Any

from fpdf import FPDF

from app.config import get_settings
from app.data.nginx_cves import KNOWN_CVES, NGINX_MAINLINE_TARGET, NGINX_STABLE_TARGET
from app.models import CveAssessment, Job, Server

CVE_REFERENCES = [
    "https://nvd.nist.gov/vuln/detail/CVE-2026-42945",
    "https://www.cve.org/CVERecord?id=CVE-2026-9256",
    "https://ubuntu.com/security/notices/USN-8271-1",
    "https://my.f5.com/manage/s/article/K000161019",
    "https://my.f5.com/manage/s/article/K000161377",
    "https://nginx.org/en/CHANGES",
]

CVE_DETAIL_BLOCKS: dict[str, dict[str, str]] = {
    "CVE-2026-42945": {
        "title": "CVE-2026-42945",
        "severity": "CVSS 3.1 8.1 HIGH | CVSS 4.0 9.2 CRITICAL",
        "trigger": (
            "rewrite directive followed by rewrite/if/set, with unnamed PCRE capture "
            "($1, $2) and replacement string containing question mark (?)"
        ),
        "impact": "worker crash/restart; potential RCE if ASLR disabled or bypassed",
    },
    "CVE-2026-9256": {
        "title": "CVE-2026-9256",
        "severity": "CVSS 3.1 8.1 HIGH | CVSS 4.0 9.2 CRITICAL",
        "trigger": (
            "rewrite with overlapping PCRE captures (e.g. ^/((.*))$) and replacement "
            "referencing multiple captures (e.g. $1$2) in redirect/args context"
        ),
        "impact": "worker crash/restart; potential RCE if ASLR disabled or bypassed",
    },
    "CVE-2026-27651": {
        "title": "CVE-2026-27651",
        "severity": "MEDIUM",
        "trigger": "mail auth HTTP module processing crafted requests",
        "impact": "process crash in mail auth module",
    },
}

STATUS_LABEL = {
    "open": "OPEN",
    "patched": "PASS",
    "not_affected": "N/A",
}


class CveAssessmentReport(FPDF):
    def __init__(self, server_name: str):
        super().__init__()
        self.server_name = server_name

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, f"CVE Assessment - {self.server_name}", align="L")
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

    def bullet(self, text: str):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10)
        self.multi_cell(0, 5.5, f"  -  {text}")
        self.ln(0.5)

    def status_bullet(self, label: str, status: str, detail: str = ""):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", 10)
        self.cell(52, 5.5, f"  [{status}]")
        self.set_font("Helvetica", "", 10)
        text = label if not detail else f"{label} - {detail}"
        self.multi_cell(0, 5.5, text)
        self.ln(0.5)

    def ensure_space(self, height_mm: float) -> None:
        bottom = self.h - self.b_margin
        if self.get_y() + height_mm > bottom:
            self.add_page()

    def data_table(self, headers: list[str], rows: list[list[str]], col_w: list[float], row_h: float = 7):
        self.set_font("Helvetica", "B", 8)
        self.set_fill_color(25, 55, 95)
        self.set_text_color(255, 255, 255)
        for i, h in enumerate(headers):
            w = col_w[i] if i < len(col_w) else col_w[-1]
            self.cell(w, row_h, h, border=1, fill=True)
        self.ln()
        self.set_text_color(0, 0, 0)
        self.set_font("Helvetica", "", 8)
        fill = False
        for row in rows:
            self.set_fill_color(245, 248, 252 if fill else 255)
            for i, val in enumerate(row):
                w = col_w[i] if i < len(col_w) else col_w[-1]
                self.cell(w, row_h, val[:90], border=1, fill=True)
            self.ln()
            fill = not fill
        self.ln(2)


def _fmt_dt(dt: datetime | None) -> str:
    if not dt:
        return "-"
    return dt.strftime("%d %B %Y %H:%M UTC")


def _findings_by_id(findings: list[dict[str, Any]] | None) -> dict[str, dict[str, Any]]:
    if not findings:
        return {}
    return {f["cve_id"]: f for f in findings if f.get("cve_id")}


def _executive_summary(
    assessment: CveAssessment,
    findings: list[dict[str, Any]],
) -> str:
    open_cves = [f for f in findings if f.get("status") == "open"]
    patched = [f for f in findings if f.get("status") == "patched"]
    current = assessment.current_version or "unknown"
    pkg = assessment.current_package or "unknown package"

    parts = [
        f"Automated CVE assessment for {current} ({pkg}). "
        f"Compared against upstream stable {assessment.target_stable} "
        f"and mainline {assessment.target_mainline}.",
    ]
    if open_cves:
        ids = ", ".join(f["cve_id"] for f in open_cves)
        parts.append(f"Open vulnerabilities: {len(open_cves)} ({ids}).")
    else:
        parts.append("No open critical/high CVEs detected against the knowledge base.")
    if patched:
        ids = ", ".join(f["cve_id"] for f in patched)
        parts.append(f"Patched via Ubuntu backport: {len(patched)} ({ids}).")
    parts.append(f"Overall risk: {assessment.overall_risk.upper()}.")
    return " ".join(parts)


def generate_cve_assessment_pdf(
    assessment: CveAssessment,
    server: Server,
    source_job: Job | None = None,
) -> Path:
    settings = get_settings()
    settings.reports_dir.mkdir(parents=True, exist_ok=True)

    filename = f"cve-assessment-{server.name}-assess{assessment.id}.pdf"
    out_path = settings.reports_dir / filename

    findings = list(assessment.cve_findings or [])
    by_id = _findings_by_id(findings)
    job_result = (source_job.result or {}) if source_job else {}

    pdf = CveAssessmentReport(server.name)
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    # Cover
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(25, 55, 95)
    pdf.ln(12)
    pdf.multi_cell(0, 12, "Security Assessment Report\nNGINX CVE Assessment")
    pdf.ln(6)
    pdf.set_font("Helvetica", "", 14)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(0, 8, server.name, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(8)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 7, f"Report Date: {_fmt_dt(assessment.finished_at or assessment.created_at)}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Assessment ID: {assessment.id}", new_x="LMARGIN", new_y="NEXT")
    if assessment.source_job_id:
        pdf.cell(0, 7, f"Source check job: #{assessment.source_job_id}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Overall risk: {assessment.overall_risk.upper()}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(8)

    pdf.set_fill_color(240, 245, 250)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 8, "  CVE References", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    pdf.ln(2)
    for ref in CVE_REFERENCES[:2]:
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(0, 5, ref)

    # 1. Executive Summary
    pdf.section_title("1. Executive Summary")
    pdf.body_text(_executive_summary(assessment, findings))
    if assessment.recommendation:
        pdf.body_text(f"Recommendation: {assessment.recommendation}")

    # 2. CVE Details
    pdf.section_title("2. CVE Details")
    for cve in KNOWN_CVES:
        cve_id = cve["cve_id"]
        block = CVE_DETAIL_BLOCKS.get(cve_id, {})
        finding = by_id.get(cve_id, {})
        status = finding.get("status", "unknown")

        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 7, cve_id, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)
        pdf.bullet(f"Module: {cve['module']}")
        pdf.bullet(f"Severity: {block.get('severity', cve['severity'])}")
        pdf.bullet(f"Description: {cve['description']}")
        if block.get("trigger"):
            pdf.bullet(f"Trigger: {block['trigger']}")
        if block.get("impact"):
            pdf.bullet(f"Impact: {block['impact']}")
        pdf.bullet(f"Fixed upstream (stable): {cve['fixed_stable']} | mainline: {cve['fixed_mainline']}")
        status_text = {
            "open": "OPEN - not patched on this host",
            "patched": "PATCHED via Ubuntu backport",
            "not_affected": "NOT AFFECTED at current version",
        }.get(status, status.upper())
        pdf.bullet(f"Status on this server: {status_text}")
        pdf.ln(1)

    pdf.ensure_space(55)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "Which NGINX versions are affected? (F5 Advisory)", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)
    pdf.data_table(
        ["CVE", "Severity (F5)", "Affected upstream versions (F5)"],
        [
            [c["cve_id"], c["severity"], c["affected_branches"]]
            for c in KNOWN_CVES
            if "rewrite" in c["module"]
        ],
        [38, 38, 114],
    )

    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "Upstream fixed versions (F5 / nginx.org)", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)
    pdf.data_table(
        ["Product", "Fixed version"],
        [
            ["NGINX Open Source (stable)", NGINX_STABLE_TARGET],
            ["NGINX Open Source (mainline)", NGINX_MAINLINE_TARGET],
            ["NGINX Plus", "R37 P1, R36 P5, R32 P7"],
        ],
        [95, 95],
    )

    # 3. Version info
    pdf.ensure_space(50)
    pdf.section_title("3. NGINX Version & Release Information")
    pdf.body_text(
        f"This server reports nginx/{assessment.current_version or '-'} "
        f"packaged as {assessment.current_package or '-'}."
    )
    if job_result.get("os_version"):
        pdf.bullet(f"OS: {job_result['os_version']}")
    pdf.bullet(f"Current version: {assessment.current_version or '-'}")
    pdf.bullet(f"Package: {assessment.current_package or '-'}")
    pdf.bullet(f"Target stable: {assessment.target_stable}")
    pdf.bullet(f"Target mainline: {assessment.target_mainline}")

    # 4. CVE findings table
    pdf.ensure_space(45)
    pdf.section_title("4. CVE Findings on This Server")
    pdf.data_table(
        ["CVE ID", "Module", "Severity", "Status", "Fix (stable)"],
        [
            [
                f.get("cve_id", "-"),
                f.get("module", "-"),
                f.get("severity", "-"),
                f.get("status", "-").upper(),
                f.get("fixed_stable", "-"),
            ]
            for f in findings
        ],
        [32, 42, 28, 22, 28],
    )

    # 5. Server inventory
    pdf.ensure_space(40)
    pdf.section_title("5. Server Information")
    pdf.data_table(
        ["Field", "Value"],
        [
            ["VM Name", server.name],
            ["Hostname", job_result.get("hostname") or server.hostname],
            ["Private IP", server.ip],
            ["Group", server.group],
            ["nginx version", str(assessment.current_version or "-")],
            ["Package", str(assessment.current_package or "-")],
        ],
        [50, 140],
    )

    # 6. Assessment results from source check
    pdf.section_title("6. Source Check Summary")
    if job_result:
        pdf.status_bullet(
            "Version verification",
            "PASS" if assessment.current_version else "WARN",
            f"nginx/{assessment.current_version} ({assessment.current_package})",
        )
        for f in findings:
            label = f"Patch: {f.get('cve_id', 'CVE')}"
            pdf.status_bullet(label, STATUS_LABEL.get(f.get("status", ""), "INFO"), f.get("description", "")[:80])
        checks = job_result.get("checks") or []
        for item in checks:
            pdf.status_bullet(
                item.get("label", "check"),
                item.get("status", "unknown").upper(),
                item.get("detail", ""),
            )
    else:
        pdf.body_text("No linked nginx check job. Assessment based on version comparison only.")

    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "Overall risk assessment", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    open_count = sum(1 for f in findings if f.get("status") == "open")
    pdf.bullet(f"Version-based risk: {assessment.overall_risk.upper()}")
    pdf.bullet(f"Open CVEs in knowledge base: {open_count}")
    if assessment.recommendation:
        pdf.bullet(f"Action: {assessment.recommendation[:200]}")

    # 7. Upgrade recommendations
    pdf.ensure_space(60)
    pdf.section_title("7. Upgrade Recommendations")
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "Recommended path", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    if open_count > 0 or (assessment.current_version and assessment.current_version < assessment.target_stable):
        pdf.bullet(
            f"Upgrade nginx to stable {assessment.target_stable} "
            f"(or mainline {assessment.target_mainline}) via nginx.org repository "
            "with approved change control"
        )
        pdf.bullet("Hold package after upgrade: apt-mark hold nginx")
        pdf.bullet("Re-run NetTools check and CVE assessment after upgrade")
    else:
        pdf.bullet("Continue monitoring Ubuntu USN and F5/nginx.org security advisories")
        pdf.bullet("Re-assess after any nginx package update or config change")
    pdf.ln(1)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "Upstream fixed versions (reference)", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.bullet(f"NGINX Open Source stable: {NGINX_STABLE_TARGET}")
    pdf.bullet(f"NGINX Open Source mainline: {NGINX_MAINLINE_TARGET}")

    # 8. References
    pdf.section_title("8. References")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(0, 70, 140)
    for ref in CVE_REFERENCES:
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(0, 5, ref, link=ref)
    pdf.set_text_color(0, 0, 0)

    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(80, 80, 80)
    pdf.multi_cell(
        0,
        5,
        f"Disclaimer: Assessment #{assessment.id} generated by NetTools from automated "
        f"version/CVE comparison. Triggered after nginx check job "
        f"#{assessment.source_job_id or 'n/a'}. Re-validate after package updates.",
    )

    pdf.output(out_path)
    return out_path
