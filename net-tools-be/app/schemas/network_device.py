from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

DataMode = Literal["datastore", "live", "hybrid"]
DeviceCategory = Literal["firewall", "router", "switch"]


class NetworkDeviceBase(BaseModel):
    name: str
    hostname: str
    ip: str
    category: DeviceCategory
    device_type_id: str
    device_type_name: str = ""
    data_mode: DataMode = "datastore"
    os: str = ""
    notes: str = ""
    connector_auth: dict[str, Any] = Field(default_factory=dict)
    dataset_bindings: list[Any] = Field(default_factory=list)
    dataset_data: dict[str, Any] = Field(default_factory=dict)


class NetworkDeviceCreate(NetworkDeviceBase):
    id: Optional[str] = None


class NetworkDeviceUpdate(BaseModel):
    name: Optional[str] = None
    hostname: Optional[str] = None
    ip: Optional[str] = None
    category: Optional[DeviceCategory] = None
    device_type_id: Optional[str] = None
    device_type_name: Optional[str] = None
    data_mode: Optional[DataMode] = None
    os: Optional[str] = None
    notes: Optional[str] = None
    connector_auth: Optional[dict[str, Any]] = None
    dataset_bindings: Optional[list[Any]] = None
    dataset_data: Optional[dict[str, Any]] = None


class NetworkDeviceRead(NetworkDeviceBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class SyncDatasetRequest(BaseModel):
    capability_key: str = Field(min_length=1)


class SyncDatasetResponse(BaseModel):
    device: NetworkDeviceRead
    row_count: int
