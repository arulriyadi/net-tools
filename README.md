# Net-Tools

Platform web internal untuk **operasi infrastruktur jaringan** — health check Nginx, inventaris perangkat, eksplorasi firewall Palo Alto, dan modul pendukung (DNS, IPAM, Net-Mon). Dibangun untuk kebutuhan operasional **Diskominfo Provinsi Jawa Barat**.

Stack: **Next.js 16 + React 19** (dashboard + API routes) dengan **PostgreSQL** untuk data persisten (device inventory, jobs, firewall datasets).

UI awalnya diekspor dari [v0 net-tools-dashboard](https://v0.app/chat/net-tools-dashboard-bTmgthxtYYq); modul Resource Pool, Firewall, dan Nginx sudah aktif.

---

## Highlights

| Area | What you get |
|------|----------------|
| **Nginx Management** | Health check via SSH, security scan, upgrade jobs, PDF reports, Nginx UI proxy (sites, certs, metrics), interactive shell (WebSocket). |
| **Resource Pool** | Central device inventory — firewalls, servers, connectors; per-device dataset bindings (CSV import or live API). |
| **Firewall Management** | Palo Alto explorer: security rules, NAT, static routes, address objects, service objects — search, filter, sort, export CSV, incremental scroll. |
| **Hybrid data mode** | Import Palo CSV exports today; wire live collectors per dataset when ready. |
| **Job history** | Long-running tasks (checks, upgrades, scans) persisted with downloadable reports. |

### Firewall → Rule Categories

Per firewall device:

- **Security Rules** — filter/sort/export, disabled rule styling, multi-value cells
- **NAT Rules** — type/zone filters, export CSV
- **Route List** — object resolution, CIDR badges
- **Object List** — address objects from Palo CSV
- **Service List** — TCP/UDP, predefined vs custom, port & protocol filters

Tables use **incremental scroll** (20 rows per batch) for large datasets.

---

## Architecture

```
Browser  →  net-tools-fe (Next.js, :8080)
                ↓  app/api/*
            net-tools-be (FastAPI + PostgreSQL, :8090)
                ↓
         SSH  →  Nginx / network devices
```

| Layer | Responsibility |
|-------|------------------|
| **net-tools-fe** | UI, API routes, Palo CSV parsers, Resource Pool, Firewall, Nginx modules. |
| **net-tools-be** | Device inventory, jobs, dataset storage, WebSocket shell (dev: port `8090`). |
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
| **Dataset bindings per device** | Mix CSV import and live connectors — practical for Palo exports today. |
| **Incremental list UI** | Large rule/object tables (750+ security rules, 9k+ objects) stay responsive. |
| **API route proxy layer** | Next.js `app/api/*` talks to backend API + PostgreSQL. |

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Empty firewall tabs | Device Overview → import CSV; confirm binding row count & last sync. |
| API connection refused | Backend API running on `:8090`, check `NETTOOLS_API_URL` in `net-tools-fe/.env.local`. |
| Stale UI after code change | `rm -rf net-tools-fe/.next` and restart dev. |
| CORS errors | Add UI origin to backend API `allow_origins` config. |
| SSH check fails | VPN route, key path, server credentials on record. |

---

## Roadmap

- [ ] Auth (login / session / RBAC)
- [ ] Live Palo Alto API collectors (beyond CSV import)
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

**TL;DR:** `git clone` → `net-tools-be/scripts/dev-api.sh` + `cd net-tools-fe && npm run dev -- --port 8080` → import Palo CSV → **Firewall Management**.
