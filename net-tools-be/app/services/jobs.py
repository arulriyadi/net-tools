import asyncio
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import SessionLocal
from app.models import Job, JobStatus, JobType, Server
from app.schemas.nginx import NginxCheckResult
from app.schemas.nginx_security import NginxSecurityScanResult
from app.schemas.nginx_upgrade import NginxUpgradeResult


async def create_running_job(db: AsyncSession, server_id: int, job_type: JobType) -> Job:
    job = Job(server_id=server_id, job_type=job_type, status=JobStatus.RUNNING)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


async def finish_check_job(
    db: AsyncSession,
    job: Job,
    result: NginxCheckResult,
    *,
    success: bool = True,
    error_log: str | None = None,
) -> Job:
    job.status = JobStatus.SUCCESS if success else JobStatus.FAILED
    job.result = result.model_dump()
    job.log = result.raw_log if success else (error_log or result.raw_log)
    job.finished_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(job)
    return job


async def finish_forensic_job(
    db: AsyncSession,
    job: Job,
    result: NginxSecurityScanResult,
    *,
    success: bool = True,
    error_log: str | None = None,
) -> Job:
    job.status = JobStatus.SUCCESS if success else JobStatus.FAILED
    payload = result.model_dump(mode="json")
    payload["job_id"] = job.id
    job.result = payload
    job.log = result.raw_log if success else (error_log or result.raw_log)
    job.finished_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(job)
    return job


async def finish_upgrade_job(
    db: AsyncSession,
    job: Job,
    result: NginxUpgradeResult,
    *,
    success: bool = True,
    error_log: str | None = None,
) -> Job:
    job.status = JobStatus.SUCCESS if success else JobStatus.FAILED
    payload = result.model_dump(mode="json")
    payload["job_id"] = job.id
    job.result = payload
    job.log = result.raw_log if success else (error_log or result.raw_log)
    job.finished_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(job)
    return job


async def persist_job_log(job_id: int, log: str) -> None:
    """Write job log using an isolated session (safe for concurrent stream callbacks)."""
    async with SessionLocal() as db:
        job = await db.get(Job, job_id)
        if job is None:
            return
        job.log = log
        await db.commit()


class StreamingJobLog:
    """Buffered job log with periodic flush — avoids concurrent commits on one session."""

    def __init__(self, job_id: int, *, flush_interval: float = 1.0) -> None:
        self.job_id = job_id
        self._flush_interval = flush_interval
        self._lines: list[str] = []
        self._lock = asyncio.Lock()
        self._dirty = False
        self._flush_task: asyncio.Task | None = None

    async def extend(self, lines: list[str]) -> None:
        async with self._lock:
            self._lines.extend(lines)
            self._dirty = True

    async def append(self, line: str) -> None:
        async with self._lock:
            self._lines.append(line)
            self._dirty = True

    def snapshot(self) -> str:
        return "\n".join(self._lines)

    async def flush(self) -> None:
        async with self._lock:
            if not self._dirty:
                return
            text = "\n".join(self._lines)
            self._dirty = False
        await persist_job_log(self.job_id, text)

    def start_background_flush(self) -> None:
        async def _loop() -> None:
            while True:
                await asyncio.sleep(self._flush_interval)
                await self.flush()

        self._flush_task = asyncio.create_task(_loop())

    async def stop(self) -> str:
        if self._flush_task is not None:
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass
            self._flush_task = None
        async with self._lock:
            self._dirty = True
        await self.flush()
        return self.snapshot()


async def finish_upgrade_job_by_id(
    job_id: int,
    result: NginxUpgradeResult,
    *,
    success: bool = True,
    error_log: str | None = None,
) -> None:
    async with SessionLocal() as db:
        job = await db.get(Job, job_id)
        if job is None:
            return
        await finish_upgrade_job(db, job, result, success=success, error_log=error_log)


async def fail_job_by_id(job_id: int, error: str, *, log: str | None = None) -> None:
    async with SessionLocal() as db:
        job = await db.get(Job, job_id)
        if job is None:
            return
        job.status = JobStatus.FAILED
        job.finished_at = datetime.now(timezone.utc)
        job.log = log if log is not None else error
        await db.commit()


async def append_job_log(db: AsyncSession, job: Job, line: str) -> None:
    """Append a line to the job log (for live command execution UI)."""
    if job.log:
        job.log = f"{job.log}\n{line}"
    else:
        job.log = line
    await db.commit()


async def fail_job(db: AsyncSession, job: Job, error: str) -> Job:
    job.status = JobStatus.FAILED
    job.log = error
    job.finished_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(job)
    return job
