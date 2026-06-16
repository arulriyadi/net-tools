import asyncio
import logging
import time

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import SessionLocal
from app.models import Server
from app.services.nginx_ui_client import NginxUiApiError
from app.services.nginx_ui_metrics import cleanup_old_metric_samples, collect_and_store_metrics

logger = logging.getLogger(__name__)

_last_polled_at: dict[int, float] = {}
_last_cleanup_at: float = 0.0
CLEANUP_INTERVAL_SECONDS = 3600
TICK_SECONDS = 5


async def _poll_due_servers() -> None:
    now = time.monotonic()
    async with SessionLocal() as db:
        result = await db.execute(
            select(Server)
            .where(Server.nginx_monitored.is_(True))
            .options(selectinload(Server.nginx_ui_connection))
        )
        servers = list(result.scalars().all())

        for server in servers:
            connection = server.nginx_ui_connection
            if not connection:
                continue

            interval = max(connection.metrics_poll_interval_seconds, 10)
            last = _last_polled_at.get(server.id, 0.0)
            if now - last < interval:
                continue

            try:
                await collect_and_store_metrics(db, server.id)
                _last_polled_at[server.id] = now
            except NginxUiApiError as exc:
                logger.warning("Metrics collect failed for server %s: %s", server.id, exc)
            except Exception:
                logger.exception("Unexpected metrics collect failure for server %s", server.id)


async def run_metrics_collector() -> None:
    global _last_cleanup_at
    logger.info("nginx-ui metrics collector started")
    while True:
        try:
            await _poll_due_servers()
            now = time.monotonic()
            if now - _last_cleanup_at >= CLEANUP_INTERVAL_SECONDS:
                async with SessionLocal() as db:
                    deleted = await cleanup_old_metric_samples(db)
                    if deleted:
                        logger.info("Cleaned up %s old metric samples", deleted)
                _last_cleanup_at = now
        except asyncio.CancelledError:
            logger.info("nginx-ui metrics collector stopped")
            raise
        except Exception:
            logger.exception("Metrics collector tick failed")
        await asyncio.sleep(TICK_SECONDS)
