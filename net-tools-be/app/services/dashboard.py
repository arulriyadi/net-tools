from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.constants import DEFAULT_SERVER_GROUPS
from app.data.nginx_cves import NGINX_STABLE_TARGET
from app.models import CveAssessment, CveAssessmentStatus, Job, JobStatus, JobType, Server
from app.services.version_utils import parse_version, version_lt


async def get_group_options(db: AsyncSession) -> list[str]:
    result = await db.execute(select(Server.group).distinct().order_by(Server.group))
    existing = [row[0] for row in result.all() if row[0]]
    merged = list(DEFAULT_SERVER_GROUPS)
    for g in existing:
        if g not in merged:
            merged.append(g)
    return merged


async def get_nginx_check_stats(
    db: AsyncSession,
    servers: list[Server],
    last_by_server: dict[int, Job],
) -> dict[str, int | str]:
    high_risk_count = sum(
        1
        for job in last_by_server.values()
        if (job.result or {}).get("risk_level") == "high"
    )
    up_to_date_count = sum(
        1
        for job in last_by_server.values()
        if parse_version((job.result or {}).get("nginx_version")) is not None
        and not version_lt((job.result or {}).get("nginx_version"), NGINX_STABLE_TARGET)
    )

    open_cve_count = 0
    servers_with_open_cves: set[int] = set()
    cve_result = await db.execute(
        select(CveAssessment)
        .where(CveAssessment.status == CveAssessmentStatus.SUCCESS)
        .order_by(CveAssessment.created_at.desc())
    )
    seen_servers: set[int] = set()
    for assessment in cve_result.scalars().all():
        if assessment.server_id in seen_servers:
            continue
        seen_servers.add(assessment.server_id)
        open_findings = [
            finding
            for finding in (assessment.cve_findings or [])
            if finding.get("status") == "open"
        ]
        if open_findings:
            servers_with_open_cves.add(assessment.server_id)
        open_cve_count += len(open_findings)

    return {
        "total_servers": len(servers),
        "high_risk_count": high_risk_count,
        "open_cve_count": open_cve_count,
        "open_cve_servers": len(servers_with_open_cves),
        "up_to_date_count": up_to_date_count,
        "stable_target": NGINX_STABLE_TARGET,
    }


async def get_dashboard_data(
    db: AsyncSession,
    *,
    monitored_only: bool = False,
) -> tuple[
    list[Server],
    list[Job],
    dict[int, Job],
    dict[int, Job],
    list[str],
    list[CveAssessment],
    list[Server],
]:
    servers_result = await db.execute(select(Server).order_by(Server.name))
    all_servers = list(servers_result.scalars().all())
    if monitored_only:
        servers = [s for s in all_servers if s.nginx_monitored]
    else:
        servers = all_servers
    available_servers = [s for s in all_servers if not s.nginx_monitored]

    jobs_result = await db.execute(
        select(Job)
        .where(Job.job_type == JobType.NGINX_CHECK)
        .options(selectinload(Job.server))
        .order_by(Job.created_at.desc())
        .limit(20)
    )
    recent_jobs = list(jobs_result.scalars().all())

    last_by_server: dict[int, Job] = {}
    last_job_by_server: dict[int, Job] = {}
    for server in servers:
        latest_any = await db.execute(
            select(Job)
            .where(
                Job.server_id == server.id,
                Job.job_type == JobType.NGINX_CHECK,
            )
            .order_by(Job.created_at.desc())
            .limit(1)
        )
        any_job = latest_any.scalar_one_or_none()
        if any_job:
            last_job_by_server[server.id] = any_job

        latest = await db.execute(
            select(Job)
            .where(
                Job.server_id == server.id,
                Job.job_type == JobType.NGINX_CHECK,
                Job.status == JobStatus.SUCCESS,
            )
            .order_by(Job.created_at.desc())
            .limit(1)
        )
        job = latest.scalar_one_or_none()
        if job:
            last_by_server[server.id] = job

    if monitored_only:
        monitored_ids = {s.id for s in servers}
        recent_jobs = [j for j in recent_jobs if j.server_id in monitored_ids]
        cve_assessments_filter_ids = monitored_ids
    else:
        cve_assessments_filter_ids = None

    group_options = await get_group_options(db)

    cve_result = await db.execute(
        select(CveAssessment)
        .options(selectinload(CveAssessment.server))
        .order_by(CveAssessment.created_at.desc())
        .limit(20)
    )
    cve_assessments = list(cve_result.scalars().all())
    if cve_assessments_filter_ids is not None:
        cve_assessments = [a for a in cve_assessments if a.server_id in cve_assessments_filter_ids]

    return (
        servers,
        recent_jobs,
        last_by_server,
        last_job_by_server,
        group_options,
        cve_assessments,
        available_servers,
    )


async def get_home_overview_data(
    db: AsyncSession,
) -> tuple[
    list[Server],
    dict[int, Job],
    list[Job],
    list[tuple[Server, Job]],
    int,
    int,
    int,
    int,
    dict,
    list[dict],
    int,
    int,
]:
    """Summary data for the app-wide home dashboard."""
    servers_result = await db.execute(select(Server).order_by(Server.name))
    servers = list(servers_result.scalars().all())

    total_checks_result = await db.execute(
        select(func.count())
        .select_from(Job)
        .where(Job.job_type == JobType.NGINX_CHECK, Job.status == JobStatus.SUCCESS)
    )
    total_checks = int(total_checks_result.scalar_one())

    failed_checks_result = await db.execute(
        select(func.count())
        .select_from(Job)
        .where(Job.job_type == JobType.NGINX_CHECK, Job.status == JobStatus.FAILED)
    )
    failed_checks = int(failed_checks_result.scalar_one())

    last_by_server: dict[int, Job] = {}
    high_risk_servers: list[tuple[Server, Job]] = []
    for server in servers:
        latest = await db.execute(
            select(Job)
            .where(
                Job.server_id == server.id,
                Job.job_type == JobType.NGINX_CHECK,
                Job.status == JobStatus.SUCCESS,
            )
            .order_by(Job.created_at.desc())
            .limit(1)
        )
        job = latest.scalar_one_or_none()
        if job:
            last_by_server[server.id] = job
            if (job.result or {}).get("risk_level") == "high":
                high_risk_servers.append((server, job))

    recent_jobs_result = await db.execute(
        select(Job)
        .where(Job.job_type == JobType.NGINX_CHECK)
        .options(selectinload(Job.server))
        .order_by(Job.created_at.desc())
        .limit(8)
    )
    recent_jobs = list(recent_jobs_result.scalars().all())

    open_cve_count = 0
    cve_severity: Counter[str] = Counter()
    cve_result = await db.execute(
        select(CveAssessment)
        .options(selectinload(CveAssessment.server))
        .where(CveAssessment.status == CveAssessmentStatus.SUCCESS)
        .order_by(CveAssessment.created_at.desc())
        .limit(50)
    )
    seen_servers: set[int] = set()
    for assessment in cve_result.scalars().all():
        if assessment.server_id in seen_servers:
            continue
        seen_servers.add(assessment.server_id)
        for finding in assessment.cve_findings or []:
            if finding.get("status") != "open":
                continue
            open_cve_count += 1
            severity = (finding.get("severity") or "UNKNOWN").split("/")[0].strip().upper()
            cve_severity[severity] += 1

    risk_counts: Counter[str] = Counter(
        {"low": 0, "medium": 0, "high": 0, "unknown": 0, "unchecked": 0}
    )
    for server in servers:
        job = last_by_server.get(server.id)
        if not job:
            risk_counts["unchecked"] += 1
            continue
        risk = (job.result or {}).get("risk_level", "unknown")
        if risk in risk_counts:
            risk_counts[risk] += 1
        else:
            risk_counts["unknown"] += 1

    version_counts: Counter[str] = Counter()
    for job in last_by_server.values():
        version = (job.result or {}).get("nginx_version") or "Unknown"
        version_counts[version] += 1

    group_counts: Counter[str] = Counter()
    for server in servers:
        group_counts[server.group or "Other"] += 1

    today = datetime.now(timezone.utc).date()
    day_range = [today - timedelta(days=offset) for offset in range(6, -1, -1)]
    day_labels = [d.strftime("%a %d/%m") for d in day_range]
    activity_start = datetime.combine(day_range[0], datetime.min.time(), tzinfo=timezone.utc)

    activity_jobs_result = await db.execute(
        select(Job).where(
            Job.job_type == JobType.NGINX_CHECK,
            Job.created_at >= activity_start,
        )
    )
    success_by_day = [0] * 7
    failed_by_day = [0] * 7
    for job in activity_jobs_result.scalars().all():
        day_index = (job.created_at.date() - day_range[0]).days
        if not 0 <= day_index < 7:
            continue
        if job.status == JobStatus.SUCCESS:
            success_by_day[day_index] += 1
        elif job.status == JobStatus.FAILED:
            failed_by_day[day_index] += 1

    chart_data = {
        "risk": {
            "labels": ["Low", "Medium", "High", "Unknown", "Unchecked"],
            "values": [
                risk_counts["low"],
                risk_counts["medium"],
                risk_counts["high"],
                risk_counts["unknown"],
                risk_counts["unchecked"],
            ],
        },
        "versions": {
            "labels": list(version_counts.keys()) or ["No data"],
            "values": list(version_counts.values()) or [0],
        },
        "groups": {
            "labels": list(group_counts.keys()) or ["No data"],
            "values": list(group_counts.values()) or [0],
        },
        "activity": {
            "labels": day_labels,
            "success": success_by_day,
            "failed": failed_by_day,
        },
        "checkStatus": {
            "success": total_checks,
            "failed": failed_checks,
        },
        "cveSeverity": {
            "labels": list(cve_severity.keys()) or ["None"],
            "values": list(cve_severity.values()) or [0],
        },
    }

    alerts: list[dict] = []
    for server, job in high_risk_servers:
        version = (job.result or {}).get("nginx_version") or "?"
        alerts.append(
            {
                "level": "high",
                "title": f"High risk nginx — {server.name}",
                "detail": f"nginx {version} · {server.ip}",
                "time": job.created_at.strftime("%Y-%m-%d %H:%M UTC"),
            }
        )

    failed_recent_result = await db.execute(
        select(Job)
        .where(Job.job_type == JobType.NGINX_CHECK, Job.status == JobStatus.FAILED)
        .options(selectinload(Job.server))
        .order_by(Job.created_at.desc())
        .limit(5)
    )
    for job in failed_recent_result.scalars().all():
        server_name = job.server.name if job.server else f"Server #{job.server_id}"
        alerts.append(
            {
                "level": "failed",
                "title": f"Check failed — {server_name}",
                "detail": (job.log or "SSH or nginx check error")[:120],
                "time": job.created_at.strftime("%Y-%m-%d %H:%M UTC"),
            }
        )

    if open_cve_count:
        alerts.append(
            {
                "level": "cve",
                "title": f"{open_cve_count} open CVE finding(s)",
                "detail": "Review CVE assessment log in nginx-ui-management",
                "time": "Latest assessments",
            }
        )

    checked_count = len(last_by_server)
    unchecked_count = len(servers) - checked_count

    return (
        servers,
        last_by_server,
        recent_jobs,
        high_risk_servers,
        total_checks,
        len(high_risk_servers),
        open_cve_count,
        failed_checks,
        chart_data,
        alerts,
        checked_count,
        unchecked_count,
    )
