# Net-Tools

Platform web internal untuk **operasi infrastruktur jaringan** — health check Nginx, inventaris perangkat, eksplorasi firewall Palo Alto, dan modul pendukung (DNS, IPAM, Net-Mon). Dibangun untuk kebutuhan operasional **Diskominfo Provinsi Jawa Barat**.

Stack: **Next.js 16 + React 19** (dashboard + API routes) dengan **PostgreSQL** untuk data persisten (device inventory, jobs, firewall datasets).

UI awalnya diekspor dari [v0 net-tools-dashboard](https://v0.app/chat/net-tools-dashboard-bTmgthxtYYq); modul Resource Pool, Firewall, dan Nginx sudah aktif.

---

## Highlights

| Area | What you get |
|------|----------------|
| **Nginx Management** | Health check via SSH, security scan, upgrade jobs, PDF reports, Nginx UI proxy (sites, certs, metrics), interactive shell (WebSocket). |
| **Resource Pool** | Central device inventory — firewalls, routers, servers, connectors; per-device dataset bindings (CSV import or live API). |
| **Firewall Management** | Palo Alto explorer: security rules, NAT, static routes, address objects, service objects — search, filter, sort, export CSV, incremental scroll. |
| **Router Management** | MikroTik RouterOS from device inventory — routing table, interfaces, firewall filter/NAT, address lists; live sync via REST or Legacy API. |
| **Hybrid data mode** | Import Palo CSV exports today; MikroTik datasets sync live per capability when connectors are configured. |
| **Job history** | Long-running tasks (checks, upgrades, scans) persisted with downloadable reports. |

### Firewall → Rule Categories

Per firewall device:

- **Security Rules** — filter/sort/export, disabled rule styling, multi-value cells
- **NAT Rules** — type/zone filters, export CSV
- **Route List** — object resolution, CIDR badges
- **Object List** — address objects from Palo CSV
- **Service List** — TCP/UDP, predefined vs custom, port & protocol filters

Tables use **incremental scroll** (20 rows per batch) for large datasets.

### Router → Rule Categories

Per router device (from **Device Inventory**, category `router`):

- **Routing Table** — static/dynamic/inactive routes, table filter, export CSV
- **Interfaces** — physical + logical (vlan, bridge, tunnel, PPP, …); L3 from `ip/address`
- **Firewall Filter** / **Firewall NAT** — chain/action filters, disabled rule styling
- **Address Lists** — list name, dynamic/static filter

Same toolbar pattern as Firewall: search, dropdown filters, quick sort, reset, export CSV.

---

## Architecture

```
Browser  →  net-tools-fe (Next.js, :8080)
                ↓  app/api/*
            net-tools-be (FastAPI + PostgreSQL, :8090)
                ↓
         SSH  →  Nginx / network devices
         REST / Legacy API  →  MikroTik RouterOS (when configured)
```

| Layer | Responsibility |
|-------|------------------|
| **net-tools-fe** | UI, API routes, Palo CSV parsers, Resource Pool, Firewall, Router, Nginx modules. |
| **net-tools-be** | Device inventory, jobs, dataset storage, MikroTik collectors, WebSocket shell (dev: port `8090`). |
| **SSH** | Remote checks and upgrades (VPN to prod IPs required). |

---

## Project structure

```
net-tools/
├── README.md
├── .gitignore
├── net-tools-fe/             # Frontend (Next.js, :8080)
│   ├── package.json
│   ├── .env.example
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── scripts/
└── net-tools-be/             # Backend (FastAPI + PostgreSQL, :8090)
    ├── requirements.txt
    ├── .env.example
    ├── app/
    ├── scripts/dev-api.sh
    └── data/
```

---

## Quick start

### Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | 20+ |
| **Python** | 3.10+ (backend API) |
| **PostgreSQL** | 14+ (database `nettools`) |
| **SSH keys** | VPN to Jabar prod networks for live nginx checks |

### 1. Clone

```bash
git clone https://github.com/arulriyadi/net-tools.git
cd net-tools
```

SSH:

```bash
git clone git@github.com:arulriyadi/net-tools.git
cd net-tools
```

### 2. Configure frontend

```bash
cd net-tools-fe
cp .env.example .env.local
```

| Variable | Default | Description |
|----------|---------|-------------|
| `NETTOOLS_API_URL` | `http://127.0.0.1:8090` | FastAPI base URL (server-side fetch) |
| `NEXT_PUBLIC_NETTOOLS_WS_URL` | `ws://127.0.0.1:8090` | WebSocket shell endpoint |
| `NETTOOLS_SSH_KEYS_DIR` | — | Keychain path (shared with API) |

### 3. Backend API

```bash
cd net-tools-be
cp .env.example .env    # edit DATABASE_URL if needed
chmod +x scripts/dev-api.sh
./scripts/dev-api.sh
```

Health: `http://127.0.0.1:8090/health`

### 4. Frontend UI

```bash
cd net-tools-fe
npm install
npm run dev -- --port 8080 --hostname 0.0.0.0 --webpack
```

Open: **http://localhost:8080**

### 5. OrbStack (dev on `my-ubuntu`)

| Service | Path | URL |
|---------|------|-----|
| API | `net-tools-be/` | `http://192.168.139.166:8090` |
| UI | `net-tools-fe/` | `http://192.168.139.166:8080` |

After frontend code changes:

```bash
cd net-tools-fe
rm -rf .next && npm run dev -- --port 8080 --hostname 0.0.0.0 --webpack
```

---

## Modules

| Module | Route | Status |
|--------|-------|--------|
| Overview | `/` | Live |
| Resource Pool | `/resource-pool/*` | Live (inventory, types, connectors, keychain) |
| Firewall | `/firewall` | Live (CSV/API datasets) |
| Router | `/router` | Live (MikroTik from inventory + live sync) |
| Nginx Management | `/nginx/*` | Live (wired to API) |
| IP Checker | `/ip-checker` | Live |
| DNS | `/dns/*` | UI scaffold |
| IPAM | `/ipam/*` | UI scaffold |
| Net-Mon | `/netmon/*` | UI scaffold |
| Settings | `/settings` | UI scaffold |

---

## Firewall datasets (Palo Alto)

Import CSV exports from **Device Overview → Dataset bindings**. Supported capability keys:

| Dataset | CSV pattern (example) |
|---------|------------------------|
| Security rules | `export_policies_security_rulebase_*.csv` |
| NAT rules | `export_policies_nat_rulebase_*.csv` |
| Address objects | `export_objects_addresses_*.csv` |
| Static routes | `latest-static-route-*.csv` (VR default export) |
| Service objects | `export_objects_services_*.csv` |

Parsed JSON is stored on the network device record and surfaced in **Firewall Management → Rule Categories**.

---

## Router datasets (MikroTik RouterOS)

**Resource Pool → Data Connectors** defines *how* to reach a device (MikroTik REST HTTP/HTTPS, or Legacy API TCP/TLS). **Device Type** picks connectors first, then capability keys. **Device Inventory** holds IP, credentials, and per-dataset bindings.

Live sync: **Device Overview → Sync** (per dataset) or **Router Management → Sync** — calls `POST /api/network-devices/{id}/sync-dataset` with `{ "capability_key": "…" }`.

| Capability key | REST resource | Legacy API |
|----------------|---------------|------------|
| `routing_table` | `GET /rest/ip/route` | `/ip/route/print` |
| `interfaces` | `GET /rest/interface` + `ip/address` | `/interface/print` + `/ip/address/print` |
| `firewall_filter` | `GET /rest/ip/firewall/filter` | `/ip/firewall/filter/print` |
| `firewall_nat` | `GET /rest/ip/firewall/nat` | `/ip/firewall/nat/print` |
| `address_lists` | `GET /rest/ip/firewall/address-list` | `/ip/firewall/address-list/print` |

**Connector notes:** REST uses HTTP Basic auth. Lab CHR often works on **HTTP :80**; HTTPS needs a trusted cert. Legacy API is **plain TCP :8728** (not HTTP) — `:8729` when TLS is configured.

Mapping code: `net-tools-fe/lib/resource-pool/mikrotik-dataset-api.ts`, `net-tools-be/app/services/mikrotik_*_client.py`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `cd net-tools-fe && npm run dev` | Frontend dev server |
| `net-tools-be/scripts/dev-api.sh` | Backend API (FastAPI :8090) |
| `cd net-tools-fe && npm run build` | Production build |
| `cd net-tools-fe && npm run start` | Serve production build |
| `cd net-tools-fe && npm run lint` | ESLint |

---

## Design decisions

| Decision | Rationale |
|----------|-----------|
| **Monorepo FE + BE** | Single `net-tools` repo — `net-tools-fe` + `net-tools-be` at equal top level. |
| **Dataset bindings per device** | Mix CSV import (Palo) and live MikroTik sync per capability — practical migration path. |
| **Incremental list UI** | Large rule/object tables (750+ security rules, 9k+ objects) stay responsive. |
| **API route proxy layer** | Next.js `app/api/*` talks to backend API + PostgreSQL. |

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Empty firewall tabs | Device Overview → import CSV; confirm binding row count & last sync. |
| Empty router tabs | Device Inventory → router device with MikroTik connector + credentials → Sync on Device Overview or Router Management. |
| MikroTik sync fails | REST: HTTP :80 vs HTTPS cert; Legacy API: TCP :8728 (not HTTP). Check `connector_auth` on the device record. |
| API connection refused | Backend API running on `:8090`, check `NETTOOLS_API_URL` in `net-tools-fe/.env.local`. |
| Stale UI after code change | `rm -rf net-tools-fe/.next` and restart dev. |
| CORS errors | Add UI origin to backend API `allow_origins` config. |
| SSH check fails | VPN route, key path, server credentials on record. |

---

## Roadmap

- [ ] Auth (login / session / RBAC)
- [ ] Live Palo Alto API collectors (beyond CSV import)
- [x] MikroTik REST + Legacy API live sync (routing, interfaces, firewall, address lists)
- [ ] Scheduled polling for MikroTik connectors (`poll_mode: interval`)
- [ ] Wire DNS / IPAM / Net-Mon modules to backend
- [ ] CI + container deploy recipe

---

## License

Internal / organizational use — add explicit license file before public redistribution.

---

## Links

| Doc | Description |
|-----|-------------|
| [GitHub — net-tools](https://github.com/arulriyadi/net-tools) | This repository |

**TL;DR:** `git clone` → `net-tools-be/scripts/dev-api.sh` + `cd net-tools-fe && npm run dev -- --port 8080` → **Firewall Management** (Palo CSV) or **Router Management** (MikroTik live sync from Device Inventory).
