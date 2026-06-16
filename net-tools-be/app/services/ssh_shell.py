import asyncio
import json
import logging

from fastapi import WebSocket, WebSocketDisconnect

from app.config import get_settings
from app.models import Server
from app.services.ssh import SSHError

logger = logging.getLogger(__name__)


async def run_ssh_shell_bridge(websocket: WebSocket, server: Server) -> None:
    import asyncssh

    if not server.ssh_key_path:
        await websocket.send_text("\r\n\x1b[31mNo SSH key configured for this device.\x1b[0m\r\n")
        await websocket.close(code=4401, reason="No SSH key")
        return

    settings = get_settings()
    key_path = settings.resolve_path(server.ssh_key_path)
    if not key_path.exists():
        await websocket.send_text(f"\r\n\x1b[31mSSH key not found: {key_path}\x1b[0m\r\n")
        await websocket.close(code=4401, reason="SSH key missing")
        return

    process = None
    conn = None

    try:
        conn = await asyncssh.connect(
            server.ip,
            username=server.ssh_user or "root",
            client_keys=[str(key_path)],
            known_hosts=None,
        )
        process = await conn.create_process(term_type="xterm", term_size=(120, 32), encoding="utf-8")
        await websocket.send_text(
            f"\r\n\x1b[90mConnected to {server.name} ({server.ip}) as {server.ssh_user or 'root'}\x1b[0m\r\n"
        )

        async def ssh_to_ws() -> None:
            assert process is not None
            while True:
                data = await process.stdout.read(4096)
                if not data:
                    break
                await websocket.send_text(data)

        async def ws_to_ssh() -> None:
            assert process is not None
            while True:
                message = await websocket.receive_text()
                try:
                    payload = json.loads(message)
                except json.JSONDecodeError:
                    process.stdin.write(message)
                    continue

                msg_type = payload.get("type")
                if msg_type == "input":
                    process.stdin.write(payload.get("data", ""))
                elif msg_type == "resize":
                    cols = int(payload.get("cols", 80))
                    rows = int(payload.get("rows", 24))
                    process.change_terminal_size(cols, rows)

        await asyncio.gather(ssh_to_ws(), ws_to_ssh())
    except WebSocketDisconnect:
        pass
    except (asyncssh.Error, OSError, SSHError) as exc:
        logger.warning("Shell session failed for server %s: %s", server.id, exc)
        try:
            await websocket.send_text(f"\r\n\x1b[31mShell error: {exc}\x1b[0m\r\n")
        except Exception:
            pass
    finally:
        if process is not None:
            process.close()
        if conn is not None:
            conn.close()
        try:
            await websocket.close()
        except Exception:
            pass
