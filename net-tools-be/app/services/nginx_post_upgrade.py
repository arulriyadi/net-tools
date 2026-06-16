"""Refresh inventory after nginx upgrade (persist check job + CVE assessment)."""

from app.database import SessionLocal
from app.models import JobType, Server
from app.services.cve_assessment import run_cve_assessment
from app.services.jobs import create_running_job, finish_check_job
from app.services.nginx_check import run_nginx_check


async def persist_post_upgrade_check(
    server_id: int,
    *,
    source_job_id: int | None = None,
) -> None:
    """Run nginx check, save NGINX_CHECK job, and refresh CVE assessment for dashboard."""
    async with SessionLocal() as db:
        server = await db.get(Server, server_id)
        if not server:
            return

        check = await run_nginx_check(server)
        check_job = await create_running_job(db, server_id, JobType.NGINX_CHECK)
        check.job_id = check_job.id
        await finish_check_job(db, check_job, check, success=True)
        await run_cve_assessment(
            db,
            server,
            check,
            source_job_id=source_job_id or check_job.id,
        )
