from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Job, JobStatus, JobType, NginxUiConnection, Server
from app.schemas.job import JobRead
from app.schemas.server import ServerRead
from app.schemas.nginx import NginxCheckResult
from app.schemas.nginx_security import NginxSecurityScanResult
from app.schemas.nginx_report_log import ReportLogEntry
from app.schemas.nginx_upgrade import NginxUpgradeRequest, NginxUpgradeStarted
from app.schemas.nginx_ui import (
    NginxMonitorRead,
    NginxUiConnectionCreate,
    NginxUiConnectionRead,
    NginxUiConnectionUpdate,
)
from app.schemas.nginx_ui_certificate import NginxUiCertificateRead
from app.schemas.nginx_ui_metrics import NginxUiMetricsRead
from app.schemas.nginx_ui_metrics_history import (
    NginxUiMetricHistoryRead,
    NginxUiMetricsSettingsRead,
    NginxUiMetricsSettingsUpdate,
)
from app.schemas.nginx_ui_site import NginxUiSiteRead
from app.services.credentials import decrypt_secret, encrypt_secret
from app.services.cve_assessment import run_cve_assessment
from app.services.jobs import (
    create_running_job,
    fail_job,
    finish_check_job,
    finish_forensic_job,
)
from app.services.nginx_check import run_nginx_check
from app.services.nginx_forensic_collector import run_nginx_security_scan
from app.services.nginx_report_log import REPORT_JOB_TYPES, job_to_report_log_entry
from app.services.nginx_upgrade import validate_upgrade_request
from app.services.nginx_upgrade_runner import run_upgrade_job_background
from app.services.nginx_ui_client import NginxUiApiError, verify_connection
from app.services.nginx_ui_certificates import list_certificates_for_server
from app.services.nginx_ui_metrics import (
    collect_and_store_metrics,
    get_latest_metrics,
    get_metrics_history,
    get_metrics_settings,
    update_metrics_settings,
)
from app.services.nginx_ui_sites import list_sites_for_server
from app.services.pdf_report import generate_check_pdf
from app.services.pdf_security_report import generate_security_pdf
from app.services.pdf_upgrade_report import generate_upgrade_pdf
from app.services.ssh import SSHError

router = APIRouter(prefix="/api/nginx", tags=["nginx"])


def _to_monitor_read(server: Server) -> NginxMonitorRead:
    conn = server.nginx_ui_connection
    return NginxMonitorRead(
        id=server.id,
        name=server.name,
        hostname=server.hostname,
        ip=server.ip,
        group=server.group,
        ssh_user=server.ssh_user,
        ssh_key_path=server.ssh_key_path,
        notes=server.notes,
        nginx_monitored=server.nginx_monitored,
        created_at=server.created_at,
        updated_at=server.updated_at,
        nginx_ui=NginxUiConnectionRead.model_validate(conn) if conn else None,
    )


async def _get_monitored_servers(db: AsyncSession) -> list[Server]:
    result = await db.execute(
        select(Server)
        .where(Server.nginx_monitored.is_(True))
        .options(selectinload(Server.nginx_ui_connection))
        .order_by(Server.name)
    )
    return list(result.scalars().all())


@router.get("/monitors", response_model=list[NginxMonitorRead])
async def list_monitored_servers(db: AsyncSession = Depends(get_db)) -> list[NginxMonitorRead]:
    servers = await _get_monitored_servers(db)
    return [_to_monitor_read(server) for server in servers]


@router.get("/monitors/available", response_model=list[ServerRead])
async def list_available_for_monitor(db: AsyncSession = Depends(get_db)) -> list[ServerRead]:
    result = await db.execute(
        select(Server).where(Server.nginx_monitored.is_(False)).order_by(Server.name)
    )
    return list(result.scalars().all())


@router.post("/monitors", response_model=NginxMonitorRead, status_code=201)
async def add_monitor(
    payload: NginxUiConnectionCreate,
    db: AsyncSession = Depends(get_db),
) -> NginxMonitorRead:
    server = await db.get(Server, payload.server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    if server.nginx_monitored:
        raise HTTPException(status_code=400, detail="Server is already monitored")

    panel_url = (payload.panel_url or f"http://{server.ip}:9000").rstrip("/")

    try:
        await verify_connection(panel_url, payload.username, payload.password)
    except NginxUiApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    connection = NginxUiConnection(
        server_id=server.id,
        panel_url=panel_url,
        username=payload.username.strip(),
        password_encrypted=encrypt_secret(payload.password),
        api_connected=True,
        last_login_at=datetime.now(timezone.utc),
        last_error=None,
    )
    server.nginx_monitored = True
    db.add(connection)
    await db.commit()
    await db.refresh(server)
    await db.refresh(connection)

    return NginxMonitorRead(
        id=server.id,
        name=server.name,
        hostname=server.hostname,
        ip=server.ip,
        group=server.group,
        ssh_user=server.ssh_user,
        ssh_key_path=server.ssh_key_path,
        notes=server.notes,
        nginx_monitored=server.nginx_monitored,
        created_at=server.created_at,
        updated_at=server.updated_at,
        nginx_ui=NginxUiConnectionRead.model_validate(connection),
    )


@router.patch("/monitors/{server_id}", response_model=NginxMonitorRead)
async def update_monitor(
    server_id: int,
    payload: NginxUiConnectionUpdate,
    db: AsyncSession = Depends(get_db),
) -> NginxMonitorRead:
    server = await db.get(
        Server,
        server_id,
        options=(selectinload(Server.nginx_ui_connection),),
    )
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    if not server.nginx_monitored or not server.nginx_ui_connection:
        raise HTTPException(status_code=404, detail="nginx-ui connection not found")

    connection = server.nginx_ui_connection
    panel_url = (payload.panel_url or connection.panel_url).rstrip("/")
    username = (payload.username or connection.username).strip()
    password = payload.password or decrypt_secret(connection.password_encrypted)

    try:
        await verify_connection(panel_url, username, password)
    except NginxUiApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    connection.panel_url = panel_url
    connection.username = username
    if payload.password:
        connection.password_encrypted = encrypt_secret(payload.password)
    connection.api_connected = True
    connection.last_login_at = datetime.now(timezone.utc)
    connection.last_error = None
    await db.commit()
    await db.refresh(server)
    await db.refresh(connection)

    return _to_monitor_read(server)


@router.get("/monitors/{server_id}/sites", response_model=list[NginxUiSiteRead])
async def get_monitor_sites(server_id: int, db: AsyncSession = Depends(get_db)) -> list[NginxUiSiteRead]:
    try:
        return await list_sites_for_server(db, server_id)
    except NginxUiApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/monitors/{server_id}/certificates", response_model=list[NginxUiCertificateRead])
async def get_monitor_certificates(
    server_id: int,
    db: AsyncSession = Depends(get_db),
) -> list[NginxUiCertificateRead]:
    try:
        return await list_certificates_for_server(db, server_id)
    except NginxUiApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/monitors/{server_id}/metrics", response_model=NginxUiMetricsRead)
async def get_monitor_metrics(server_id: int, db: AsyncSession = Depends(get_db)) -> NginxUiMetricsRead:
    try:
        return await collect_and_store_metrics(db, server_id)
    except NginxUiApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/monitors/{server_id}/metrics/latest", response_model=NginxUiMetricsRead)
async def get_monitor_metrics_latest(
    server_id: int,
    db: AsyncSession = Depends(get_db),
) -> NginxUiMetricsRead:
    try:
        latest = await get_latest_metrics(db, server_id)
        if latest:
            return latest
        return await collect_and_store_metrics(db, server_id)
    except NginxUiApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/monitors/{server_id}/metrics/history", response_model=NginxUiMetricHistoryRead)
async def get_monitor_metrics_history(
    server_id: int,
    range: str = Query(default="24h", pattern="^(1h|6h|24h|7d)$"),
    db: AsyncSession = Depends(get_db),
) -> NginxUiMetricHistoryRead:
    try:
        return await get_metrics_history(db, server_id, range)
    except NginxUiApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/monitors/{server_id}/metrics/settings", response_model=NginxUiMetricsSettingsRead)
async def get_monitor_metrics_settings(
    server_id: int,
    db: AsyncSession = Depends(get_db),
) -> NginxUiMetricsSettingsRead:
    try:
        return await get_metrics_settings(db, server_id)
    except NginxUiApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.patch("/monitors/{server_id}/metrics/settings", response_model=NginxUiMetricsSettingsRead)
async def patch_monitor_metrics_settings(
    server_id: int,
    payload: NginxUiMetricsSettingsUpdate,
    db: AsyncSession = Depends(get_db),
) -> NginxUiMetricsSettingsRead:
    try:
        return await update_metrics_settings(db, server_id, payload)
    except NginxUiApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.delete("/monitors/{server_id}", status_code=204)
async def remove_monitor(server_id: int, db: AsyncSession = Depends(get_db)) -> None:
    server = await db.get(
        Server,
        server_id,
        options=(selectinload(Server.nginx_ui_connection),),
    )
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    if server.nginx_ui_connection:
        await db.delete(server.nginx_ui_connection)
    server.nginx_monitored = False
    await db.commit()


@router.post("/check/{server_id}", response_model=NginxCheckResult)
async def check_nginx(server_id: int, db: AsyncSession = Depends(get_db)) -> NginxCheckResult:
    server = await db.get(Server, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    job = await create_running_job(db, server_id, JobType.NGINX_CHECK)
    try:
        result = await run_nginx_check(server)
        result.job_id = job.id
        await finish_check_job(db, job, result, success=True)
        if result.risk_level == "high":
            await run_cve_assessment(db, server, result, source_job_id=job.id)
        return result
    except SSHError as exc:
        await fail_job(db, job, str(exc))
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post(
    "/upgrade/{server_id}",
    response_model=NginxUpgradeStarted,
    status_code=202,
)
async def upgrade_nginx(
    server_id: int,
    body: NginxUpgradeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> NginxUpgradeStarted:
    server = await db.get(Server, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    try:
        validate_upgrade_request(body.channel, body.target_version)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    job = await create_running_job(db, server_id, JobType.NGINX_UPGRADE)
    background_tasks.add_task(
        run_upgrade_job_background,
        job.id,
        server_id,
        channel=body.channel,
        target_version=body.target_version,
    )
    return NginxUpgradeStarted(job_id=job.id)


@router.get("/upgrade/active/{server_id}", response_model=JobRead | None)
async def get_active_upgrade_job(
    server_id: int,
    db: AsyncSession = Depends(get_db),
) -> JobRead | None:
    result = await db.execute(
        select(Job)
        .where(
            Job.server_id == server_id,
            Job.job_type == JobType.NGINX_UPGRADE,
            Job.status == JobStatus.RUNNING,
        )
        .options(selectinload(Job.server))
        .order_by(Job.created_at.desc())
        .limit(1)
    )
    job = result.scalar_one_or_none()
    if not job:
        return None
    return JobRead(
        id=job.id,
        server_id=job.server_id,
        server_name=job.server.name if job.server else None,
        job_type=job.job_type,
        status=job.status,
        result=job.result,
        log=job.log,
        report_path=job.report_path,
        created_at=job.created_at,
        finished_at=job.finished_at,
    )


@router.post("/security-scan/{server_id}", response_model=NginxSecurityScanResult)
async def run_security_scan(
    server_id: int,
    db: AsyncSession = Depends(get_db),
) -> NginxSecurityScanResult:
    server = await db.get(Server, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    job = await create_running_job(db, server_id, JobType.NGINX_FORENSIC)
    try:
        result = await run_nginx_security_scan(server)
        result.job_id = job.id
        await finish_forensic_job(db, job, result, success=True)
        return result
    except SSHError as exc:
        await fail_job(db, job, str(exc))
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/security-scan", response_model=list[NginxSecurityScanResult])
async def list_security_scans(
    server_id: int = Query(..., ge=1),
    limit: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> list[NginxSecurityScanResult]:
    result = await db.execute(
        select(Job)
        .where(
            Job.server_id == server_id,
            Job.job_type == JobType.NGINX_FORENSIC,
            Job.status == JobStatus.SUCCESS,
        )
        .order_by(Job.created_at.desc())
        .limit(limit)
    )
    scans: list[NginxSecurityScanResult] = []
    for job in result.scalars().all():
        if job.result:
            scans.append(NginxSecurityScanResult.model_validate(job.result))
    return scans


@router.get("/report-log", response_model=list[ReportLogEntry])
async def list_report_log(
    server_id: int = Query(..., ge=1),
    limit: int = Query(default=30, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> list[ReportLogEntry]:
    result = await db.execute(
        select(Job)
        .where(
            Job.server_id == server_id,
            or_(
                and_(
                    Job.job_type == JobType.NGINX_FORENSIC,
                    Job.status == JobStatus.SUCCESS,
                ),
                and_(
                    Job.job_type == JobType.NGINX_UPGRADE,
                    Job.status.in_([JobStatus.SUCCESS, JobStatus.FAILED]),
                ),
            ),
        )
        .order_by(Job.finished_at.desc(), Job.created_at.desc())
        .limit(limit)
    )
    entries: list[ReportLogEntry] = []
    for job in result.scalars().all():
        entry = job_to_report_log_entry(job)
        if entry:
            entries.append(entry)
    return entries


@router.get("/report-log/report/{job_id}")
async def download_report_log_pdf(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Job)
        .where(Job.id == job_id, Job.job_type.in_(REPORT_JOB_TYPES))
        .options(selectinload(Job.server))
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Report not found")
    if job.status != JobStatus.SUCCESS or not job.result:
        raise HTTPException(status_code=400, detail="PDF only available for successful report jobs")
    if not job.server:
        raise HTTPException(status_code=404, detail="Server not found for job")

    if job.job_type == JobType.NGINX_FORENSIC:
        pdf_path = generate_security_pdf(job, job.server)
    else:
        pdf_path = generate_upgrade_pdf(job, job.server)
    job.report_path = str(pdf_path)
    await db.commit()

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=pdf_path.name,
    )


@router.get("/security-scan/latest", response_model=NginxSecurityScanResult | None)
async def get_latest_security_scan(
    server_id: int = Query(..., ge=1),
    db: AsyncSession = Depends(get_db),
) -> NginxSecurityScanResult | None:
    result = await db.execute(
        select(Job)
        .where(
            Job.server_id == server_id,
            Job.job_type == JobType.NGINX_FORENSIC,
            Job.status == JobStatus.SUCCESS,
        )
        .order_by(Job.created_at.desc())
        .limit(1)
    )
    job = result.scalar_one_or_none()
    if not job or not job.result:
        return None
    return NginxSecurityScanResult.model_validate(job.result)


@router.get("/jobs", response_model=list[JobRead])
async def list_nginx_jobs(
    limit: int = Query(default=20, ge=1, le=100),
    server_id: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[JobRead]:
    stmt = (
        select(Job)
        .where(Job.job_type == JobType.NGINX_CHECK)
        .options(selectinload(Job.server))
        .order_by(Job.created_at.desc())
        .limit(limit)
    )
    if server_id is not None:
        stmt = stmt.where(Job.server_id == server_id)

    result = await db.execute(stmt)
    jobs = list(result.scalars().all())
    return [
        JobRead(
            id=j.id,
            server_id=j.server_id,
            server_name=j.server.name if j.server else None,
            job_type=j.job_type,
            status=j.status,
            result=j.result,
            log=j.log,
            report_path=j.report_path,
            created_at=j.created_at,
            finished_at=j.finished_at,
        )
        for j in jobs
    ]


@router.get("/jobs/{job_id}", response_model=JobRead)
async def get_nginx_job(job_id: int, db: AsyncSession = Depends(get_db)) -> JobRead:
    result = await db.execute(
        select(Job).where(Job.id == job_id).options(selectinload(Job.server))
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobRead(
        id=job.id,
        server_id=job.server_id,
        server_name=job.server.name if job.server else None,
        job_type=job.job_type,
        status=job.status,
        result=job.result,
        log=job.log,
        report_path=job.report_path,
        created_at=job.created_at,
        finished_at=job.finished_at,
    )


@router.get("/jobs/{job_id}/report")
async def download_job_report(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Job).where(Job.id == job_id).options(selectinload(Job.server))
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.SUCCESS or not job.result:
        raise HTTPException(status_code=400, detail="PDF only available for successful checks")
    if not job.server:
        raise HTTPException(status_code=404, detail="Server not found for job")

    if job.job_type == JobType.NGINX_FORENSIC:
        pdf_path = generate_security_pdf(job, job.server)
    elif job.job_type == JobType.NGINX_UPGRADE:
        pdf_path = generate_upgrade_pdf(job, job.server)
    else:
        pdf_path = generate_check_pdf(job, job.server)
    job.report_path = str(pdf_path)
    await db.commit()

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=pdf_path.name,
    )


@router.get("/security-scan/report/{job_id}")
async def download_security_scan_report(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Job)
        .where(Job.id == job_id, Job.job_type == JobType.NGINX_FORENSIC)
        .options(selectinload(Job.server))
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Security scan job not found")
    if job.status != JobStatus.SUCCESS or not job.result:
        raise HTTPException(status_code=400, detail="PDF only available for successful security scans")
    if not job.server:
        raise HTTPException(status_code=404, detail="Server not found for job")

    pdf_path = generate_security_pdf(job, job.server)
    job.report_path = str(pdf_path)
    await db.commit()

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=pdf_path.name,
    )
