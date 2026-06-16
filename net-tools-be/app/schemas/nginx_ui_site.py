from datetime import datetime

from pydantic import BaseModel, Field


class NginxUiSiteRead(BaseModel):
    name: str
    status: str
    urls: list[str] = Field(default_factory=list)
    proxy_target: str | None = None
    modified_at: datetime | None = None
