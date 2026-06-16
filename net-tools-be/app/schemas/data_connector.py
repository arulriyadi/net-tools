from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


ConnectorProtocol = Literal["api", "rest", "snmp", "ssh", "netconf"]
ConnectorAuthMethod = Literal[
    "api_key", "basic", "bearer", "snmp_v2c", "snmp_v3", "ssh_key", "ssh_password"
]
PollMode = Literal["interval", "on_demand"]
ConnectorStatus = Literal["active", "draft"]
DeviceCategory = Literal["firewall", "router", "switch"]
RouterOsVersion = Literal["6", "7"]


class DataConnectorBase(BaseModel):
    name: str
    vendor: str
    protocol: ConnectorProtocol
    compatible_categories: list[DeviceCategory] = Field(min_length=1)
    capability_keys: list[str] = Field(min_length=1)
    description: str = ""
    default_port: Optional[int] = None
    endpoint_pattern: str = ""
    auth_methods: list[ConnectorAuthMethod] = Field(min_length=1)
    poll_mode: PollMode = "interval"
    default_interval_minutes: Optional[int] = None
    parser_id: str = "custom-parser"
    router_os_version: Optional[RouterOsVersion] = None
    status: ConnectorStatus = "draft"


class DataConnectorCreate(DataConnectorBase):
    id: Optional[str] = None


class DataConnectorUpdate(BaseModel):
    name: Optional[str] = None
    vendor: Optional[str] = None
    protocol: Optional[ConnectorProtocol] = None
    compatible_categories: Optional[list[DeviceCategory]] = None
    capability_keys: Optional[list[str]] = None
    description: Optional[str] = None
    default_port: Optional[int] = None
    endpoint_pattern: Optional[str] = None
    auth_methods: Optional[list[ConnectorAuthMethod]] = None
    poll_mode: Optional[PollMode] = None
    default_interval_minutes: Optional[int] = None
    parser_id: Optional[str] = None
    router_os_version: Optional[RouterOsVersion] = None
    status: Optional[ConnectorStatus] = None


class DataConnectorRead(DataConnectorBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type_count: int = 0
    created_at: datetime
    updated_at: datetime
