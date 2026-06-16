from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


SecuritySeverity = Literal["critical", "high", "medium", "low", "clean"]
FindingSource = Literal["config", "log", "database", "network"]
ScanAreaStatus = Literal["clean", "warning", "critical", "skipped"]


class ForensicFinding(BaseModel):
    severity: Literal["critical", "high", "medium", "low"]
    category: str
    source: FindingSource = "config"
    file_path: str | None = None
    line_number: int | None = None
    matched_line: str
    description: str


class TimelineEvent(BaseModel):
    timestamp_utc: str | None = None
    timestamp_wib: str
    event: str
    source_ip: str | None = None
    source: str


class SecurityRecommendation(BaseModel):
    priority: Literal["urgent", "follow_up"]
    text: str


class ScanAreaResult(BaseModel):
    area: FindingSource
    status: ScanAreaStatus
    label: str
    summary: str
    checks_run: list[str] = Field(default_factory=list)


class NginxSecurityScanResult(BaseModel):
    server_id: int
    server_name: str
    hostname: str | None = None
    private_ip: str
    public_ip: str | None = None
    nginx_version: str | None = None
    nginx_ui_active: bool | None = None
    nginx_ui_port: int | None = 9000
    nginx_ui_binds_all: bool | None = None
    # True only when public IP:port is reachable from NetTools probe (not config-only).
    nginx_ui_exposed: bool | None = None
    nginx_ui_public_probe: str | None = None
    findings: list[ForensicFinding] = Field(default_factory=list)
    timeline: list[TimelineEvent] = Field(default_factory=list)
    recommendations: list[SecurityRecommendation] = Field(default_factory=list)
    scan_areas: list[ScanAreaResult] = Field(default_factory=list)
    clean_scope: list[str] = Field(default_factory=list)
    overall_severity: SecuritySeverity = "clean"
    scanned_at: datetime
    job_id: int | None = None
    raw_log: str | None = None
