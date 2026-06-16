import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import DataConnector, DeviceType
from app.schemas.device_type import DeviceTypeCreate, DeviceTypeRead, DeviceTypeUpdate

router = APIRouter(prefix="/api/device-types", tags=["device-types"])


def _new_device_type_id() -> str:
    return f"dt-{uuid.uuid4().hex[:12]}"


async def _validate_connector_ids(db: AsyncSession, connector_ids: list[str]) -> None:
    if not connector_ids:
        return
    result = await db.execute(select(DataConnector.id).where(DataConnector.id.in_(connector_ids)))
    found = {row[0] for row in result.all()}
    missing = [cid for cid in connector_ids if cid not in found]
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown connector IDs: {', '.join(missing)}")


def _to_read(device_type: DeviceType, device_count: int = 0) -> DeviceTypeRead:
    data = DeviceTypeRead.model_validate(device_type)
    return data.model_copy(update={"device_count": device_count})


@router.get("", response_model=list[DeviceTypeRead])
async def list_device_types(db: AsyncSession = Depends(get_db)) -> list[DeviceTypeRead]:
    result = await db.execute(select(DeviceType).order_by(DeviceType.name))
    types = list(result.scalars().all())
    return [_to_read(item, 0) for item in types]


@router.post("", response_model=DeviceTypeRead, status_code=201)
async def create_device_type(
    payload: DeviceTypeCreate,
    db: AsyncSession = Depends(get_db),
) -> DeviceTypeRead:
    await _validate_connector_ids(db, payload.connector_ids)
    type_id = payload.id or _new_device_type_id()
    data = payload.model_dump(exclude={"id"})
    device_type = DeviceType(id=type_id, **data)
    db.add(device_type)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Device type ID already exists") from exc
    await db.refresh(device_type)
    return _to_read(device_type, 0)


@router.get("/{type_id}", response_model=DeviceTypeRead)
async def get_device_type(type_id: str, db: AsyncSession = Depends(get_db)) -> DeviceTypeRead:
    device_type = await db.get(DeviceType, type_id)
    if not device_type:
        raise HTTPException(status_code=404, detail="Device type not found")
    return _to_read(device_type, 0)


@router.patch("/{type_id}", response_model=DeviceTypeRead)
async def update_device_type(
    type_id: str,
    payload: DeviceTypeUpdate,
    db: AsyncSession = Depends(get_db),
) -> DeviceTypeRead:
    device_type = await db.get(DeviceType, type_id)
    if not device_type:
        raise HTTPException(status_code=404, detail="Device type not found")

    updates = payload.model_dump(exclude_unset=True)
    if "connector_ids" in updates and updates["connector_ids"] is not None:
        await _validate_connector_ids(db, updates["connector_ids"])

    for field, value in updates.items():
        setattr(device_type, field, value)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Update conflict") from exc
    await db.refresh(device_type)
    return _to_read(device_type, 0)


@router.delete("/{type_id}", status_code=204)
async def delete_device_type(type_id: str, db: AsyncSession = Depends(get_db)) -> None:
    device_type = await db.get(DeviceType, type_id)
    if not device_type:
        raise HTTPException(status_code=404, detail="Device type not found")

    # device_count check when network devices table exists — for now allow delete
    await db.delete(device_type)
    await db.commit()
