from datetime import datetime

from pydantic import BaseModel, Field


class NginxUiConnectionCreate(BaseModel):
    server_id: int
    panel_url: str | None = Field(default=None, max_length=512)
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=255)


class NginxUiConnectionUpdate(BaseModel):
    panel_url: str | None = Field(default=None, max_length=512)
    username: str | None = Field(default=None, min_length=1, max_length=128)
    password: str | None = Field(default=None, min_length=1, max_length=255)


class NginxUiConnectionRead(BaseModel):
    panel_url: str
    username: str
    api_connected: bool = False
    last_login_at: datetime | None = None
    last_error: str | None = None

    model_config = {"from_attributes": True}


class NginxMonitorRead(BaseModel):
    id: int
    name: str
    hostname: str
    ip: str
    group: str
    ssh_user: str
    ssh_key_path: str | None = None
    notes: str | None = None
    nginx_monitored: bool = True
    created_at: datetime
    updated_at: datetime
    nginx_ui: NginxUiConnectionRead | None = None

    model_config = {"from_attributes": True}
