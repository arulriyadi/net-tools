from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DeviceType(Base):
    __tablename__ = "device_types"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(256), index=True)
    vendor: Mapped[str] = mapped_column(String(128))
    category: Mapped[str] = mapped_column(String(32), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    capabilities: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    connector_ids: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
