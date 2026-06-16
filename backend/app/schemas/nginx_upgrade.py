from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class NginxUpgradeRequest(BaseModel):
    channel: Literal["stable", "mainline"]
    target_version: str = Field(..., min_length=5, max_length=32)


class NginxUpgradeStarted(BaseModel):
    job_id: int
    status: Literal["running"] = "running"
    message: str = "Upgrade started — streaming remote command output"


class NginxUpgradeResult(BaseModel):
    job_id: int | None = None
    server_id: int
    server_name: str
    ip: str
    channel: str
    target_version: str
    previous_version: str | None = None
    new_version: str | None = None
    success: bool
    message: str
    config_test_ok: bool | None = None
    nginx_active: bool | None = None
    scanned_at: datetime
    raw_log: str | None = None
