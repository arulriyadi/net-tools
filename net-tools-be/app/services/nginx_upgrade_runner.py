"""Background runner for nginx upgrade jobs with live log streaming."""

from app.database import SessionLocal
from app.models import Job, Server
from app.services.jobs import (
    StreamingJobLog,
    fail_job_by_id,
    finish_upgrade_job_by_id,
)
from app.services.nginx_post_upgrade import persist_post_upgrade_check
from app.services.nginx_upgrade import run_nginx_upgrade
from app.services.ssh import SSHError


async def run_upgrade_job_background(
    job_id: int,
    server_id: int,
    *,
    channel: str,
    target_version: str,
) -> None:
    async with SessionLocal() as db:
        job = await db.get(Job, job_id)
        server = await db.get(Server, server_id)
        if not job or not server:
            return
        server_name = server.name
        server_ip = server.ip

    stream_log = StreamingJobLog(job_id)
    await stream_log.extend(
        [
            f">>> Job #{job_id} — nginx upgrade on {server_name} ({server_ip})",
            f">>> Target: {channel} {target_version}",
        ],
    )
    await stream_log.flush()
    stream_log.start_background_flush()

    async def on_line(line: str) -> None:
        await stream_log.append(line)

    try:
        async with SessionLocal() as db:
            server = await db.get(Server, server_id)
            if not server:
                return

            result = await run_nginx_upgrade(
                server,
                channel=channel,
                target_version=target_version,
                on_log_line=on_line,
            )
            result.job_id = job_id

        if result.success:
            await stream_log.append(">>> Upgrade finished successfully")
        else:
            await stream_log.append(f">>> Upgrade failed: {result.message}")

        if result.success:
            try:
                await persist_post_upgrade_check(server_id, source_job_id=job_id)
                await stream_log.append(">>> Dashboard inventory refreshed (check + CVE)")
            except Exception as exc:
                await stream_log.append(f">>> Post-upgrade inventory refresh failed: {exc}")

        final_log = await stream_log.stop()
        await finish_upgrade_job_by_id(
            job_id,
            result,
            success=result.success,
            error_log=final_log if not result.success else None,
        )
    except SSHError as exc:
        final_log = await stream_log.stop()
        final_log = f"{final_log}\n>>> SSH error: {exc}"
        await fail_job_by_id(job_id, str(exc), log=final_log)
    except Exception as exc:
        final_log = await stream_log.stop()
        final_log = f"{final_log}\n>>> Unexpected error: {exc}"
        await fail_job_by_id(job_id, str(exc), log=final_log)
