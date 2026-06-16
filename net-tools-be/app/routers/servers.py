from fastapi import APIRouter, Depends, HTTPException, WebSocket
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import SessionLocal, get_db
from app.models import CveAssessment, Job, Server
from app.schemas.server import ServerCreate, ServerRead, ServerUpdate
from app.services.ssh_shell import run_ssh_shell_bridge

router = APIRouter(prefix="/api/servers", tags=["servers"])


@router.get("", response_model=list[ServerRead])
async def list_servers(db: AsyncSession = Depends(get_db)) -> list[Server]:
    result = await db.execute(select(Server).order_by(Server.name))
    return list(result.scalars().all())


@router.post("", response_model=ServerRead, status_code=201)
async def create_server(payload: ServerCreate, db: AsyncSession = Depends(get_db)) -> Server:
    server = Server(**payload.model_dump())
    db.add(server)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Server with this name or IP already exists",
        ) from exc
    await db.refresh(server)
    return server


@router.get("/{server_id}", response_model=ServerRead)
async def get_server(server_id: int, db: AsyncSession = Depends(get_db)) -> Server:
    server = await db.get(Server, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server


@router.patch("/{server_id}", response_model=ServerRead)
async def update_server(
    server_id: int,
    payload: ServerUpdate,
    db: AsyncSession = Depends(get_db),
) -> Server:
    server = await db.get(Server, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return server

    for field, value in updates.items():
        setattr(server, field, value)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Server with this name or IP already exists",
        ) from exc
    await db.refresh(server)
    return server


@router.delete("/{server_id}", status_code=204)
async def delete_server(server_id: int, db: AsyncSession = Depends(get_db)) -> None:
    server = await db.get(Server, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    await db.execute(delete(Job).where(Job.server_id == server_id))
    await db.execute(delete(CveAssessment).where(CveAssessment.server_id == server_id))
    await db.delete(server)
    await db.commit()


@router.websocket("/{server_id}/shell")
async def server_shell(websocket: WebSocket, server_id: int) -> None:
    await websocket.accept()
    async with SessionLocal() as db:
        server = await db.get(Server, server_id)
        if not server:
            await websocket.close(code=4404, reason="Server not found")
            return
        await run_ssh_shell_bridge(websocket, server)
