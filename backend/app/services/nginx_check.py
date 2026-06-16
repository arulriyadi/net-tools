import re

from app.config import get_settings
from app.data.nginx_cves import NGINX_STABLE_TARGET
from app.models import Server
from app.schemas.nginx import NginxCheckResult
from app.services.ssh import SSHError, run_ssh_command
from app.services.version_utils import version_lt

CHECK_SCRIPT = r"""
set +e
echo "===HOSTNAME==="
hostname
echo "===OS==="
lsb_release -ds 2>/dev/null || cat /etc/os-release | head -1
echo "===NGINX_V==="
nginx -v 2>&1
echo "===NGINX_PKG==="
dpkg -l nginx 2>/dev/null | awk '/^ii/{print $2, $3}'
echo "===NGINX_T==="
nginx -t 2>&1
echo "===SYSTEMD==="
systemctl is-active nginx 2>/dev/null
echo "===NGINX_UI==="
systemctl is-active nginx-ui 2>/dev/null
echo "===NGINX_UI_V==="
if systemctl is-active nginx-ui 2>/dev/null | grep -qx active; then
  for bin in nginx-ui /usr/local/bin/nginx-ui /usr/bin/nginx-ui; do
    if command -v "$bin" >/dev/null 2>&1; then
      "$bin" -v 2>&1 | head -1
      break
    fi
    if [ -x "$bin" ]; then
      "$bin" -v 2>&1 | head -1
      break
    fi
  done
fi
echo "===TECHNITIUM_V==="
if systemctl is-active dns 2>/dev/null | grep -qx active || systemctl is-active technitium-dns-server 2>/dev/null | grep -qx active; then
  for dll in /opt/technitium/dns/DnsServerApp.dll /usr/lib/technitium/dns/DnsServerApp.dll; do
    if [ -f "$dll" ]; then
      strings "$dll" 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+' | head -n 1
      break
    fi
  done
fi
echo "===REWRITE==="
grep -rE 'rewrite\s+' /etc/nginx/sites-enabled/ 2>/dev/null | grep -v maintenance | head -20 || true
echo "===ERRORLOG==="
grep -ciE 'segfault|signal 11|worker process exited' /var/log/nginx/error.log 2>/dev/null || echo 0
"""


def _parse_check_output(server: Server, stdout: str, stderr: str) -> NginxCheckResult:
    sections: dict[str, str] = {}
    current = "_meta"
    lines: list[str] = []
    for line in stdout.splitlines():
        if line.startswith("===") and line.endswith("==="):
            if current != "_meta":
                sections[current] = "\n".join(lines).strip()
            current = line.strip("=").lower()
            lines = []
        else:
            lines.append(line)
    if current != "_meta":
        sections[current] = "\n".join(lines).strip()

    nginx_v = sections.get("nginx_v", "")
    nginx_version = nginx_v.split("nginx/")[-1].split()[0] if "nginx/" in nginx_v else None
    config_out = sections.get("nginx_t", "")
    config_ok = "test is successful" in config_out.lower()
    nginx_active = sections.get("systemd", "").strip() == "active"
    nginx_ui_active = sections.get("nginx_ui", "").strip() == "active"
    crash_count = sections.get("errorlog", "0").strip().splitlines()[-1] if sections.get("errorlog") else "0"

    checks: list[dict] = []
    checks.append({"label": "nginx -t", "status": "pass" if config_ok else "fail", "detail": config_out[:200]})
    checks.append({"label": "nginx service", "status": "pass" if nginx_active else "fail"})
    checks.append({"label": "nginx-ui service", "status": "pass" if nginx_ui_active else "warn"})
    checks.append(
        {
            "label": "error log crash scan",
            "status": "pass" if crash_count == "0" else "warn",
            "detail": f"matches={crash_count}",
        }
    )

    risk = "low"
    if not config_ok or not nginx_active:
        risk = "high"
    elif not nginx_ui_active:
        risk = "medium"

    if nginx_version and version_lt(nginx_version, NGINX_STABLE_TARGET):
        risk = "high"

    technitium_raw = sections.get("technitium_v", "").strip()
    technitium_match = re.search(r"\d+(?:\.\d+){2,3}", technitium_raw)
    technitium_version = technitium_match.group(0) if technitium_match else None
    if technitium_version:
        technitium_version = re.sub(r"(\.\d+)\.0$", r"\1", technitium_version)

    nginx_ui_raw = sections.get("nginx_ui_v", "").strip()
    nginx_ui_match = re.search(r"\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?", nginx_ui_raw)
    nginx_ui_version = nginx_ui_match.group(0) if nginx_ui_match else None

    return NginxCheckResult(
        server_id=server.id,
        server_name=server.name,
        ip=server.ip,
        hostname=sections.get("hostname") or None,
        nginx_version=nginx_version,
        nginx_package=sections.get("nginx_pkg") or None,
        os_version=sections.get("os") or None,
        technitium_version=technitium_version,
        nginx_ui_version=nginx_ui_version,
        nginx_active=nginx_active,
        nginx_ui_active=nginx_ui_active,
        config_test_ok=config_ok,
        config_test_output=config_out,
        risk_level=risk,
        checks=checks,
        raw_log=stdout + ("\n" + stderr if stderr else ""),
    )


async def run_nginx_check(server: Server) -> NginxCheckResult:
    if not server.ssh_key_path:
        raise SSHError(f"No SSH key configured for server {server.name}")

    settings = get_settings()
    key_path = settings.resolve_path(server.ssh_key_path)
    if not key_path.exists():
        raise SSHError(f"SSH key not found: {key_path}")

    code, stdout, stderr = await run_ssh_command(
        server.ip,
        CHECK_SCRIPT,
        user=server.ssh_user,
        key_path=key_path,
        timeout=90,
    )
    if code != 0 and not stdout.strip():
        raise SSHError(stderr or f"Remote check failed with exit code {code}")

    return _parse_check_output(server, stdout, stderr)
