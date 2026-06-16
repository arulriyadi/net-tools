from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


DeviceCategory = Literal["firewall", "router", "switch"]


class DeviceTypeBase(BaseModel):
    name: str
    vendor: str
    category: DeviceCategory
    description: str = ""
    capabilities: list[dict[str, Any]] = Field(default_factory=list)
    connector_ids: list[str] = Field(default_factory=list)


class DeviceTypeCreate(DeviceTypeBase):
    id: Optional[str] = None


class DeviceTypeUpdate(BaseModel):
    name: Optional[str] = None
    vendor: Optional[str] = None
    category: Optional[DeviceCategory] = None
    description: Optional[str] = None
    capabilities: Optional[list[dict[str, Any]]] = None
    connector_ids: Optional[list[str]] = None


class DeviceTypeRead(DeviceTypeBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    device_count: int = 0
    created_at: datetime
    updated_at: datetime
