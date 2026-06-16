"""MikroTik dataset → REST resource and legacy API path (librouteros)."""

from __future__ import annotations

MIKROTIK_API_PATHS: dict[str, str] = {
    "routing_table": "ip/route",
    "interfaces": "interface",
    "firewall_filter": "ip/firewall/filter",
    "firewall_nat": "ip/firewall/nat",
    "address_lists": "ip/firewall/address-list",
}

MIKROTIK_API_COMPANION_PATHS: dict[str, str] = {
    "interfaces": "ip/address",
}

MIKROTIK_API_COMMANDS: dict[str, str] = {
    "routing_table": "/ip/route/print",
    "interfaces": "/interface/print",
    "firewall_filter": "/ip/firewall/filter/print",
    "firewall_nat": "/ip/firewall/nat/print",
    "address_lists": "/ip/firewall/address-list/print",
}

MIKROTIK_REST_RESOURCES: dict[str, str] = dict(MIKROTIK_API_PATHS)

MIKROTIK_REST_COMPANION: dict[str, str] = dict(MIKROTIK_API_COMPANION_PATHS)
