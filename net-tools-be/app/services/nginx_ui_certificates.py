from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Server
from app.schemas.nginx_ui_certificate import NginxUiCertificateInfoRead, NginxUiCertificateRead
from app.services.credentials import decrypt_secret
from app.services.nginx_ui_client import NginxUiApiError, fetch_certs, login

_AUTO_CERT_LABELS: dict[int, str] = {
    1: "enabled",
    -1: "disabled",
    2: "sync",
    3: "self-signed",
}


def _parse_datetime(value: Any) -> datetime | None:
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


def _auto_cert_label(value: Any) -> str:
    if isinstance(value, int):
        return _AUTO_CERT_LABELS.get(value, str(value))
    if value is None:
        return "unknown"
    return str(value)


def _normalize_certificate_info(raw: Any) -> NginxUiCertificateInfoRead | None:
    if not isinstance(raw, dict):
        return None
    return NginxUiCertificateInfoRead(
        subject_name=str(raw["subject_name"]) if raw.get("subject_name") else None,
        issuer_name=str(raw["issuer_name"]) if raw.get("issuer_name") else None,
        not_before=_parse_datetime(raw.get("not_before")),
        not_after=_parse_datetime(raw.get("not_after")),
    )


def _normalize_certificate(cert: dict[str, Any]) -> NginxUiCertificateRead:
    domains = cert.get("domains") or []
    if not isinstance(domains, list):
        domains = []

    return NginxUiCertificateRead(
        id=int(cert.get("id") or 0),
        name=str(cert.get("name") or "—"),
        domains=[str(domain) for domain in domains if domain],
        filename=str(cert["filename"]) if cert.get("filename") else None,
        ssl_certificate_path=str(cert["ssl_certificate_path"])
        if cert.get("ssl_certificate_path")
        else None,
        auto_cert=_auto_cert_label(cert.get("auto_cert")),
        challenge_method=str(cert["challenge_method"]) if cert.get("challenge_method") else None,
        status=str(cert["status"]) if cert.get("status") else None,
        last_error=str(cert["last_error"]) if cert.get("last_error") else None,
        certificate_info=_normalize_certificate_info(cert.get("certificate_info")),
    )


async def list_certificates_for_server(
    db: AsyncSession,
    server_id: int,
) -> list[NginxUiCertificateRead]:
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
        raw_certs = await fetch_certs(connection.panel_url, session.token)
        connection.api_connected = True
        connection.last_login_at = datetime.now(timezone.utc)
        connection.last_error = None
        await db.commit()
    except NginxUiApiError as exc:
        connection.api_connected = False
        connection.last_error = str(exc)
        await db.commit()
        raise

    return [_normalize_certificate(cert) for cert in raw_certs if isinstance(cert, dict)]
