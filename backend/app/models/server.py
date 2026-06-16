from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.cve_assessment import CveAssessment
    from app.models.job import Job
    from app.models.nginx_ui_connection import NginxUiConnection


class Server(Base):
    __tablename__ = "servers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    hostname: Mapped[str] = mapped_column(String(128))
    ip: Mapped[str] = mapped_column(String(45), unique=True)
    group: Mapped[str] = mapped_column(String(128))
    ssh_user: Mapped[str] = mapped_column(String(64), default="root")
    ssh_key_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    nginx_fleet_label_mode: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    nginx_fleet_label_custom: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    nginx_monitored: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    jobs: Mapped[list["Job"]] = relationship(back_populates="server")
    cve_assessments: Mapped[list["CveAssessment"]] = relationship(back_populates="server")
    nginx_ui_connection: Mapped[Optional["NginxUiConnection"]] = relationship(
        back_populates="server",
        uselist=False,
        cascade="all, delete-orphan",
    )
