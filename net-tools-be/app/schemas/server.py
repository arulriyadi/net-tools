from datetime import datetime

from pydantic import BaseModel, Field

class ServerBase(BaseModel):
    name: str = Field(max_length=128)
    hostname: str = Field(max_length=128)
    ip: str = Field(max_length=45)
    group: str = Field(min_length=1, max_length=128)
    ssh_user: str = "root"
    ssh_key_path: str | None = None
    notes: str | None = None
    nginx_fleet_label_mode: str | None = Field(default=None, max_length=16)
    nginx_fleet_label_custom: str | None = Field(default=None, max_length=128)


class ServerCreate(ServerBase):
    pass


class ServerUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=128)
    hostname: str | None = Field(default=None, max_length=128)
    ip: str | None = Field(default=None, max_length=45)
    group: str | None = Field(default=None, min_length=1, max_length=128)
    ssh_user: str | None = Field(default=None, max_length=64)
    ssh_key_path: str | None = None
    notes: str | None = None
    nginx_fleet_label_mode: str | None = Field(default=None, max_length=16)
    nginx_fleet_label_custom: str | None = Field(default=None, max_length=128)


class ServerRead(ServerBase):
    id: int
    nginx_monitored: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
