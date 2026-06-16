"""Match DataConnector records to MikroTik REST vs legacy API sync handlers."""

from __future__ import annotations

from app.models import DataConnector

MIKROTIK_REST_PARSERS = frozenset({"mikrotik-rest-v1", "mikrotik-rest"})
MIKROTIK_API_PARSERS = frozenset({"mikrotik-api-v1", "mikrotik-api"})


def _vendor_is_mikrotik(connector: DataConnector) -> bool:
    return "mikrotik" in (connector.vendor or "").lower()


def is_mikrotik_rest_connector(connector: DataConnector) -> bool:
    parser_id = (connector.parser_id or "").lower()
    if parser_id in MIKROTIK_REST_PARSERS:
        return True
    if connector.id == "conn-mikrotik-rest":
        return True
    return connector.protocol == "rest" and _vendor_is_mikrotik(connector)


def is_mikrotik_legacy_api_connector(connector: DataConnector) -> bool:
    parser_id = (connector.parser_id or "").lower()
    if parser_id in MIKROTIK_API_PARSERS:
        return True
    if connector.id == "conn-mikrotik-api":
        return True
    return connector.protocol == "api" and _vendor_is_mikrotik(connector)
