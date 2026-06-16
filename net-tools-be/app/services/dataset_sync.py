"""Live dataset sync from network devices into dataset_data."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy.orm.attributes import flag_modified

from app.models import DataConnector, NetworkDevice
from app.services.mikrotik_api_client import MikrotikApiClient
from app.services.mikrotik_rest_client import fetch_mikrotik_rest_capability


class DatasetSyncError(Exception):
    def __init__(self, message: str, *, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


def _binding_for_capability(device: NetworkDevice, capability_key: str) -> dict[str, Any]:
    for binding in device.dataset_bindings or []:
        if binding.get("capabilityKey") == capability_key:
            return binding
    raise DatasetSyncError(f"No dataset binding for capability: {capability_key}", status_code=404)


def _connector_auth(device: NetworkDevice, connector_id: str) -> dict[str, Any]:
    auth = (device.connector_auth or {}).get(connector_id)
    if not auth:
        raise DatasetSyncError(
            f"Missing connector credentials for {connector_id}. Configure auth on the device.",
            status_code=400,
        )
    return auth


def _parse_port(auth: dict[str, Any], default: int | None) -> int | None:
    raw = str(auth.get("apiPort") or "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def count_dataset_rows(payload: Any) -> int:
    if isinstance(payload, dict) and "primary" in payload:
        primary = payload.get("primary")
        return len(primary) if isinstance(primary, list) else 0
    if isinstance(payload, list):
        return len(payload)
    return 0


async def fetch_live_dataset(
    device: NetworkDevice,
    connector: DataConnector,
    capability_key: str,
) -> Any:
    if capability_key not in (connector.capability_keys or []):
        raise DatasetSyncError(
            f"Connector {connector.id} does not support capability {capability_key}",
            status_code=400,
        )

    auth = _connector_auth(device, connector.id)
    username = str(auth.get("apiUser") or "").strip()
    password = str(auth.get("apiPassword") or "")
    if not username:
        raise DatasetSyncError("API username is required on the device connector auth.", status_code=400)

    parser_id = connector.parser_id or ""

    if parser_id == "mikrotik-rest-v1" or connector.id == "conn-mikrotik-rest":
        port = _parse_port(auth, connector.default_port)
        try:
            return await fetch_mikrotik_rest_capability(
                device.ip,
                username,
                password,
                capability_key,
                port=port,
                endpoint_pattern=connector.endpoint_pattern or "",
            )
        except httpx.HTTPError as exc:
            raise DatasetSyncError(f"MikroTik REST request failed: {exc}", status_code=502) from exc

    if parser_id == "mikrotik-api-v1" or connector.id == "conn-mikrotik-api":
        port = _parse_port(auth, connector.default_port or 8728) or 8728
        use_ssl = (connector.endpoint_pattern or "").lower().startswith("tls://")

        def _fetch_api() -> Any:
            with MikrotikApiClient(
                device.ip,
                username,
                password,
                port=port,
                use_ssl=use_ssl,
            ) as client:
                return client.fetch_capability(capability_key)

        try:
            return await asyncio.to_thread(_fetch_api)
        except Exception as exc:
            raise DatasetSyncError(f"MikroTik API request failed: {exc}", status_code=502) from exc

    raise DatasetSyncError(
        f"Live sync is not implemented for connector parser: {parser_id or connector.protocol}",
        status_code=501,
    )


def apply_sync_result(
    device: NetworkDevice,
    capability_key: str,
    payload: Any,
    *,
    error: str | None = None,
) -> None:
    bindings = list(device.dataset_bindings or [])
    dataset_data = dict(device.dataset_data or {})
    now = datetime.now(timezone.utc).isoformat()

    next_bindings: list[dict[str, Any]] = []
    updated = False
    for binding in bindings:
        if binding.get("capabilityKey") != capability_key:
            next_bindings.append(dict(binding))
            continue
        patch: dict[str, Any] = dict(binding)
        if error:
            patch["syncStatus"] = "error"
            patch["syncMessage"] = error
        else:
            dataset_data[capability_key] = payload
            patch["rowCount"] = count_dataset_rows(payload)
            patch["lastSyncAt"] = now
            patch["syncStatus"] = "ok"
            patch["syncMessage"] = None
        next_bindings.append(patch)
        updated = True

    if not updated:
        raise DatasetSyncError(f"No dataset binding for capability: {capability_key}", status_code=404)

    device.dataset_bindings = next_bindings
    flag_modified(device, "dataset_bindings")
    if not error:
        device.dataset_data = dataset_data
        flag_modified(device, "dataset_data")


async def sync_device_dataset(
    device: NetworkDevice,
    connector: DataConnector,
    capability_key: str,
) -> tuple[Any, int]:
    binding = _binding_for_capability(device, capability_key)
    if binding.get("source") != "live":
        raise DatasetSyncError(
            f"Dataset {capability_key} is not configured for live sync.",
            status_code=400,
        )
    connector_id = binding.get("connectorId")
    if not connector_id:
        raise DatasetSyncError(
            f"Dataset {capability_key} has no connector mapped.",
            status_code=400,
        )
    if connector_id != connector.id:
        raise DatasetSyncError("Connector mismatch for dataset binding.", status_code=400)

    payload = await fetch_live_dataset(device, connector, capability_key)
    apply_sync_result(device, capability_key, payload)
    return payload, count_dataset_rows(payload)
