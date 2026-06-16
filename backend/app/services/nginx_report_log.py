from datetime import datetime

from app.models import Job, JobStatus, JobType
from app.schemas.nginx_report_log import ReportLogEntry, ReportStatusTone
from app.schemas.nginx_security import NginxSecurityScanResult
from app.schemas.nginx_upgrade import NginxUpgradeResult

REPORT_JOB_TYPES = (JobType.NGINX_FORENSIC, JobType.NGINX_UPGRADE)


def _parse_dt(value: datetime | str | None) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    return datetime.now()


def _security_entry(job: Job, payload: dict) -> ReportLogEntry:
    scan = NginxSecurityScanResult.model_validate(payload)
    severity = scan.overall_severity
    tone: ReportStatusTone = "success"
    if severity in ("critical", "high"):
        tone = "danger"
    elif severity in ("medium", "low"):
        tone = "warning"

    findings = len(scan.findings)
    summary = (
        f"{findings} finding{'s' if findings != 1 else ''}"
        if findings
        else "No findings"
    )
    if scan.nginx_ui_exposed:
        summary += " · nginx-ui publicly reachable"
    elif scan.nginx_ui_binds_all and scan.public_ip:
        summary += " · Bind 0.0.0.0, public blocked"
    elif scan.nginx_ui_active is False:
        summary += " · nginx-ui inactive"

    return ReportLogEntry(
        job_id=job.id,
        report_type="security_scan",
        created_at=_parse_dt(scan.scanned_at) if scan.scanned_at else (job.finished_at or job.created_at),
        summary=summary,
        status_label="Clean" if severity == "clean" else severity.capitalize(),
        status_tone=tone,
        pdf_available=job.status == JobStatus.SUCCESS,
        security_scan=scan,
    )


def _upgrade_entry(job: Job, payload: dict) -> ReportLogEntry:
    upgrade = NginxUpgradeResult.model_validate(payload)
    tone: ReportStatusTone = "success" if upgrade.success else "danger"
    prev = upgrade.previous_version or "?"
    new = upgrade.new_version or upgrade.target_version
    summary = f"{prev} → {new} ({upgrade.channel})"
    return ReportLogEntry(
        job_id=job.id,
        report_type="nginx_upgrade",
        created_at=_parse_dt(upgrade.scanned_at) if upgrade.scanned_at else (job.finished_at or job.created_at),
        summary=summary,
        status_label="Success" if upgrade.success else "Failed",
        status_tone=tone,
        pdf_available=job.status == JobStatus.SUCCESS and upgrade.success,
        nginx_upgrade=upgrade,
    )


def job_to_report_log_entry(job: Job) -> ReportLogEntry | None:
    if not job.result or job.job_type not in REPORT_JOB_TYPES:
        return None
    payload = job.result if isinstance(job.result, dict) else {}
    if job.job_type == JobType.NGINX_FORENSIC:
        return _security_entry(job, payload)
    if job.job_type == JobType.NGINX_UPGRADE:
        return _upgrade_entry(job, payload)
    return None
