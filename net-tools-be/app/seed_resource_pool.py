from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DataConnector, DeviceType

SEED_CONNECTORS: list[dict] = [
    {
        "id": "conn-mikrotik-rest",
        "name": "MikroTik RouterOS REST",
        "vendor": "MikroTik",
        "protocol": "rest",
        "compatible_categories": ["router"],
        "capability_keys": ["routing_table", "interfaces", "firewall_filter", "firewall_nat", "address_lists"],
        "description": (
            "RouterOS v7+ REST API. Live routing table, interfaces, firewall filter/NAT, and address lists. "
            "Endpoints: ip/route, interface, ip/firewall/filter, ip/firewall/nat, ip/firewall/address-list."
        ),
        "default_port": 443,
        "endpoint_pattern": "https://{host}/rest/{resource}",
        "auth_methods": ["basic", "bearer"],
        "poll_mode": "interval",
        "default_interval_minutes": 5,
        "parser_id": "mikrotik-rest-v1",
        "router_os_version": "7",
        "status": "active",
    },
    {
        "id": "conn-mikrotik-api",
        "name": "MikroTik RouterOS API",
        "vendor": "MikroTik",
        "protocol": "api",
        "compatible_categories": ["router"],
        "capability_keys": [
            "routing_table",
            "interfaces",
            "firewall_filter",
            "firewall_nat",
            "address_lists",
        ],
        "description": (
            "Legacy RouterOS API (TCP 8728 plain, 8729 TLS). Fallback when HTTP/REST is disabled. "
            "Uses /ip/route/print and related API commands."
        ),
        "default_port": 8728,
        "endpoint_pattern": "tcp://{host}:8728 · {api_command}",
        "auth_methods": ["basic"],
        "poll_mode": "interval",
        "default_interval_minutes": 5,
        "parser_id": "mikrotik-api-v1",
        "router_os_version": "6",
        "status": "active",
    },
    {
        "id": "conn-mikrotik-snmp",
        "name": "MikroTik SNMP",
        "vendor": "MikroTik",
        "protocol": "snmp",
        "compatible_categories": ["router", "switch"],
        "capability_keys": ["interfaces", "snmp_metrics"],
        "description": (
            "SNMP polling for interface status, counters, and basic telemetry. "
            "Community or SNMPv3 configured per device."
        ),
        "default_port": 161,
        "endpoint_pattern": "UDP/{host}:161 · OID set mikrotik-if-mib",
        "auth_methods": ["snmp_v2c", "snmp_v3"],
        "poll_mode": "interval",
        "default_interval_minutes": 1,
        "parser_id": "mikrotik-snmp-v1",
        "status": "active",
    },
    {
        "id": "conn-palo-xml-api",
        "name": "Palo Alto XML API",
        "vendor": "Palo Alto Networks",
        "protocol": "api",
        "compatible_categories": ["firewall"],
        "capability_keys": [
            "security_rules",
            "nat_rules",
            "address_objects",
            "static_routes",
            "service_objects",
        ],
        "description": (
            "PAN-OS XML API for live policy and object retrieval. "
            "API key from device; no CSV required for supported datasets."
        ),
        "default_port": 443,
        "endpoint_pattern": "https://{host}/api/?type=config&action=show&key={api_key}",
        "auth_methods": ["api_key"],
        "poll_mode": "interval",
        "default_interval_minutes": 15,
        "parser_id": "palo-xml-api-v1",
        "status": "active",
    },
    {
        "id": "conn-cisco-ssh-show",
        "name": "Cisco IOS SSH Show Parser",
        "vendor": "Cisco",
        "protocol": "ssh",
        "compatible_categories": ["router", "switch"],
        "capability_keys": ["routing_table", "interfaces"],
        "description": (
            "SSH session running show commands; output parsed to structured rows. "
            "Credentials from Keychain on each device."
        ),
        "default_port": 22,
        "endpoint_pattern": "ssh {user}@{host} · show ip route · show ip interface brief",
        "auth_methods": ["ssh_key", "ssh_password"],
        "poll_mode": "on_demand",
        "default_interval_minutes": None,
        "parser_id": "cisco-ios-show-v1",
        "status": "active",
    },
    {
        "id": "conn-arista-eapi",
        "name": "Arista EOS eAPI",
        "vendor": "Arista",
        "protocol": "rest",
        "compatible_categories": ["switch"],
        "capability_keys": ["vlans", "interfaces", "mac_table"],
        "description": "JSON-RPC eAPI for VLAN, interface, and MAC table collection on EOS switches.",
        "default_port": 443,
        "endpoint_pattern": "https://{host}/command-api",
        "auth_methods": ["basic"],
        "poll_mode": "interval",
        "default_interval_minutes": 10,
        "parser_id": "arista-eapi-v1",
        "status": "draft",
    },
]

FIREWALL_CAPS = [
    {
        "key": "security_rules",
        "label": "Security Rules",
        "description": "Policy security rulebase export from Palo Alto Web UI or API.",
        "import_kind": "csv",
        "file_hint": "export_policies_security_rulebase_*.csv",
        "enabled": True,
    },
    {
        "key": "nat_rules",
        "label": "NAT Rules",
        "description": "NAT policy rulebase — source, destination, and static NAT translations.",
        "import_kind": "csv",
        "file_hint": "export_policies_nat_rulebase_*.csv",
        "enabled": True,
    },
    {
        "key": "address_objects",
        "label": "Address Objects",
        "description": "Address object export used by routes, NAT, and security policies.",
        "import_kind": "csv",
        "file_hint": "export_objects_addresses_*.csv",
        "enabled": True,
    },
    {
        "key": "static_routes",
        "label": "Static Routes",
        "description": "Static route table from browser export script or API.",
        "import_kind": "script_csv",
        "file_hint": "static-routes-export-*.csv",
        "enabled": True,
    },
    {
        "key": "service_objects",
        "label": "Service Objects",
        "description": "Service / port object definitions.",
        "import_kind": "csv",
        "file_hint": "export_objects_services_*.csv",
        "enabled": True,
    },
    {
        "key": "interfaces",
        "label": "Interfaces",
        "description": "Interface inventory with IP, VLAN, and status.",
        "import_kind": "csv",
        "file_hint": "show interfaces brief export",
        "enabled": False,
    },
]

ROUTER_CAPS = [
    {
        "key": "routing_table",
        "label": "Routing Table",
        "description": "Full IPv4/IPv6 routing table — static, dynamic, connected, and gateway routes.",
        "import_kind": "api",
        "file_hint": "REST ip/route · API /ip/route/print",
        "enabled": True,
    },
    {
        "key": "interfaces",
        "label": "Interfaces",
        "description": "Interface inventory with type, MTU, MAC, IP, and running state.",
        "import_kind": "api",
        "file_hint": "REST interface · API /interface/print",
        "enabled": True,
    },
    {
        "key": "firewall_filter",
        "label": "Firewall Filter Rules",
        "description": "Filter chains (input / forward / output) — policy allow/drop/jump rules.",
        "import_kind": "api",
        "file_hint": "REST ip/firewall/filter · API /ip/firewall/filter/print",
        "enabled": True,
    },
    {
        "key": "firewall_nat",
        "label": "Firewall NAT",
        "description": "NAT rules — srcnat, dstnat, masquerade, netmap, and translations.",
        "import_kind": "api",
        "file_hint": "REST ip/firewall/nat · API /ip/firewall/nat/print",
        "enabled": True,
    },
    {
        "key": "address_lists",
        "label": "Address Lists",
        "description": "Named address lists used by firewall filter and NAT rules.",
        "import_kind": "api",
        "file_hint": "REST ip/firewall/address-list · API /ip/firewall/address-list/print",
        "enabled": True,
    },
]

SWITCH_CAPS = [
    {
        "key": "vlans",
        "label": "VLANs",
        "description": "VLAN database and membership.",
        "import_kind": "csv",
        "file_hint": "show vlan brief export",
        "enabled": True,
    },
    {
        "key": "interfaces",
        "label": "Interfaces",
        "description": "Interface inventory with IP, VLAN, and status.",
        "import_kind": "csv",
        "file_hint": "show interfaces brief export",
        "enabled": True,
    },
    {
        "key": "mac_table",
        "label": "MAC Address Table",
        "description": "Layer-2 forwarding table.",
        "import_kind": "csv",
        "file_hint": "show mac address-table export",
        "enabled": False,
    },
]

SEED_DEVICE_TYPES: list[dict] = [
    {
        "id": "dt-palo-alto-fw",
        "name": "Palo Alto Networks Firewall",
        "vendor": "Palo Alto Networks",
        "category": "firewall",
        "description": (
            "PA-OS firewalls (PA-3200, PA-5200, VM-Series). "
            "Data via CSV export or browser script for static routes."
        ),
        "capabilities": FIREWALL_CAPS,
        "connector_ids": ["conn-palo-xml-api"],
    },
    {
        "id": "dt-fortinet-fw",
        "name": "Fortinet FortiGate",
        "vendor": "Fortinet",
        "category": "firewall",
        "description": "FortiGate physical and VM appliances. CSV import from configuration backup exports.",
        "capabilities": [cap for cap in FIREWALL_CAPS if cap["key"] != "static_routes"],
        "connector_ids": [],
    },
    {
        "id": "dt-cisco-ios-router",
        "name": "Cisco IOS / IOS-XE Router",
        "vendor": "Cisco",
        "category": "router",
        "description": "Branch and core routers. Routing table and interface exports from show commands.",
        "capabilities": [cap for cap in ROUTER_CAPS if cap["key"] in ("routing_table", "interfaces")],
        "connector_ids": ["conn-cisco-ssh-show"],
    },
    {
        "id": "dt-mikrotik-routeros",
        "name": "MikroTik RouterOS",
        "vendor": "MikroTik",
        "category": "router",
        "description": (
            "CCR, RB, and CHR routers. RouterOS v7+ via REST API; v6 via legacy API (TCP 8728). "
            "Routing, interfaces, firewall filter/NAT, address lists."
        ),
        "capabilities": ROUTER_CAPS,
        "connector_ids": ["conn-mikrotik-rest", "conn-mikrotik-api", "conn-mikrotik-snmp"],
    },
    {
        "id": "dt-arista-switch",
        "name": "Arista EOS Switch",
        "vendor": "Arista",
        "category": "switch",
        "description": "Data center and campus switches. VLAN and interface CSV from EOS CLI exports.",
        "capabilities": SWITCH_CAPS,
        "connector_ids": ["conn-arista-eapi"],
    },
]


async def seed_resource_pool(db: AsyncSession) -> None:
    result = await db.execute(select(DataConnector.id).limit(1))
    if result.scalar_one_or_none() is not None:
        return

    for item in SEED_CONNECTORS:
        db.add(DataConnector(**item))
    await db.flush()

    for item in SEED_DEVICE_TYPES:
        db.add(DeviceType(**item))
    await db.commit()
