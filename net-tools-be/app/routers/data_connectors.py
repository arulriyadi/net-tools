import uuid
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import DataConnector, DeviceType
from app.schemas.data_connector import DataConnectorCreate, DataConnectorRead, DataConnectorUpdate

router = APIRouter(prefix="/api/data-connectors", tags=["data-connectors"])


def _new_connector_id() -> str:
    return f"conn-{uuid.uuid4().hex[:12]}"


async def _type_counts(db: AsyncSession) -> Counter[str]:
    result = await db.execute(select(DeviceType.connector_ids))
    counts: Counter[str] = Counter()
    for (connector_ids,) in result.all():
        if not connector_ids:
            continue
        for connector_id in connector_ids:
            counts[str(connector_id)] += 1
    return counts


def _to_read(connector: DataConnector, type_count: int) -> DataConnectorRead:
    data = DataConnectorRead.model_validate(connector)
    return data.model_copy(update={"type_count": type_count})


@router.get("", response_model=list[DataConnectorRead])
async def list_data_connectors(db: AsyncSession = Depends(get_db)) -> list[DataConnectorRead]:
    result = await db.execute(select(DataConnector).order_by(DataConnector.name))
    connectors = list(result.scalars().all())
    counts = await _type_counts(db)
    return [_to_read(conn, counts.get(conn.id, 0)) for conn in connectors]


@router.post("", response_model=DataConnectorRead, status_code=201)
async def create_data_connector(
    payload: DataConnectorCreate,
    db: AsyncSession = Depends(get_db),
) -> DataConnectorRead:
    connector_id = payload.id or _new_connector_id()
    data = payload.model_dump(exclude={"id"})
    connector = DataConnector(id=connector_id, **data)
    db.add(connector)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Connector ID already exists") from exc
    await db.refresh(connector)
    return _to_read(connector, 0)


@router.get("/{connector_id}", response_model=DataConnectorRead)
async def get_data_connector(
    connector_id: str,
    db: AsyncSession = Depends(get_db),
) -> DataConnectorRead:
    connector = await db.get(DataConnector, connector_id)
    if not connector:
        raise HTTPException(status_code=404, detail="Data connector not found")
    counts = await _type_counts(db)
    return _to_read(connector, counts.get(connector.id, 0))


@router.patch("/{connector_id}", response_model=DataConnectorRead)
async def update_data_connector(
    connector_id: str,
    payload: DataConnectorUpdate,
    db: AsyncSession = Depends(get_db),
) -> DataConnectorRead:
    connector = await db.get(DataConnector, connector_id)
    if not connector:
        raise HTTPException(status_code=404, detail="Data connector not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(connector, field, value)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Update conflict") from exc
    await db.refresh(connector)
    counts = await _type_counts(db)
    return _to_read(connector, counts.get(connector.id, 0))


@router.delete("/{connector_id}", status_code=204)
async def delete_data_connector(connector_id: str, db: AsyncSession = Depends(get_db)) -> None:
    connector = await db.get(DataConnector, connector_id)
    if not connector:
        raise HTTPException(status_code=404, detail="Data connector not found")

    counts = await _type_counts(db)
    if counts.get(connector_id, 0) > 0:
        raise HTTPException(
            status_code=409,
            detail="Connector is linked to device types and cannot be deleted",
        )

    await db.delete(connector)
    await db.commit()
