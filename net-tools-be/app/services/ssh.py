import asyncio
from collections.abc import Awaitable, Callable
from pathlib import Path

import asyncssh

OnLogLine = Callable[[str], Awaitable[None] | None]


class SSHError(Exception):
    pass


async def _emit_line(on_line: OnLogLine | None, line: str) -> None:
    if not on_line or not line:
        return
    maybe = on_line(line)
    if asyncio.iscoroutine(maybe):
        await maybe


async def run_ssh_command(
    host: str,
    command: str,
    *,
    user: str = "root",
    key_path: str | Path | None = None,
    timeout: int = 60,
) -> tuple[int, str, str]:
    connect_kwargs: dict = {
        "host": host,
        "username": user,
        "known_hosts": None,
    }
    if key_path:
        connect_kwargs["client_keys"] = [str(key_path)]

    try:
        async with asyncssh.connect(**connect_kwargs) as conn:
            result = await asyncio.wait_for(conn.run(command, check=False), timeout=timeout)
            return result.exit_status or 0, result.stdout or "", result.stderr or ""
    except asyncio.TimeoutError as exc:
        raise SSHError(f"SSH timeout after {timeout}s on {host}") from exc
    except (asyncssh.Error, OSError) as exc:
        raise SSHError(f"SSH failed on {host}: {exc}") from exc


async def run_ssh_command_streaming(
    host: str,
    command: str,
    *,
    user: str = "root",
    key_path: str | Path | None = None,
    timeout: int = 600,
    on_line: OnLogLine | None = None,
) -> tuple[int, str, str]:
    """Run remote command and invoke on_line for each stdout/stderr line as it arrives."""
    connect_kwargs: dict = {
        "host": host,
        "username": user,
        "known_hosts": None,
    }
    if key_path:
        connect_kwargs["client_keys"] = [str(key_path)]

    stdout_parts: list[str] = []
    stderr_parts: list[str] = []

    def _line_text(line: str | bytes) -> str:
        if isinstance(line, bytes):
            return line.decode(errors="replace").rstrip("\n\r")
        return str(line).rstrip("\n\r")

    async def read_stream(stream, *, stderr: bool = False) -> None:
        while True:
            line = await stream.readline()
            if not line:
                break
            text = _line_text(line)
            if stderr:
                stderr_parts.append(text)
                await _emit_line(on_line, f"[stderr] {text}")
            else:
                stdout_parts.append(text)
                await _emit_line(on_line, text)

    try:
        async with asyncssh.connect(**connect_kwargs) as conn:
            proc = await conn.create_process(command)
            await asyncio.wait_for(
                asyncio.gather(
                    read_stream(proc.stdout),
                    read_stream(proc.stderr, stderr=True),
                    proc.wait(),
                ),
                timeout=timeout,
            )
            code = proc.exit_status or 0
            return code, "\n".join(stdout_parts), "\n".join(stderr_parts)
    except asyncio.TimeoutError as exc:
        raise SSHError(f"SSH timeout after {timeout}s on {host}") from exc
    except (asyncssh.Error, OSError) as exc:
        raise SSHError(f"SSH failed on {host}: {exc}") from exc
