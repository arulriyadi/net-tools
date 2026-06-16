"""MikroTik RouterOS REST client (HTTP/HTTPS www service)."""

from __future__ import annotations

from typing import Any

import httpx

from app.services.mikrotik_dataset_paths import (
    MIKROTIK_REST_COMPANION,
    MIKROTIK_REST_RESOURCES,
)

DEFAULT_HTTP_PORT = 80
DEFAULT_HTTPS_PORT = 443
REST_TIMEOUT = 30.0


def _rest_scheme(endpoint_pattern: str) -> str:
    lower = (endpoint_pattern or "").lower()
    return "https" if lower.startswith("https://") else "http"


def _rest_url(host: str, port: int, resource: str, *, use_https: bool) -> str:
    scheme = "https" if use_https else "http"
    return f"{scheme}://{host}:{port}/rest/{resource}"


async def fetch_rest_resource(
    host: str,
    username: str,
    password: str,
    resource: str,
    *,
    port: int | None = None,
    use_https: bool | None = None,
    endpoint_pattern: str = "",
) -> list[dict[str, Any]]:
    if use_https is None:
        use_https = _rest_scheme(endpoint_pattern) == "https"
    if port is None:
        port = DEFAULT_HTTPS_PORT if use_https else DEFAULT_HTTP_PORT

    url = _rest_url(host, port, resource, use_https=use_https)
    async with httpx.AsyncClient(timeout=REST_TIMEOUT, verify=False) as client:
        try:
            response = await client.get(url, auth=(username, password))
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ValueError(
                f"HTTP {exc.response.status_code} from {url}: {exc.response.text[:200]}"
            ) from exc
        except httpx.HTTPError as exc:
            raise ValueError(f"Request failed for {url}: {exc}") from exc
        data = response.json()

    if not isinstance(data, list):
        raise ValueError(f"Expected JSON array from {url}, got {type(data).__name__}")
    return data


async def fetch_mikrotik_rest_capability(
    host: str,
    username: str,
    password: str,
    capability_key: str,
    *,
    port: int | None = None,
    endpoint_pattern: str = "",
) -> list[dict[str, Any]] | dict[str, Any]:
    resource = MIKROTIK_REST_RESOURCES.get(capability_key)
    if not resource:
        raise ValueError(f"Unsupported MikroTik REST capability: {capability_key}")

    use_https = _rest_scheme(endpoint_pattern) == "https"
    rows = await fetch_rest_resource(
        host,
        username,
        password,
        resource,
        port=port,
        use_https=use_https,
        endpoint_pattern=endpoint_pattern,
    )

    companion = MIKROTIK_REST_COMPANION.get(capability_key)
    if companion:
        companion_rows = await fetch_rest_resource(
            host,
            username,
            password,
            companion,
            port=port,
            use_https=use_https,
            endpoint_pattern=endpoint_pattern,
        )
        return {"primary": rows, "companion": companion_rows}

    return rows
