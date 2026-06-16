from datetime import datetime

from pydantic import BaseModel, Field


class NginxUiCertificateInfoRead(BaseModel):
    subject_name: str | None = None
    issuer_name: str | None = None
    not_before: datetime | None = None
    not_after: datetime | None = None


class NginxUiCertificateRead(BaseModel):
    id: int
    name: str
    domains: list[str] = Field(default_factory=list)
    filename: str | None = None
    ssl_certificate_path: str | None = None
    auto_cert: str
    challenge_method: str | None = None
    status: str | None = None
    last_error: str | None = None
    certificate_info: NginxUiCertificateInfoRead | None = None
