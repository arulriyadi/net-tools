from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NetworkDevice(Base):
    __tablename__ = "network_devices"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), index=True)
    hostname: Mapped[str] = mapped_column(String(128))
    ip: Mapped[str] = mapped_column(String(45), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(32), index=True)
    device_type_id: Mapped[str] = mapped_column(String(64), index=True)
    device_type_name: Mapped[str] = mapped_column(String(256), default="")
    data_mode: Mapped[str] = mapped_column(String(16), default="datastore")
    os: Mapped[str] = mapped_column(String(128), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    connector_auth: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    dataset_bindings: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    dataset_data: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
