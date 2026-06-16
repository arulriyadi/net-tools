from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.server import Server


class NginxUiMetricSample(Base):
    __tablename__ = "nginx_ui_metric_samples"

    id: Mapped[int] = mapped_column(primary_key=True)
    server_id: Mapped[int] = mapped_column(
        ForeignKey("servers.id", ondelete="CASCADE"),
        index=True,
    )
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    nginx_running: Mapped[bool] = mapped_column(default=False)
    active_connections: Mapped[int] = mapped_column(Integer, default=0)
    reading: Mapped[int] = mapped_column(Integer, default=0)
    writing: Mapped[int] = mapped_column(Integer, default=0)
    waiting: Mapped[int] = mapped_column(Integer, default=0)
    nginx_cpu_percent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    nginx_memory_mb: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    requests_total: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    host_cpu_percent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    host_memory_percent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    host_memory_used_mb: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    host_memory_total_mb: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    network_rx_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    network_tx_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    network_interface: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    server: Mapped["Server"] = relationship()
