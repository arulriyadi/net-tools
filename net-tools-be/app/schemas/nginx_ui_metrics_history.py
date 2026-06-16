from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, Field


class NginxUiMetricsSettingsRead(BaseModel):
    poll_interval_seconds: int
    retention_days: int


class NginxUiMetricsSettingsUpdate(BaseModel):
    poll_interval_seconds: int = Field(ge=10, le=300)
    retention_days: int = Field(ge=1, le=90)


class NginxUiMetricHistoryPoint(BaseModel):
    collected_at: datetime
    active_connections: int
    host_cpu_percent: float | None = None
    host_memory_percent: float | None = None
    nginx_cpu_percent: float | None = None
    nginx_memory_mb: float | None = None
    rx_bytes_per_sec: float | None = None
    tx_bytes_per_sec: float | None = None


class NginxUiMetricHistoryRead(BaseModel):
    range: str
    poll_interval_seconds: int
    retention_days: int
    points: list[NginxUiMetricHistoryPoint] = Field(default_factory=list)
