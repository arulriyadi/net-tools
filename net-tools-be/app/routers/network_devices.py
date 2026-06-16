import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import DataConnector, DeviceType, NetworkDevice
from app.schemas.network_device import (
    NetworkDeviceCreate,
    NetworkDeviceRead,
    NetworkDeviceUpdate,
    SyncDatasetRequest,
    SyncDatasetResponse,
)
from app.services.dataset_sync import DatasetSyncError, sync_device_dataset

router = APIRouter(prefix="/api/network-devices", tags=["network-devices"])


def _new_network_device_id() -> str:
    return f"nd-{uuid.uuid4().hex[:12]}"


async def _validate_device_type(db: AsyncSession, device_type_id: str) -> DeviceType:
    device_type = await db.get(DeviceType, device_type_id)
    if not device_type:
        raise HTTPException(status_code=400, detail=f"Unknown device type: {device_type_id}")
    return device_type


@router.get("", response_model=list[NetworkDeviceRead])
async def list_network_devices(
    category: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[NetworkDevice]:
    stmt = select(NetworkDevice).order_by(NetworkDevice.name)
    if category:
        stmt = stmt.where(NetworkDevice.category == category)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("", response_model=NetworkDeviceRead, status_code=201)
async def create_network_device(
    payload: NetworkDeviceCreate,
    db: AsyncSession = Depends(get_db),
) -> NetworkDevice:
    device_type = await _validate_device_type(db, payload.device_type_id)
    device_id = payload.id or _new_network_device_id()
    data = payload.model_dump(exclude={"id"})
    if not data.get("device_type_name"):
        data["device_type_name"] = device_type.name
    device = NetworkDevice(id=device_id, **data)
    db.add(device)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Network device with this IP already exists") from exc
    await db.refresh(device)
    return device


@router.get("/{device_id}", response_model=NetworkDeviceRead)
async def get_network_device(device_id: str, db: AsyncSession = Depends(get_db)) -> NetworkDevice:
    device = await db.get(NetworkDevice, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Network device not found")
    return device


@router.patch("/{device_id}", response_model=NetworkDeviceRead)
async def update_network_device(
    device_id: str,
    payload: NetworkDeviceUpdate,
    db: AsyncSession = Depends(get_db),
) -> NetworkDevice:
    device = await db.get(NetworkDevice, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Network device not found")

    updates = payload.model_dump(exclude_unset=True)
    if "device_type_id" in updates and updates["device_type_id"] is not None:
        device_type = await _validate_device_type(db, updates["device_type_id"])
        updates["device_type_name"] = device_type.name

    for field, value in updates.items():
        setattr(device, field, value)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Network device with this IP already exists") from exc
    await db.refresh(device)
    return device


@router.delete("/{device_id}", status_code=204)
async def delete_network_device(device_id: str, db: AsyncSession = Depends(get_db)) -> None:
    device = await db.get(NetworkDevice, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Network device not found")
    await db.delete(device)
    await db.commit()


@router.post("/{device_id}/sync-dataset", response_model=SyncDatasetResponse)
async def sync_network_device_dataset(
    device_id: str,
    payload: SyncDatasetRequest,
    db: AsyncSession = Depends(get_db),
) -> SyncDatasetResponse:
    device = await db.get(NetworkDevice, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Network device not found")

    binding = next(
        (
            item
            for item in (device.dataset_bindings or [])
            if item.get("capabilityKey") == payload.capability_key
        ),
        None,
    )
    if not binding:
        raise HTTPException(status_code=404, detail=f"No binding for {payload.capability_key}")

    connector_id = binding.get("connectorId")
    if not connector_id:
        raise HTTPException(status_code=400, detail="Dataset has no connector mapped")

    connector = await db.get(DataConnector, connector_id)
    if not connector:
        raise HTTPException(status_code=400, detail=f"Unknown connector: {connector_id}")

    try:
        _, row_count = await sync_device_dataset(device, connector, payload.capability_key)
    except DatasetSyncError as exc:
        await db.commit()
        await db.refresh(device)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": str(exc),
                "device": NetworkDeviceRead.model_validate(device).model_dump(mode="json"),
                "row_count": 0,
            },
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Sync failed: {exc}") from exc

    await db.commit()
    await db.refresh(device)
    return SyncDatasetResponse(device=device, row_count=row_count)
