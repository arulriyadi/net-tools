from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.server import Server


class NginxUiConnection(Base):
    __tablename__ = "nginx_ui_connections"

    id: Mapped[int] = mapped_column(primary_key=True)
    server_id: Mapped[int] = mapped_column(ForeignKey("servers.id", ondelete="CASCADE"), unique=True)
    panel_url: Mapped[str] = mapped_column(String(512))
    username: Mapped[str] = mapped_column(String(128))
    password_encrypted: Mapped[str] = mapped_column(Text)
    api_connected: Mapped[bool] = mapped_column(default=False, server_default="false")
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metrics_poll_interval_seconds: Mapped[int] = mapped_column(
        Integer, default=30, server_default="30"
    )
    metrics_retention_days: Mapped[int] = mapped_column(Integer, default=7, server_default="7")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    server: Mapped["Server"] = relationship(back_populates="nginx_ui_connection")
