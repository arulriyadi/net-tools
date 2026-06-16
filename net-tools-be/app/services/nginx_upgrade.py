"""Upgrade nginx on target host via nginx.org APT repository (stable or mainline)."""

import re
from datetime import datetime, timezone

from app.config import get_settings
from app.data.nginx_cves import NGINX_MAINLINE_TARGET, NGINX_STABLE_TARGET
from app.models import Server
from app.schemas.nginx_upgrade import NginxUpgradeResult
from collections.abc import Awaitable, Callable

from app.services.ssh import SSHError, run_ssh_command_streaming

OnLogLine = Callable[[str], Awaitable[None] | None]

ALLOWED_TARGETS = {
    "stable": NGINX_STABLE_TARGET,
    "mainline": NGINX_MAINLINE_TARGET,
}


def _build_upgrade_script(channel: str, target_version: str) -> str:
    repo_subpath = "mainline/ubuntu" if channel == "mainline" else "ubuntu"
    return f"""#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
export APT_LISTCHANGES_FRONTEND=none
export UCF_FORCE_CONFFOLD=1
# Keep operator-modified conffiles (e.g. /etc/nginx/nginx.conf); backup is under $BACKUP
APT_INSTALL_OPTS='-o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold'
DPKG_FORCE_OPTS='--force-confdef --force-confold'
CHANNEL="{channel}"
TARGET="{target_version}"
REPO_PATH="{repo_subpath}"
BACKUP="/root/nginx-backup-$(date +%Y%m%d%H%M%S)"

log_step() {{ echo ">>> $1"; }}

dpkg_locked() {{
  fuser /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/cache/apt/archives/lock >/dev/null 2>&1
}}

lock_holders() {{
  fuser /var/lib/dpkg/lock-frontend 2>/dev/null | tr -s ' \\n' ' '
}}

wait_or_recover_dpkg_lock() {{
  local waited=0
  local max_wait=120
  while dpkg_locked; do
    local holders
    holders=$(lock_holders)
    echo ">>> dpkg/apt lock held by PIDs: ${{holders:-?}} (${{waited}}s / ${{max_wait}}s)"
    if [ "$waited" -ge "$max_wait" ]; then
      echo ">>> Recovering stale package manager lock from a previous run..."
      for pid in $holders; do
        [ -z "$pid" ] && continue
        [ ! -d "/proc/$pid" ] && continue
        comm=$(ps -p "$pid" -o comm= 2>/dev/null || echo "")
        case "$comm" in
          apt|apt-get|dpkg|dpkg-preconfigure|needrestart)
            kill -TERM "$pid" 2>/dev/null || true
            ;;
          bash)
            if tr '\\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null | grep -qE 'nginx-backup|REPO_SETUP|apt-get install|nginx.org'; then
              kill -TERM "$pid" 2>/dev/null || true
            fi
            ;;
        esac
      done
      sleep 4
      holders=$(lock_holders)
      for pid in $holders; do
        [ -n "$pid" ] && [ -d "/proc/$pid" ] && kill -9 "$pid" 2>/dev/null || true
      done
      sleep 2
      break
    fi
    sleep 5
    waited=$((waited + 5))
  done
  if dpkg_locked; then
    echo "ERROR: unable to acquire dpkg lock after recovery"
    exit 100
  fi
}}

finish_pending_dpkg() {{
  echo ">>> Finishing pending dpkg configuration (non-interactive)..."
  wait_or_recover_dpkg_lock
  if dpkg --configure -a $DPKG_FORCE_OPTS; then
    return 0
  fi
  echo ">>> dpkg --configure -a failed — running apt-get -f install..."
  apt-get -f install -y $APT_INSTALL_OPTS || return 1
  dpkg --configure -a $DPKG_FORCE_OPTS
}}

ensure_apt_ready() {{
  local attempt
  for attempt in 1 2 3 4 5; do
    echo ">>> apt/dpkg health check (attempt $attempt/5)..."
    wait_or_recover_dpkg_lock
    if finish_pending_dpkg && apt-get update -qq; then
      echo "preflight=ok"
      return 0
    fi
    echo ">>> repair attempt $attempt failed, waiting before retry..."
    sleep 3
  done
  echo "ERROR: dpkg/apt still broken after 5 repair attempts"
  echo "HINT: on the host run: dpkg --configure -a && apt-get -f install -y"
  exit 100
}}

apt_run() {{
  local attempt
  for attempt in 1 2 3; do
    wait_or_recover_dpkg_lock
    if apt-get "$@"; then
      return 0
    fi
    echo ">>> apt-get $* failed (attempt $attempt/3), repairing dpkg..."
    finish_pending_dpkg || true
    sleep 2
  done
  echo "ERROR: apt-get $* failed after repair retries"
  exit 100
}}

log_step "Connected — starting nginx upgrade (${{CHANNEL}} → ${{TARGET}})"
echo "===PRE_VERSION==="
nginx -v 2>&1 || true
dpkg -l nginx 2>/dev/null | awk '/^ii/{{print $2, $3}}' || true

log_step "Backing up /etc/nginx"
echo "===BACKUP==="
mkdir -p "$BACKUP"
cp -a /etc/nginx "$BACKUP/" 2>/dev/null || true
echo "backup=$BACKUP"

log_step "Preflight: dpkg lock and unfinished package configuration"
echo "===PREFLIGHT==="
ensure_apt_ready

setup_nginx_org_repo() {{
  KEYRING=/usr/share/keyrings/nginx-archive-keyring.gpg
  LIST=/etc/apt/sources.list.d/nginx.list
  install -d -m 0755 /usr/share/keyrings

  if [ -f "$KEYRING" ] && [ -f "$LIST" ] && grep -q nginx.org "$LIST" 2>/dev/null; then
    echo ">>> nginx.org APT repo already configured — skipping key import"
    apt_run update -qq
    return 0
  fi

  echo ">>> Installing nginx.org signing key (non-interactive)..."
  TMPKEY=$(mktemp)
  trap 'rm -f "$TMPKEY"' RETURN
  curl -fsSL https://nginx.org/keys/nginx_signing.key -o "$TMPKEY"
  gpg --batch --yes --no-tty --dearmor -o "$KEYRING" < "$TMPKEY"
  rm -f "$TMPKEY"
  trap - RETURN

  CODENAME=$(lsb_release -cs)
  echo "deb [signed-by=$KEYRING] https://nginx.org/packages/$REPO_PATH $CODENAME nginx" > "$LIST"
  cat > /etc/apt/preferences.d/99nginx <<'PIN'
Package: nginx*
Pin: origin nginx.org
Pin-Priority: 900
PIN

  apt_run update -qq
}}

log_step "Configuring nginx.org APT repository"
echo "===REPO_SETUP==="
apt_run update -qq
apt_run install -y -qq $APT_INSTALL_OPTS curl gnupg2 ca-certificates lsb-release apt-transport-https gnupg
setup_nginx_org_repo

log_step "Stopping nginx and installing package (may take several minutes)"
echo "===INSTALL==="
systemctl stop nginx 2>/dev/null || true
apt_run install -y $APT_INSTALL_OPTS nginx
apt-mark hold nginx || true

log_step "Verifying installed version and configuration"
echo "===POST_VERSION==="
nginx -v 2>&1
dpkg -l nginx 2>/dev/null | awk '/^ii/{{print $2, $3}}' || true

echo "===NGINX_T==="
nginx -t 2>&1

log_step "Starting nginx and nginx-ui services"
echo "===SYSTEMD==="
systemctl start nginx 2>/dev/null || true
echo "nginx_service=$(systemctl is-active nginx 2>/dev/null || echo failed)"
systemctl restart nginx-ui 2>/dev/null || true
echo "nginx_ui_service=$(systemctl is-active nginx-ui 2>/dev/null || echo inactive)"
"""


def _parse_sections(stdout: str) -> dict[str, str]:
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
    return sections


def _extract_nginx_version(raw: str) -> str | None:
    if not raw:
        return None
    match = re.search(r"nginx/(\d+\.\d+\.\d+)", raw)
    return match.group(1) if match else None


def _parse_systemd_section(systemd_section: str) -> tuple[bool, str | None]:
    """Return (nginx_active, nginx_ui_status)."""
    nginx_active = False
    nginx_ui: str | None = None
    for line in systemd_section.splitlines():
        stripped = line.strip()
        if stripped.startswith("nginx_service="):
            nginx_active = stripped.split("=", 1)[1].strip() == "active"
        elif stripped.startswith("nginx_ui_service="):
            nginx_ui = stripped.split("=", 1)[1].strip()
    if not nginx_active:
        lines = [ln.strip() for ln in systemd_section.splitlines() if ln.strip()]
        if lines and lines[0] == "active":
            nginx_active = True
    return nginx_active, nginx_ui


def validate_upgrade_request(channel: str, target_version: str) -> None:
    expected = ALLOWED_TARGETS.get(channel)
    if not expected or target_version != expected:
        raise ValueError(
            f"Unsupported upgrade target {target_version} for channel {channel}. "
            f"Allowed: stable={NGINX_STABLE_TARGET}, mainline={NGINX_MAINLINE_TARGET}"
        )


async def run_nginx_upgrade(
    server: Server,
    *,
    channel: str,
    target_version: str,
    on_log_line: OnLogLine | None = None,
) -> NginxUpgradeResult:
    validate_upgrade_request(channel, target_version)

    if not server.ssh_key_path:
        raise SSHError(f"No SSH key configured for server {server.name}")

    settings = get_settings()
    key_path = settings.resolve_path(server.ssh_key_path)
    if not key_path.exists():
        raise SSHError(f"SSH key not found: {key_path}")

    script = _build_upgrade_script(channel, target_version)
    code, stdout, stderr = await run_ssh_command_streaming(
        server.ip,
        script,
        user=server.ssh_user,
        key_path=key_path,
        timeout=600,
        on_line=on_log_line,
    )

    sections = _parse_sections(stdout)
    pre_version = _extract_nginx_version(sections.get("pre_version", ""))
    new_version = _extract_nginx_version(sections.get("post_version", ""))
    config_out = sections.get("nginx_t", "")
    config_ok = "test is successful" in config_out.lower()
    nginx_active, _nginx_ui_status = _parse_systemd_section(sections.get("systemd", ""))

    success = code == 0 and config_ok and nginx_active
    if new_version and new_version != target_version:
        success = False

    message = "Upgrade completed successfully"
    if not success:
        if code != 0:
            message = f"Upgrade script exited with code {code}"
        elif not config_ok:
            message = "nginx -t failed after upgrade — review config backup"
        elif not nginx_active:
            message = "nginx service is not active after upgrade"
        elif new_version and new_version != target_version:
            message = f"Installed version {new_version} does not match target {target_version}"
        else:
            message = "Upgrade finished with warnings — verify server manually"

    return NginxUpgradeResult(
        server_id=server.id,
        server_name=server.name,
        ip=server.ip,
        channel=channel,
        target_version=target_version,
        previous_version=pre_version,
        new_version=new_version,
        success=success,
        message=message,
        config_test_ok=config_ok,
        nginx_active=nginx_active,
        scanned_at=datetime.now(timezone.utc),
        raw_log=stdout + ("\n" + stderr if stderr else ""),
    )
