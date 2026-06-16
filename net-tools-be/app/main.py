from contextlib import asynccontextmanager
from pathlib import Path
import asyncio
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import select, text

from app.config import get_settings
import app.models  # noqa: F401 — register all tables with Base.metadata
from app.database import Base, SessionLocal, engine
from app.migrations import run_migrations
from app.models import Server
from app.routers import cve, data_connectors, device_types, network_devices, nginx, servers
from app.seed import seed_servers
from app.seed_resource_pool import seed_resource_pool
from app.services.dashboard import get_dashboard_data, get_group_options, get_home_overview_data, get_nginx_check_stats
from app.services.nginx_ui_metrics_collector import run_metrics_collector

settings = get_settings()
templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.ssh_keys_dir.mkdir(parents=True, exist_ok=True)
    settings.reports_dir.mkdir(parents=True, exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await run_migrations(conn)
    async with SessionLocal() as db:
        await seed_resource_pool(db)
        if os.getenv("NETTOOLS_SEED", "").lower() in ("1", "true", "yes"):
            await seed_servers(db)
    collector_task = asyncio.create_task(run_metrics_collector())
    try:
        yield
    finally:
        collector_task.cancel()
        try:
            await collector_task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="NetTools", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://192.168.139.166:8080",
        "http://0.0.0.0:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(servers.router)
app.include_router(data_connectors.router)
app.include_router(device_types.router)
app.include_router(network_devices.router)
app.include_router(nginx.router)
app.include_router(cve.router)

static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "nettools"}


@app.get("/", response_class=HTMLResponse)
async def home_overview(request: Request):
    async with SessionLocal() as db:
        (
            servers,
            last_checks,
            recent_jobs,
            high_risk_servers,
            total_checks,
            high_risk_count,
            open_cve_count,
            failed_checks,
            chart_data,
            alerts,
            checked_count,
            unchecked_count,
        ) = await get_home_overview_data(db)
    return templates.TemplateResponse(
        request,
        "overview.html",
        {
            "servers": servers,
            "last_checks": last_checks,
            "recent_jobs": recent_jobs,
            "high_risk_servers": high_risk_servers,
            "total_checks": total_checks,
            "high_risk_count": high_risk_count,
            "open_cve_count": open_cve_count,
            "failed_checks": failed_checks,
            "checked_count": checked_count,
            "unchecked_count": unchecked_count,
            "chart_data": chart_data,
            "alerts": alerts,
            "active_nav": "overview",
        },
    )


@app.get("/nginx-ui-management/nginx-check", response_class=HTMLResponse)
async def nginx_check_page(request: Request):
    async with SessionLocal() as db:
        (
            servers,
            recent_jobs,
            last_checks,
            last_jobs,
            group_options,
            cve_assessments,
            available_servers,
        ) = await get_dashboard_data(db, monitored_only=True)
        nginx_check_stats = await get_nginx_check_stats(db, servers, last_checks)
    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "servers": servers,
            "available_servers": available_servers,
            "last_jobs": last_jobs,
            "recent_jobs": recent_jobs,
            "last_checks": last_checks,
            "group_options": group_options,
            "cve_assessments": cve_assessments,
            "nginx_check_stats": nginx_check_stats,
            "default_ssh_key": "Pubkey/jabar/capzs.key",
            "title": "Nginx Check · NetTools",
            "active_nav": "nginx-check",
        },
    )


@app.get("/nginx-ui-management")
async def nginx_ui_management_root():
    return RedirectResponse(url="/nginx-ui-management/connections", status_code=302)


async def _load_servers_for_nui():
    async with SessionLocal() as db:
        result = await db.execute(select(Server).order_by(Server.name))
        return list(result.scalars().all())


@app.get("/nginx-ui-management/overview")
async def nginx_ui_overview_legacy():
    return RedirectResponse(url="/nginx-ui-management/connections", status_code=302)


@app.get("/nginx-ui-management/connections", response_class=HTMLResponse)
async def nginx_ui_connections(request: Request):
    servers = await _load_servers_for_nui()
    return templates.TemplateResponse(
        request,
        "nginx_ui_overview.html",
        {
            "servers": servers,
            "active_nav": "nginx-ui-connections",
        },
    )


@app.get("/nginx-ui-management/device-inventory", response_class=HTMLResponse)
async def nginx_ui_device_inventory(request: Request):
    async with SessionLocal() as db:
        result = await db.execute(select(Server).order_by(Server.name))
        servers = list(result.scalars().all())
        group_options = await get_group_options(db)
    return templates.TemplateResponse(
        request,
        "nginx_ui_device_inventory.html",
        {
            "servers": servers,
            "group_options": group_options,
            "default_ssh_key": "Pubkey/jabar/capzs.key",
            "active_nav": "nginx-ui-device-inventory",
        },
    )
