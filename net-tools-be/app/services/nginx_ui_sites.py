from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Server
from app.schemas.nginx_ui_site import NginxUiSiteRead
from app.services.credentials import decrypt_secret
from app.services.nginx_ui_client import NginxUiApiError, fetch_sites, login


def _format_proxy_target(site: dict[str, Any]) -> str | None:
    targets = site.get("proxy_targets") or []
    if not isinstance(targets, list) or not targets:
        return None

    parts: list[str] = []
    for target in targets[:3]:
        if not isinstance(target, dict):
            continue
        host = str(target.get("host") or "").strip()
        port = str(target.get("port") or "").strip()
        if host and port:
            parts.append(f"{host}:{port}")
        elif host:
            parts.append(host)
    if not parts:
        return None
    suffix = f" (+{len(targets) - len(parts)} more)" if len(targets) > len(parts) else ""
    return ", ".join(parts) + suffix


def _parse_modified_at(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _normalize_site(site: dict[str, Any]) -> NginxUiSiteRead:
    urls = site.get("urls") or []
    if not isinstance(urls, list):
        urls = []

    return NginxUiSiteRead(
        name=str(site.get("name") or "—"),
        status=str(site.get("status") or "unknown"),
        urls=[str(url) for url in urls if url],
        proxy_target=_format_proxy_target(site),
        modified_at=_parse_modified_at(site.get("modified_at")),
    )


async def list_sites_for_server(db: AsyncSession, server_id: int) -> list[NginxUiSiteRead]:
    server = await db.get(
        Server,
        server_id,
        options=(selectinload(Server.nginx_ui_connection),),
    )
    if not server:
        raise NginxUiApiError("Server not found")
    if not server.nginx_monitored:
        raise NginxUiApiError("Server is not an nginx-ui monitor")

    connection = server.nginx_ui_connection
    if not connection:
        raise NginxUiApiError("No nginx-ui credentials configured for this server")

    password = decrypt_secret(connection.password_encrypted)
    try:
        session = await login(connection.panel_url, connection.username, password)
        raw_sites = await fetch_sites(connection.panel_url, session.token)
        connection.api_connected = True
        connection.last_login_at = datetime.now(timezone.utc)
        connection.last_error = None
        await db.commit()
    except NginxUiApiError as exc:
        connection.api_connected = False
        connection.last_error = str(exc)
        await db.commit()
        raise

    return [_normalize_site(site) for site in raw_sites if isinstance(site, dict)]
