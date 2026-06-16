from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel

from app.models import CveAssessmentStatus


class CveAssessmentRead(BaseModel):
    id: int
    server_id: int
    server_name: Optional[str] = None
    source_job_id: Optional[int] = None
    status: CveAssessmentStatus
    current_version: Optional[str] = None
    current_package: Optional[str] = None
    target_stable: str
    target_mainline: str
    overall_risk: str
    cve_findings: Optional[Any] = None
    recommendation: Optional[str] = None
    report_path: Optional[str] = None
    created_at: datetime
    finished_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
