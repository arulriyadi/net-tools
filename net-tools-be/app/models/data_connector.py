from datetime import datetime
from typing import Any, Optional

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DataConnector(Base):
    __tablename__ = "data_connectors"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(256), index=True)
    vendor: Mapped[str] = mapped_column(String(128))
    protocol: Mapped[str] = mapped_column(String(32))
    compatible_categories: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    capability_keys: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    description: Mapped[str] = mapped_column(Text, default="")
    default_port: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    endpoint_pattern: Mapped[str] = mapped_column(String(512), default="")
    auth_methods: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    poll_mode: Mapped[str] = mapped_column(String(32), default="interval")
    default_interval_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    parser_id: Mapped[str] = mapped_column(String(128), default="custom-parser")
    router_os_version: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
