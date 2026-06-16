from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.nginx_security import NginxSecurityScanResult
from app.schemas.nginx_upgrade import NginxUpgradeResult

ReportType = Literal["security_scan", "nginx_upgrade"]
ReportStatusTone = Literal["success", "warning", "danger", "neutral"]


class ReportLogEntry(BaseModel):
    job_id: int
    report_type: ReportType
    created_at: datetime
    summary: str
    status_label: str
    status_tone: ReportStatusTone = "neutral"
    pdf_available: bool = True
    security_scan: NginxSecurityScanResult | None = None
    nginx_upgrade: NginxUpgradeResult | None = None
