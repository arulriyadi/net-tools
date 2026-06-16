from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models import NginxUiConnection, NginxUiMetricSample, Server
from app.schemas.nginx_ui_metrics import NginxUiMetricsRead
from app.schemas.nginx_ui_metrics_history import (
    NginxUiMetricHistoryPoint,
    NginxUiMetricHistoryRead,
    NginxUiMetricsSettingsRead,
    NginxUiMetricsSettingsUpdate,
)
from app.services.credentials import decrypt_secret
from app.services.nginx_ui_client import NginxUiApiError, fetch_detail_status, login
from app.services.ssh import SSHError, run_ssh_command

_HOST_METRICS_CMD = r"""iface=$(ip -o -4 route show to default | awk '{print $5}' | head -1); \
cpu=$(top -bn1 | grep '%Cpu' | awk -F',' '{for(i=1;i<=NF;i++){if($i~/id/){gsub(/[^0-9.]/,"",$i); print 100-$i; exit}}}'); \
mem_total=$(awk '/^MemTotal:/{print $2}' /proc/meminfo); \
mem_avail=$(awk '/^MemAvailable:/{print $2}' /proc/meminfo); \
read rx tx < <(grep "${iface}:" /proc/net/dev | awk '{print $2,$10}'); \
echo "cpu=${cpu:-0} mem_total=${mem_total} mem_avail=${mem_avail} rx=${rx} tx=${tx} iface=${iface}"
"""

_HISTORY_RANGES: dict[str, timedelta] = {
    "1h": timedelta(hours=1),
    "6h": timedelta(hours=6),
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
}


def _sample_to_metrics(sample: NginxUiMetricSample) -> NginxUiMetricsRead:
    return NginxUiMetricsRead(
        collected_at=sample.collected_at,
        nginx_running=sample.nginx_running,
        active_connections=sample.active_connections,
        reading=sample.reading,
        writing=sample.writing,
        waiting=sample.waiting,
        nginx_cpu_percent=sample.nginx_cpu_percent,
        nginx_memory_mb=sample.nginx_memory_mb,
        requests_total=sample.requests_total,
        host_cpu_percent=sample.host_cpu_percent,
        host_memory_percent=sample.host_memory_percent,
        host_memory_used_mb=sample.host_memory_used_mb,
        host_memory_total_mb=sample.host_memory_total_mb,
        network_rx_bytes=sample.network_rx_bytes,
        network_tx_bytes=sample.network_tx_bytes,
        network_interface=sample.network_interface,
        errors=[],
    )


async def persist_metric_sample(db: AsyncSession, server_id: int, metrics: NginxUiMetricsRead) -> None:
    sample = NginxUiMetricSample(
        server_id=server_id,
        collected_at=metrics.collected_at,
        nginx_running=metrics.nginx_running,
        active_connections=metrics.active_connections,
        reading=metrics.reading,
        writing=metrics.writing,
        waiting=metrics.waiting,
        nginx_cpu_percent=metrics.nginx_cpu_percent,
        nginx_memory_mb=metrics.nginx_memory_mb,
        requests_total=metrics.requests_total,
        host_cpu_percent=metrics.host_cpu_percent,
        host_memory_percent=metrics.host_memory_percent,
        host_memory_used_mb=metrics.host_memory_used_mb,
        host_memory_total_mb=metrics.host_memory_total_mb,
        network_rx_bytes=metrics.network_rx_bytes,
        network_tx_bytes=metrics.network_tx_bytes,
        network_interface=metrics.network_interface,
    )
    db.add(sample)
    await db.commit()


async def collect_and_store_metrics(db: AsyncSession, server_id: int) -> NginxUiMetricsRead:
    metrics = await get_metrics_for_server(db, server_id)
    await persist_metric_sample(db, server_id, metrics)
    return metrics


async def get_latest_metrics(db: AsyncSession, server_id: int) -> NginxUiMetricsRead | None:
    result = await db.execute(
        select(NginxUiMetricSample)
        .where(NginxUiMetricSample.server_id == server_id)
        .order_by(NginxUiMetricSample.collected_at.desc())
        .limit(1)
    )
    sample = result.scalar_one_or_none()
    if not sample:
        return None
    return _sample_to_metrics(sample)


async def get_metrics_settings(db: AsyncSession, server_id: int) -> NginxUiMetricsSettingsRead:
    connection = await _get_connection(db, server_id)
    return NginxUiMetricsSettingsRead(
        poll_interval_seconds=connection.metrics_poll_interval_seconds,
        retention_days=connection.metrics_retention_days,
    )


async def update_metrics_settings(
    db: AsyncSession,
    server_id: int,
    payload: NginxUiMetricsSettingsUpdate,
) -> NginxUiMetricsSettingsRead:
    connection = await _get_connection(db, server_id)
    connection.metrics_poll_interval_seconds = payload.poll_interval_seconds
    connection.metrics_retention_days = payload.retention_days
    await db.commit()
    await db.refresh(connection)
    return NginxUiMetricsSettingsRead(
        poll_interval_seconds=connection.metrics_poll_interval_seconds,
        retention_days=connection.metrics_retention_days,
    )


async def _get_connection(db: AsyncSession, server_id: int) -> NginxUiConnection:
    server = await db.get(
        Server,
        server_id,
        options=(selectinload(Server.nginx_ui_connection),),
    )
    if not server:
        raise NginxUiApiError("Server not found")
    if not server.nginx_monitored or not server.nginx_ui_connection:
        raise NginxUiApiError("No nginx-ui credentials configured for this server")
    return server.nginx_ui_connection


def _compute_bandwidth_rates(
    samples: list[NginxUiMetricSample],
) -> list[NginxUiMetricHistoryPoint]:
    points: list[NginxUiMetricHistoryPoint] = []
    for index, sample in enumerate(samples):
        rx_rate: float | None = None
        tx_rate: float | None = None
        if index > 0:
            prev = samples[index - 1]
            elapsed = (sample.collected_at - prev.collected_at).total_seconds()
            if elapsed > 0 and sample.network_rx_bytes is not None and prev.network_rx_bytes is not None:
                rx_rate = max(0.0, (sample.network_rx_bytes - prev.network_rx_bytes) / elapsed)
            if elapsed > 0 and sample.network_tx_bytes is not None and prev.network_tx_bytes is not None:
                tx_rate = max(0.0, (sample.network_tx_bytes - prev.network_tx_bytes) / elapsed)
        points.append(
            NginxUiMetricHistoryPoint(
                collected_at=sample.collected_at,
                active_connections=sample.active_connections,
                host_cpu_percent=sample.host_cpu_percent,
                host_memory_percent=sample.host_memory_percent,
                nginx_cpu_percent=sample.nginx_cpu_percent,
                nginx_memory_mb=sample.nginx_memory_mb,
                rx_bytes_per_sec=rx_rate,
                tx_bytes_per_sec=tx_rate,
            )
        )
    return points


async def get_metrics_history(
    db: AsyncSession,
    server_id: int,
    range_key: str,
) -> NginxUiMetricHistoryRead:
    if range_key not in _HISTORY_RANGES:
        raise NginxUiApiError("Invalid history range")

    connection = await _get_connection(db, server_id)
    since = datetime.now(timezone.utc) - _HISTORY_RANGES[range_key]
    result = await db.execute(
        select(NginxUiMetricSample)
        .where(
            NginxUiMetricSample.server_id == server_id,
            NginxUiMetricSample.collected_at >= since,
        )
        .order_by(NginxUiMetricSample.collected_at.asc())
    )
    samples = list(result.scalars().all())
    return NginxUiMetricHistoryRead(
        range=range_key,
        poll_interval_seconds=connection.metrics_poll_interval_seconds,
        retention_days=connection.metrics_retention_days,
        points=_compute_bandwidth_rates(samples),
    )


async def cleanup_old_metric_samples(db: AsyncSession) -> int:
    connections = await db.execute(select(NginxUiConnection))
    deleted_total = 0
    now = datetime.now(timezone.utc)
    for connection in connections.scalars().all():
        cutoff = now - timedelta(days=connection.metrics_retention_days)
        result = await db.execute(
            delete(NginxUiMetricSample).where(
                NginxUiMetricSample.server_id == connection.server_id,
                NginxUiMetricSample.collected_at < cutoff,
            )
        )
        deleted_total += result.rowcount or 0
    await db.commit()
    return deleted_total


def _parse_host_metrics(stdout: str) -> dict[str, str | int | float]:
    values: dict[str, str | int | float] = {}
    for part in stdout.strip().split():
        if "=" not in part:
            continue
        key, raw = part.split("=", 1)
        values[key] = raw
    return values


def _to_float(value: str | int | float | None) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_int(value: str | int | float | None) -> int | None:
    if value is None:
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


async def _fetch_host_metrics(server: Server) -> tuple[dict[str, str | int | float], str | None]:
    if not server.ssh_key_path:
        return {}, "SSH key not configured for this server"

    settings = get_settings()
    key_path = settings.resolve_path(server.ssh_key_path)
    if not key_path.exists():
        return {}, f"SSH key not found: {key_path}"

    try:
        code, stdout, stderr = await run_ssh_command(
            server.ip,
            _HOST_METRICS_CMD,
            user=server.ssh_user or "root",
            key_path=key_path,
            timeout=15,
        )
    except SSHError as exc:
        return {}, str(exc)

    if code != 0 or not stdout.strip():
        message = stderr.strip() or "Failed to read host metrics via SSH"
        return {}, message

    return _parse_host_metrics(stdout), None


async def get_metrics_for_server(db: AsyncSession, server_id: int) -> NginxUiMetricsRead:
    server = await db.get(
        Server,
        server_id,
        options=(selectinload(Server.nginx_ui_connection),),
    )
    if not server:
        raise NginxUiApiError("Server not found")
    if not server.nginx_monitored:
        raise NginxUiApiError("Server is not an nginx-ui monitor")

    connection = server.nginx_ui_connection
    if not connection:
        raise NginxUiApiError("No nginx-ui credentials configured for this server")

    errors: list[str] = []
    metrics = NginxUiMetricsRead(collected_at=datetime.now(timezone.utc))

    password = decrypt_secret(connection.password_encrypted)
    try:
        session = await login(connection.panel_url, connection.username, password)
        detail = await fetch_detail_status(connection.panel_url, session.token)
        connection.api_connected = True
        connection.last_login_at = datetime.now(timezone.utc)
        connection.last_error = None
        await db.commit()

        metrics.nginx_running = bool(detail.get("running"))
        info = detail.get("info") if isinstance(detail.get("info"), dict) else {}
        metrics.active_connections = int(info.get("active") or 0)
        metrics.reading = int(info.get("reading") or 0)
        metrics.writing = int(info.get("writing") or 0)
        metrics.waiting = int(info.get("waiting") or 0)
        metrics.nginx_cpu_percent = _to_float(info.get("cpu_usage"))
        metrics.nginx_memory_mb = _to_float(info.get("memory_usage"))
        metrics.requests_total = _to_int(info.get("requests"))
        if detail.get("error"):
            errors.append(str(detail["error"]))
    except NginxUiApiError as exc:
        connection.api_connected = False
        connection.last_error = str(exc)
        await db.commit()
        errors.append(str(exc))

    host_values, host_error = await _fetch_host_metrics(server)
    if host_error:
        errors.append(host_error)
    else:
        mem_total_kb = _to_int(host_values.get("mem_total"))
        mem_avail_kb = _to_int(host_values.get("mem_avail"))
        metrics.host_cpu_percent = _to_float(host_values.get("cpu"))
        if mem_total_kb and mem_avail_kb is not None:
            mem_used_kb = max(mem_total_kb - mem_avail_kb, 0)
            metrics.host_memory_used_mb = round(mem_used_kb / 1024, 1)
            metrics.host_memory_total_mb = round(mem_total_kb / 1024, 1)
            metrics.host_memory_percent = round((mem_used_kb / mem_total_kb) * 100, 1)
        metrics.network_rx_bytes = _to_int(host_values.get("rx"))
        metrics.network_tx_bytes = _to_int(host_values.get("tx"))
        iface = host_values.get("iface")
        metrics.network_interface = str(iface) if iface else None

    metrics.errors = errors
    return metrics
