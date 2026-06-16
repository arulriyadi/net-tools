import enum
from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.job import Job
    from app.models.server import Server


class CveAssessmentStatus(str, enum.Enum):
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class CveAssessment(Base):
    __tablename__ = "cve_assessments"

    id: Mapped[int] = mapped_column(primary_key=True)
    server_id: Mapped[int] = mapped_column(ForeignKey("servers.id"), index=True)
    source_job_id: Mapped[Optional[int]] = mapped_column(ForeignKey("jobs.id"), nullable=True, index=True)
    status: Mapped[CveAssessmentStatus] = mapped_column(
        Enum(CveAssessmentStatus), default=CveAssessmentStatus.RUNNING
    )
    current_version: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    current_package: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    target_stable: Mapped[str] = mapped_column(String(32))
    target_mainline: Mapped[str] = mapped_column(String(32))
    overall_risk: Mapped[str] = mapped_column(String(16), default="unknown")
    cve_findings: Mapped[Any] = mapped_column(JSON, nullable=True)
    recommendation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    report_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    server: Mapped["Server"] = relationship(back_populates="cve_assessments")
    source_job: Mapped[Optional["Job"]] = relationship()
