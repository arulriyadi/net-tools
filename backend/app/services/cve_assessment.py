from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.data.nginx_cves import KNOWN_CVES, NGINX_MAINLINE_TARGET, NGINX_STABLE_TARGET
from app.models import CveAssessment, CveAssessmentStatus, Server
from app.schemas.nginx import NginxCheckResult
from app.services.version_utils import is_ubuntu_backport_patched, version_lt


def _assess_cves(nginx_version: str | None, nginx_package: str | None) -> tuple[list[dict[str, Any]], str, str]:
    findings: list[dict[str, Any]] = []
    open_critical = 0
    open_high = 0
    patched_count = 0

    for cve in KNOWN_CVES:
        cve_id = cve["cve_id"]
        fixed = cve["fixed_stable"]

        if is_ubuntu_backport_patched(cve_id, nginx_package):
            status = "patched"
            patched_count += 1
        elif version_lt(nginx_version, fixed):
            status = "open"
            if "CRITICAL" in cve["severity"] or cve["severity"].startswith("HIGH"):
                open_high += 1
        else:
            status = "not_affected"

        findings.append(
            {
                "cve_id": cve_id,
                "module": cve["module"],
                "severity": cve["severity"],
                "description": cve["description"],
                "status": status,
                "fixed_stable": cve["fixed_stable"],
                "fixed_mainline": cve["fixed_mainline"],
            }
        )

    if open_high > 0:
        overall = "high"
    elif version_lt(nginx_version, NGINX_STABLE_TARGET):
        overall = "medium"
    else:
        overall = "low"

    if version_lt(nginx_version, NGINX_STABLE_TARGET):
        recommendation = (
            f"Upgrade nginx from {nginx_version or 'unknown'} to stable {NGINX_STABLE_TARGET} "
            f"(or mainline {NGINX_MAINLINE_TARGET}) via nginx.org repository. "
            f"Open critical/high CVEs: {open_high}. Patched via Ubuntu backport: {patched_count}."
        )
    else:
        recommendation = "nginx version meets stable target. Continue monitoring security advisories."

    return findings, overall, recommendation


async def run_cve_assessment(
    db: AsyncSession,
    server: Server,
    check_result: NginxCheckResult,
    source_job_id: int | None = None,
) -> CveAssessment:
    assessment = CveAssessment(
        server_id=server.id,
        source_job_id=source_job_id,
        status=CveAssessmentStatus.RUNNING,
        current_version=check_result.nginx_version,
        current_package=check_result.nginx_package,
        target_stable=NGINX_STABLE_TARGET,
        target_mainline=NGINX_MAINLINE_TARGET,
    )
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)

    try:
        findings, overall, recommendation = _assess_cves(
            check_result.nginx_version,
            check_result.nginx_package,
        )
        assessment.status = CveAssessmentStatus.SUCCESS
        assessment.cve_findings = findings
        assessment.overall_risk = overall
        assessment.recommendation = recommendation
        assessment.finished_at = datetime.now(timezone.utc)
    except Exception as exc:
        assessment.status = CveAssessmentStatus.FAILED
        assessment.recommendation = str(exc)
        assessment.finished_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(assessment)
    return assessment
