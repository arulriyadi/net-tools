from pydantic import BaseModel


class NginxCheckResult(BaseModel):
    job_id: int | None = None
    server_id: int
    server_name: str
    ip: str
    hostname: str | None = None
    nginx_version: str | None = None
    nginx_package: str | None = None
    os_version: str | None = None
    technitium_version: str | None = None
    nginx_ui_version: str | None = None
    nginx_active: bool | None = None
    nginx_ui_active: bool | None = None
    config_test_ok: bool | None = None
    config_test_output: str | None = None
    risk_level: str = "unknown"
    checks: list[dict] = []
    raw_log: str | None = None
