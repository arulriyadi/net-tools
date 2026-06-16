import enum
from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.server import Server


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class JobType(str, enum.Enum):
    NGINX_CHECK = "nginx_check"
    NGINX_UPGRADE = "nginx_upgrade"
    NGINX_FORENSIC = "nginx_forensic"


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    server_id: Mapped[int] = mapped_column(ForeignKey("servers.id"), index=True)
    job_type: Mapped[JobType] = mapped_column(Enum(JobType))
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus), default=JobStatus.PENDING)
    result: Mapped[Any] = mapped_column(JSON, nullable=True)
    log: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    report_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    server: Mapped["Server"] = relationship(back_populates="jobs")
