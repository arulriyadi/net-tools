from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel

from app.models import JobStatus, JobType


class JobRead(BaseModel):
    id: int
    server_id: int
    server_name: Optional[str] = None
    job_type: JobType
    status: JobStatus
    result: Optional[Any] = None
    log: Optional[str] = None
    report_path: Optional[str] = None
    created_at: datetime
    finished_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
