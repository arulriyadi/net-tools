from datetime import datetime

from pydantic import BaseModel, Field


class NginxUiMetricsRead(BaseModel):
    collected_at: datetime
    nginx_running: bool = False
    active_connections: int = 0
    reading: int = 0
    writing: int = 0
    waiting: int = 0
    nginx_cpu_percent: float | None = None
    nginx_memory_mb: float | None = None
    requests_total: int | None = None
    host_cpu_percent: float | None = None
    host_memory_percent: float | None = None
    host_memory_used_mb: float | None = None
    host_memory_total_mb: float | None = None
    network_rx_bytes: int | None = None
    network_tx_bytes: int | None = None
    network_interface: str | None = None
    errors: list[str] = Field(default_factory=list)
