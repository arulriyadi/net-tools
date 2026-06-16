# Net-Tools

Platform web internal untuk **operasi infrastruktur jaringan** — health check Nginx, inventaris perangkat, eksplorasi firewall Palo Alto, dan modul pendukung (DNS, IPAM, Net-Mon). Dibangun untuk kebutuhan operasional **Diskominfo Provinsi Jawa Barat**.

Stack utama repo ini: **Next.js 16 + React 19** (dashboard, API routes, CSV parsers). Data persisten via **FastAPI + PostgreSQL** (sibling lokal [`net-tools-old`](../net-tools-old/) — legacy backend, opsional untuk dev API `:8090`).

UI awalnya diekspor dari [v0 net-tools-dashboard](https://v0.app/chat/net-tools-dashboard-bTmgthxtYYq); modul Resource Pool, Firewall, dan Nginx sudah di-wire ke backend.

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
Browser  →  Next.js (net-tools, :8080)
                ↓  app/api/* proxy
            FastAPI (net-tools-old, :8090)  [optional legacy API]
                ↓
         PostgreSQL (device inventory, jobs, metrics)
                ↓
         asyncssh  →  Nginx hosts / network gear (read-only ops)
```

| Layer | Responsibility |
|-------|------------------|
| **Next.js UI** (this repo) | App Router dashboard, Resource Pool, Firewall explorer, Nginx modules, API route proxies. |
| **FastAPI** (`net-tools-old`) | REST API, WebSocket shell, background jobs, dataset storage — legacy, still used for local dev API. |
| **PostgreSQL** | Servers, network devices, device types, data connectors, jobs, Nginx UI metrics. |
| **SSH layer** | Credential-backed remote checks and upgrades (VPN/route to prod IPs required). |

---

## Project structure

```
net-tools/
├── README.md
├── package.json
├── .env.example
├── scripts/
│   └── seed-firewall-dataset.ts
├── docs/
│   └── screenshots/              # Add UI screenshots here
├── app/                          # Next.js App Router pages + API routes
├── components/
│   ├── dashboard/
│   ├── firewall/
│   ├── resource-pool/
│   ├── nginx/
│   ├── dns/
│   ├── netmon/
│   ├── ipam/
│   └── ui/
├── lib/
│   ├── firewall/                 # Types, Palo CSV parsers, mappers, list utils
│   └── resource-pool/
└── hooks/
    └── use-incremental-list.ts
```

Legacy FastAPI backend (archived): [`../net-tools-old/`](../net-tools-old/)

---

## Quick start

### Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | 20+ |
| **PostgreSQL** | 14+ — via legacy API when using full stack |
| **Python 3.10+** | Only if running `net-tools-old` API locally |
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

### 2. Configure

```bash
cp .env.example .env.local
```

| Variable | Default | Description |
|----------|---------|-------------|
| `NETTOOLS_API_URL` | `http://127.0.0.1:8090` | FastAPI base URL (server-side fetch) |
| `NEXT_PUBLIC_NETTOOLS_WS_URL` | `ws://127.0.0.1:8090` | WebSocket shell endpoint |
| `NETTOOLS_SSH_KEYS_DIR` | — | Keychain path (shared with API) |

### 3. Install & run UI

```bash
npm install
npm run dev -- --port 8080 --hostname 0.0.0.0 --webpack
```

Open: **http://localhost:8080**

### 4. Full stack (UI + legacy API)

Terminal 1 — API (from sibling `net-tools-old`):

```bash
cd ../net-tools-old
cp .env.example .env
source .venv/bin/activate   # or: python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8090 --reload
```

Terminal 2 — UI:

```bash
cd ../net-tools
npm run dev -- --port 8080 --webpack
```

API health: `http://127.0.0.1:8090/health` → `{"status":"ok","service":"nettools"}`

### 5. OrbStack (dev on `my-ubuntu`)

| Service | URL |
|---------|-----|
| UI | `http://192.168.139.166:8080` |
| API | `http://192.168.139.166:8090` |

After code changes, clear stale bundles:

```bash
cd net-tools && rm -rf .next && npm run dev -- --port 8080 --hostname 0.0.0.0 --webpack
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
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

---

## Design decisions

| Decision | Rationale |
|----------|-----------|
| **Next.js as primary repo** | Single GitHub repo for the dashboard operators use daily. |
| **Dataset bindings per device** | Mix CSV import and live connectors — practical for Palo exports today. |
| **Incremental list UI** | Large rule/object tables (750+ security rules, 9k+ objects) stay responsive. |
| **API route proxy layer** | Next.js `app/api/*` forwards to FastAPI without exposing backend URL to browser. |
| **Legacy backend archived** | `net-tools-old` retained locally for FastAPI/PostgreSQL until full migration. |

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Empty firewall tabs | Device Overview → import CSV; confirm binding row count & last sync. |
| API connection refused | `net-tools-old` running on `:8090`, `NETTOOLS_API_URL` in `.env.local`. |
| Stale UI after code change | `rm -rf .next` and restart dev. |
| CORS errors | Add UI origin to `allow_origins` in `net-tools-old/app/main.py`. |
| SSH check fails | VPN route, key path, server credentials on record. |

---

## Roadmap

- [ ] Auth (login / session / RBAC)
- [ ] Live Palo Alto API collectors (beyond CSV import)
- [ ] Wire DNS / IPAM / Net-Mon modules to backend
- [ ] CI + container deploy recipe
- [ ] Migrate remaining FastAPI surface into Next.js or dedicated API service

---

## License

Internal / organizational use — add explicit license file before public redistribution.

---

## Git push (manual)

Use **`scripts/git-push.sh`** from your terminal (not Cursor Agent) so commits stay under your account only — no `Co-authored-by: Cursor`.

```bash
# Preview changes
./scripts/git-push.sh --status

# Dry run
./scripts/git-push.sh --dry-run "Your commit title"

# Add, commit, push
./scripts/git-push.sh "Add Service List tab to firewall detail"
./scripts/git-push.sh "Fix export CSV" "Optional second paragraph for body."
```

First time on a fresh GitHub repo:

```bash
git init && git branch -M main
git remote add origin https://github.com/arulriyadi/net-tools.git
./scripts/git-push.sh "Initial commit"
```

Ask the assistant for a suggested commit message + file list; you run the script locally.

---

## Links

| Doc | Description |
|-----|-------------|
| [net-tools-old README](../net-tools-old/README.md) | Archived FastAPI backend (local dev only) |
| [GitHub — net-tools](https://github.com/arulriyadi/net-tools) | This repository |

**TL;DR:** `git clone` → `cp .env.example .env.local` → `npm install` → `npm run dev -- --port 8080` → (optional) start `net-tools-old` API → import Palo CSV → **Firewall Management**.
