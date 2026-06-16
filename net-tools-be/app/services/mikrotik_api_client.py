"""
MikroTik RouterOS legacy API client (TCP 8728 / TLS 8729).

Binary sentence protocol — same commands as CLI/API docs (/ip/route/print).
Uses librouteros (see MikroTik Python3 example:
https://manual.mikrotik.com/docs/developer-guides/api/python3-example)

REST alternative: mikrotik_rest_client (future) on www/www-ssl ports.
"""

from __future__ import annotations

from typing import Any

from librouteros import connect

from app.services.mikrotik_dataset_paths import (
    MIKROTIK_API_COMPANION_PATHS,
    MIKROTIK_API_PATHS,
)

DEFAULT_API_PORT = 8728
DEFAULT_API_SSL_PORT = 8729


def _serialize_value(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def _serialize_row(row: dict[Any, Any]) -> dict[str, Any]:
    return {str(k): _serialize_value(v) for k, v in row.items()}


class MikrotikApiClient:
    def __init__(
        self,
        host: str,
        username: str,
        password: str,
        *,
        port: int = DEFAULT_API_PORT,
        use_ssl: bool = False,
    ) -> None:
        self.host = host
        self.username = username
        self.password = password
        self.port = DEFAULT_API_SSL_PORT if use_ssl else port
        self.use_ssl = use_ssl
        self._api = None

    def __enter__(self) -> MikrotikApiClient:
        kwargs: dict[str, Any] = {
            "username": self.username,
            "password": self.password,
            "host": self.host,
            "port": self.port,
        }
        if self.use_ssl:
            import ssl

            kwargs["ssl_wrapper"] = ssl.wrap_socket

        self._api = connect(**kwargs)
        return self

    def __exit__(self, *args: object) -> None:
        if self._api is not None:
            self._api.close()
            self._api = None

    def print_path(self, api_path: str) -> list[dict[str, Any]]:
        if self._api is None:
            raise RuntimeError("MikrotikApiClient is not connected")
        return [_serialize_row(dict(row)) for row in self._api.path(api_path)]

    def fetch_capability(self, capability_key: str) -> list[dict[str, Any]]:
        api_path = MIKROTIK_API_PATHS.get(capability_key)
        if not api_path:
            raise ValueError(f"Unsupported MikroTik API capability: {capability_key}")
        rows = self.print_path(api_path)
        companion = MIKROTIK_API_COMPANION_PATHS.get(capability_key)
        if companion:
            # Stored alongside for mappers that need join (e.g. interface + ip/address)
            return {
                "primary": rows,
                "companion": self.print_path(companion),
            }  # type: ignore[return-value]
        return rows


def fetch_mikrotik_api_datasets(
    host: str,
    username: str,
    password: str,
    capability_keys: list[str],
    *,
    port: int = DEFAULT_API_PORT,
    use_ssl: bool = False,
) -> dict[str, list[dict[str, Any]] | dict[str, list[dict[str, Any]]]]:
    """Fetch multiple datasets in one API session."""
    out: dict[str, Any] = {}
    with MikrotikApiClient(
        host, username, password, port=port, use_ssl=use_ssl
    ) as client:
        for key in capability_keys:
            out[key] = client.fetch_capability(key)
    return out
