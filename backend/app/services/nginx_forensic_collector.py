import re
from datetime import datetime, timezone

import httpx

from app.config import get_settings
from app.models import Server
from app.schemas.nginx_security import (
    ForensicFinding,
    NginxSecurityScanResult,
    ScanAreaResult,
    SecurityRecommendation,
    TimelineEvent,
)
from app.services.ssh import SSHError, run_ssh_command

MALICIOUS_RULES: list[tuple[str, str, str]] = [
    (r"t\.me/", "malicious_redirect", "Telegram redirect detected"),
    (r"telegram\.me/", "malicious_redirect", "Telegram redirect detected"),
    (r"mrd4nd2", "malicious_redirect", "Known incident redirect token"),
    (r"return\s+301\s+https?://(?!.*jabarprov)(?!.*digitalservice)(?!.*jabar\.io)", "malicious_redirect", "External 301 redirect"),
    (r"eval\s*\(", "code_injection", "eval() injection pattern"),
    (r"base64_decode", "obfuscated_payload", "Base64 obfuscation pattern"),
    (r"\\x[0-9a-f]{2}", "obfuscated_payload", "Hex-encoded obfuscation pattern"),
]

SUSPICIOUS_RULES: list[tuple[str, str, str]] = [
    (r"return\s+301\s+", "suspicious_redirect", "Server-level 301 redirect"),
    (r"proxy_pass\s+https?://\[0-9", "suspicious_upstream", "IP literal upstream"),
    (r"rewrite\s+.*https?://(?!.*jabarprov)", "suspicious_redirect", "External rewrite target"),
]

PRIVATE_IP_RE = re.compile(
    r"^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|localhost)",
    re.IGNORECASE,
)

FORENSIC_SCRIPT = r"""
set +e
echo "===HOSTNAME==="
hostname
echo "===NGINX_V==="
nginx -v 2>&1
echo "===NGINX_CONF_TEST==="
nginx -t 2>&1
echo "===NGINX_UI==="
systemctl is-active nginx-ui 2>/dev/null
echo "===MALICIOUS_GREP==="
grep -rnE 't\.me|telegram\.me|mrd4nd2|return[[:space:]]+301|eval[[:space:]]*\(|base64_decode' /etc/nginx/ 2>/dev/null | head -150 || true
echo "===EXTERNAL_RETURN==="
grep -rnE 'return[[:space:]]+301[[:space:]]+https?://' /etc/nginx/ 2>/dev/null | grep -viE 'jabarprov|digitalservice|jabar\.io' | head -40 || true
echo "===CONF_MTIME==="
find /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/nginx/conf.d -type f 2>/dev/null | while read -r f; do
  stat -c '%Y %y %n' "$f" 2>/dev/null
done | sort -rn | head -30
echo "===AUTH_ACCEPTED==="
grep "Accepted" /var/log/auth.log 2>/dev/null | tail -30
echo "===AUTH_FAILED==="
grep -E 'Failed password|Invalid user|authentication failure' /var/log/auth.log 2>/dev/null | tail -30
echo "===LAST_LOGINS==="
last -15 2>/dev/null
echo "===NGINX_UI_INI==="
grep -E 'Listen|Port|Host' /usr/local/etc/nginx-ui/app.ini 2>/dev/null | head -10
echo "===NGINX_UI_SYSLOG==="
grep nginx-ui /var/log/syslog 2>/dev/null | tail -120
echo "===NGINX_ACCESS_SUSPICIOUS==="
grep -hE 't\.me|telegram|mrd4nd2' /var/log/nginx/access.log /var/log/nginx/*access*.log 2>/dev/null | tail -20 || true
echo "===NGINX_ERROR_SUSPICIOUS==="
grep -hE 't\.me|telegram|mrd4nd2|eval\(|base64' /var/log/nginx/error.log /var/log/nginx/*error*.log 2>/dev/null | tail -20 || true
echo "===NGINX_UI_DB==="
python3 <<'PY'
import re
import sqlite3
from pathlib import Path

DB = Path("/usr/local/etc/nginx-ui/database.db")
MALICIOUS = [
    (r"t\.me/", "malicious_redirect", "Telegram redirect in nginx-ui DB"),
    (r"telegram\.me/", "malicious_redirect", "Telegram redirect in nginx-ui DB"),
    (r"mrd4nd2", "malicious_redirect", "Known incident token in nginx-ui DB"),
    (r"return\s+301\s+https?://", "malicious_redirect", "301 redirect in nginx-ui DB"),
    (r"eval\s*\(", "code_injection", "eval() in nginx-ui DB"),
    (r"base64_decode", "obfuscated_payload", "Base64 obfuscation in nginx-ui DB"),
]

def emit(kind, *parts):
    print(f"{kind}|" + "|".join(str(p) for p in parts))

if not DB.exists():
    emit("STATUS", "missing")
else:
    emit("STATUS", "ok")
    try:
        db = sqlite3.connect(str(DB))
        cur = db.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [r[0] for r in cur.fetchall()]
        emit("TABLES", ",".join(tables))

        if "users" in tables:
            cur.execute("SELECT id, name, created_at, updated_at FROM users ORDER BY id")
            for row in cur.fetchall():
                emit("USER", *row)

        for table in tables:
            cur.execute(f"PRAGMA table_info({table})")
            cols = [r[1] for r in cur.fetchall()]
            text_cols = [c for c in cols if c.lower() in (
                "content", "config", "data", "value", "body", "nginx_config",
                "name", "path", "token", "remark", "description",
            ) or "config" in c.lower() or "content" in c.lower()]
            if not text_cols:
                continue
            try:
                cur.execute(f"SELECT rowid, {', '.join(text_cols)} FROM {table} LIMIT 200")
            except Exception:
                continue
            for row in cur.fetchall():
                rowid = row[0]
                for idx, col in enumerate(text_cols, start=1):
                    val = row[idx]
                    if not isinstance(val, str) or not val.strip():
                        continue
                    for pattern, category, desc in MALICIOUS:
                        if re.search(pattern, val, re.IGNORECASE):
                            snippet = val.strip().replace("\n", " ")[:240]
                            emit("FINDING", table, col, rowid, category, snippet, desc)
                            break
        db.close()
    except Exception as exc:
        emit("ERROR", str(exc)[:200])
PY
echo "===PUBLIC_IP==="
curl -s --connect-timeout 3 ifconfig.me 2>/dev/null || true
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


def _parse_grep_line(line: str) -> tuple[str | None, int | None, str]:
    match = re.match(r"^([^:]+):(\d+):(.*)$", line.strip())
    if match:
        return match.group(1), int(match.group(2)), match.group(3).strip()
    return None, None, line.strip()


def _classify_line(line: str, source: str = "config") -> ForensicFinding | None:
    for pattern, category, description in MALICIOUS_RULES:
        if re.search(pattern, line, re.IGNORECASE):
            path, line_no, content = _parse_grep_line(line)
            return ForensicFinding(
                severity="critical",
                category=category,
                source=source,  # type: ignore[arg-type]
                file_path=path,
                line_number=line_no,
                matched_line=content,
                description=description,
            )
    for pattern, category, description in SUSPICIOUS_RULES:
        if re.search(pattern, line, re.IGNORECASE):
            path, line_no, content = _parse_grep_line(line)
            return ForensicFinding(
                severity="medium",
                category=category,
                source=source,  # type: ignore[arg-type]
                file_path=path,
                line_number=line_no,
                matched_line=content,
                description=description,
            )
    return None


def _is_private_ip(ip: str | None) -> bool:
    if not ip:
        return False
    return bool(PRIVATE_IP_RE.match(ip.strip()))


def _extract_ip_from_line(line: str) -> str | None:
    match = re.search(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", line)
    return match.group(0) if match else None


def _parse_syslog_timeline(raw: str) -> tuple[list[TimelineEvent], list[ForensicFinding]]:
    events: list[TimelineEvent] = []
    findings: list[ForensicFinding] = []
    seen_login_ips: set[str] = set()

    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        source_ip = _extract_ip_from_line(line)
        lower = line.lower()

        event = "nginx-ui activity"
        if "post" in lower and "login" in lower:
            event = "nginx-ui login"
            if source_ip and not _is_private_ip(source_ip):
                seen_login_ips.add(source_ip)
                findings.append(
                    ForensicFinding(
                        severity="high",
                        category="nginx_ui_external_login",
                        source="log",
                        file_path="/var/log/syslog",
                        line_number=None,
                        matched_line=line[:240],
                        description=f"nginx-ui login from non-private IP {source_ip}",
                    )
                )
        elif "post" in lower and ("sites" in lower or "/api/sites" in lower):
            event = "nginx-ui config saved"
            if source_ip and not _is_private_ip(source_ip):
                findings.append(
                    ForensicFinding(
                        severity="medium",
                        category="nginx_ui_config_change",
                        source="log",
                        file_path="/var/log/syslog",
                        line_number=None,
                        matched_line=line[:240],
                        description=f"nginx-ui config saved from external IP {source_ip}",
                    )
                )
        elif "reload" in lower:
            event = "nginx reload"
        elif "restart" in lower:
            event = "nginx restart"
        elif "register" in lower or "user" in lower and "create" in lower:
            event = "nginx-ui user activity"

        for pattern, category, description in MALICIOUS_RULES:
            if re.search(pattern, line, re.IGNORECASE):
                findings.append(
                    ForensicFinding(
                        severity="critical",
                        category=category,
                        source="log",
                        file_path="/var/log/syslog",
                        line_number=None,
                        matched_line=line[:240],
                        description=f"{description} (syslog)",
                    )
                )
                break

        ts_match = re.match(r"^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})", line)
        timestamp_wib = ts_match.group(1) if ts_match else line[:24]
        events.append(
            TimelineEvent(
                timestamp_utc=None,
                timestamp_wib=timestamp_wib,
                event=event,
                source_ip=source_ip,
                source="nginx-ui-syslog",
            )
        )

    return events[-25:], findings


def _parse_auth_timeline(raw: str, *, failed: bool = False) -> tuple[list[TimelineEvent], list[ForensicFinding]]:
    events: list[TimelineEvent] = []
    findings: list[ForensicFinding] = []
    source_label = "auth-log-failed" if failed else "auth-log"

    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        source_ip = _extract_ip_from_line(line)
        ts_match = re.match(r"^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})", line)
        timestamp_wib = ts_match.group(1) if ts_match else line[:24]

        if failed:
            event = "SSH auth failed"
            if source_ip and not _is_private_ip(source_ip):
                findings.append(
                    ForensicFinding(
                        severity="medium",
                        category="ssh_auth_failed",
                        source="log",
                        file_path="/var/log/auth.log",
                        line_number=None,
                        matched_line=line[:240],
                        description=f"Failed SSH attempt from {source_ip}",
                    )
                )
        else:
            event = "SSH login accepted"
            if source_ip and not _is_private_ip(source_ip):
                findings.append(
                    ForensicFinding(
                        severity="high",
                        category="ssh_external_login",
                        source="log",
                        file_path="/var/log/auth.log",
                        line_number=None,
                        matched_line=line[:240],
                        description=f"SSH accepted from non-private IP {source_ip}",
                    )
                )

        events.append(
            TimelineEvent(
                timestamp_utc=None,
                timestamp_wib=timestamp_wib,
                event=event,
                source_ip=source_ip,
                source=source_label,
            )
        )

    return events, findings


def _parse_log_grep(raw: str, log_label: str) -> list[ForensicFinding]:
    findings: list[ForensicFinding] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        finding = _classify_line(line, source="log")
        if finding:
            finding.file_path = log_label
            findings.append(finding)
    return findings


def _parse_nginx_ui_db(raw: str) -> tuple[list[TimelineEvent], list[ForensicFinding], list[str]]:
    timeline: list[TimelineEvent] = []
    findings: list[ForensicFinding] = []
    checks: list[str] = []
    status = "missing"

    for line in raw.splitlines():
        line = line.strip()
        if not line or "|" not in line:
            continue
        kind, *parts = line.split("|")
        if kind == "STATUS":
            status = parts[0] if parts else "unknown"
        elif kind == "TABLES" and parts:
            checks.append(f"Tables: {parts[0]}")
        elif kind == "USER" and len(parts) >= 3:
            user_id, name, created_at = parts[0], parts[1], parts[2]
            timeline.append(
                TimelineEvent(
                    timestamp_utc=None,
                    timestamp_wib=created_at[:19] if created_at else "—",
                    event=f"nginx-ui user '{name}' registered",
                    source_ip=None,
                    source="nginx-ui-db",
                )
            )
            if created_at:
                try:
                    created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    age_days = (datetime.now(timezone.utc) - created.astimezone(timezone.utc)).days
                    if age_days <= 7:
                        findings.append(
                            ForensicFinding(
                                severity="medium",
                                category="nginx_ui_new_user",
                                source="database",
                                file_path="/usr/local/etc/nginx-ui/database.db",
                                line_number=None,
                                matched_line=f"user={name} id={user_id} created_at={created_at}",
                                description=f"nginx-ui user '{name}' created within last 7 days — verify legitimacy",
                            )
                        )
                except ValueError:
                    pass
        elif kind == "FINDING" and len(parts) >= 6:
            table, col, rowid, category, snippet, desc = parts[:6]
            findings.append(
                ForensicFinding(
                    severity="critical",
                    category=category,
                    source="database",
                    file_path=f"/usr/local/etc/nginx-ui/database.db#{table}.{col}:{rowid}",
                    line_number=None,
                    matched_line=snippet,
                    description=desc,
                )
            )
        elif kind == "ERROR" and parts:
            checks.append(f"DB read error: {parts[0]}")

    if status == "ok":
        checks.insert(0, "nginx-ui SQLite database readable")
    elif status == "missing":
        checks.append("nginx-ui database not found (panel may not be installed)")

    return timeline, findings, checks


def _parse_conf_mtime(raw: str) -> list[TimelineEvent]:
    events: list[TimelineEvent] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split(None, 2)
        if len(parts) < 3:
            continue
        mtime_human = parts[1]
        path = parts[2]
        events.append(
            TimelineEvent(
                timestamp_utc=None,
                timestamp_wib=mtime_human,
                event=f"Config file modified: {path.split('/')[-1]}",
                source_ip=None,
                source="filesystem",
            )
        )
    return events[:10]


def _parse_nginx_ui_ini(ini: str) -> tuple[str | None, int]:
    host: str | None = None
    port = 9000
    for line in ini.splitlines():
        stripped = line.strip()
        if stripped.startswith("Host"):
            host = stripped.split("=", 1)[1].strip()
        elif stripped.startswith("Port"):
            try:
                port = int(stripped.split("=", 1)[1].strip())
            except ValueError:
                pass
    return host, port


def _binds_all_interfaces(host: str | None) -> bool:
    if not host:
        return False
    return host in ("0.0.0.0", "*", "::", "[::]")


async def _probe_public_nginx_ui(public_ip: str, port: int, timeout: float = 3.0) -> tuple[bool, str]:
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            url = f"http://{public_ip}:{port}/"
            res = await client.get(url)
            return True, f"HTTP GET {url} → {res.status_code} (reachable from NetTools)"
    except httpx.TimeoutException:
        return False, f"HTTP GET http://{public_ip}:{port}/ timed out after {timeout}s (not reachable from NetTools)"
    except httpx.HTTPError as exc:
        detail = str(exc).strip() or exc.__class__.__name__
        return False, f"HTTP probe http://{public_ip}:{port}/ failed: {detail}"


def _dedupe_findings(findings: list[ForensicFinding]) -> list[ForensicFinding]:
    seen: set[tuple[str, str, str]] = set()
    out: list[ForensicFinding] = []
    for f in findings:
        key = (f.category, f.source, f.matched_line[:120])
        if key in seen:
            continue
        seen.add(key)
        out.append(f)
    return out


def _area_status(findings: list[ForensicFinding], area: str) -> str:
    area_findings = [f for f in findings if f.source == area]
    if not area_findings:
        return "clean"
    order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    top = max(area_findings, key=lambda f: order.get(f.severity, 0))
    if top.severity in ("critical", "high"):
        return "critical"
    return "warning"


def _build_scan_areas(
    findings: list[ForensicFinding],
    *,
    nginx_ui_active: bool | None,
    db_checks: list[str],
    config_test_ok: bool | None,
    nginx_ui_public_reachable: bool | None,
) -> list[ScanAreaResult]:
    config_findings = [f for f in findings if f.source == "config"]
    log_findings = [f for f in findings if f.source == "log"]
    db_findings = [f for f in findings if f.source == "database"]
    net_findings = [f for f in findings if f.source == "network"]

    config_checks = [
        "grep malicious patterns in /etc/nginx/",
        "grep external return 301 directives",
        "list recent config file mtimes",
    ]
    if config_test_ok is False:
        config_checks.append("nginx -t failed")
    elif config_test_ok is True:
        config_checks.append("nginx -t passed")

    log_checks = [
        "nginx-ui syslog (login, config save, reload)",
        "SSH auth.log accepted + failed attempts",
        "nginx access/error logs for redirect patterns",
    ]

    areas: list[ScanAreaResult] = [
        ScanAreaResult(
            area="config",
            status=_area_status(findings, "config") if config_findings or config_test_ok is not False else "clean",
            label="Nginx config",
            summary=(
                f"{len(config_findings)} finding(s) in config files"
                if config_findings
                else "No malicious or suspicious nginx config patterns"
            ),
            checks_run=config_checks,
        ),
        ScanAreaResult(
            area="log",
            status=_area_status(findings, "log") if log_findings else "clean",
            label="Logs & activity",
            summary=(
                f"{len(log_findings)} suspicious log event(s)"
                if log_findings
                else "No suspicious nginx-ui or SSH activity in logs"
            ),
            checks_run=log_checks,
        ),
    ]

    if nginx_ui_active:
        areas.append(
            ScanAreaResult(
                area="database",
                status=_area_status(findings, "database") if db_findings else "clean",
                label="nginx-ui database",
                summary=(
                    f"{len(db_findings)} finding(s) in nginx-ui DB"
                    if db_findings
                    else "No malicious content in nginx-ui SQLite tables"
                ),
                checks_run=db_checks or ["users table", "config-related tables scanned for malicious patterns"],
            )
        )
    else:
        areas.append(
            ScanAreaResult(
                area="database",
                status="skipped",
                label="nginx-ui database",
                summary="Skipped — nginx-ui service not active",
                checks_run=[],
            )
        )

    net_summary = "Public nginx-ui probe not applicable"
    if nginx_ui_public_reachable is True:
        net_summary = "nginx-ui publicly reachable — high risk"
    elif nginx_ui_public_reachable is False:
        net_summary = "nginx-ui not reachable from public IP (probe blocked or firewalled)"
    areas.append(
        ScanAreaResult(
            area="network",
            status=_area_status(findings, "network") if net_findings else "clean",
            label="Network exposure",
            summary=net_summary,
            checks_run=["HTTP probe from NetTools to public IP:nginx-ui port"],
        )
    )

    if config_test_ok is False and not any(f.category == "config_test_failed" for f in findings):
        areas[0] = ScanAreaResult(
            area="config",
            status="warning",
            label="Nginx config",
            summary="nginx -t reported errors — review config integrity",
            checks_run=config_checks,
        )

    return areas


def _build_recommendations(
    findings: list[ForensicFinding],
    nginx_ui_active: bool | None,
    nginx_ui_binds_all: bool | None,
    nginx_ui_public_reachable: bool | None,
    nginx_ui_port: int | None,
    public_ip: str | None,
    timeline: list[TimelineEvent],
) -> list[SecurityRecommendation]:
    recs: list[SecurityRecommendation] = []
    categories = {f.category for f in findings}

    if "malicious_redirect" in categories:
        recs.append(
            SecurityRecommendation(
                priority="urgent",
                text="Remove malicious redirect lines and restore legitimate proxy_pass / SSL directives.",
            )
        )
        recs.append(
            SecurityRecommendation(
                priority="urgent",
                text="Open incident ticket and document affected vhost before remediation.",
            )
        )

    if any(f.source == "database" and f.category == "malicious_redirect" for f in findings):
        recs.append(
            SecurityRecommendation(
                priority="urgent",
                text="Malicious content found in nginx-ui database — inspect stored site configs and user accounts.",
            )
        )

    if "nginx_ui_external_login" in categories or "nginx_ui_config_change" in categories:
        recs.append(
            SecurityRecommendation(
                priority="urgent",
                text="Review nginx-ui panel access — config changes detected via panel; verify source IPs and disable unknown accounts.",
            )
        )

    if nginx_ui_active and nginx_ui_public_reachable:
        recs.append(
            SecurityRecommendation(
                priority="urgent",
                text=(
                    f"nginx-ui is reachable on public IP {public_ip}:{nginx_ui_port or 9000} "
                    "— restrict to localhost/VPN and review firewall rules."
                ),
            )
        )
    elif nginx_ui_active and nginx_ui_binds_all and public_ip:
        recs.append(
            SecurityRecommendation(
                priority="follow_up",
                text=(
                    f"nginx-ui binds 0.0.0.0:{nginx_ui_port or 9000} but public probe to "
                    f"{public_ip}:{nginx_ui_port or 9000} failed — likely blocked by firewall/NAT (not public today)."
                ),
            )
        )

    if "nginx_ui_new_user" in categories:
        recs.append(
            SecurityRecommendation(
                priority="follow_up",
                text="Recently created nginx-ui user(s) detected — verify account legitimacy and rotate panel passwords.",
            )
        )

    if any(e.event == "nginx-ui login" for e in timeline):
        recs.append(
            SecurityRecommendation(
                priority="follow_up",
                text=(
                    "Audit nginx-ui access logs — source IPs in syslog are clients that reached the panel "
                    "(may be private/VPN even when public probe fails)."
                ),
            )
        )

    if "ssh_external_login" in categories:
        recs.append(
            SecurityRecommendation(
                priority="follow_up",
                text="SSH login from external IP detected — verify authorized access and review auth.log.",
            )
        )

    if "suspicious_redirect" in categories and "malicious_redirect" not in categories:
        recs.append(
            SecurityRecommendation(
                priority="follow_up",
                text="Review server-level return 301 directives — confirm each target is intentional.",
            )
        )

    if not recs:
        recs.append(
            SecurityRecommendation(
                priority="follow_up",
                text="No critical patterns detected across config, logs, and database. Re-scan after config changes or incidents.",
            )
        )

    return recs


def _overall_severity(findings: list[ForensicFinding]) -> str:
    if not findings:
        return "clean"
    order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    top = max(findings, key=lambda f: order.get(f.severity, 0))
    return top.severity


def _parse_forensic_output(
    server: Server,
    stdout: str,
    stderr: str,
    *,
    nginx_ui_public_reachable: bool | None = None,
    nginx_ui_public_probe: str | None = None,
) -> NginxSecurityScanResult:
    sections = _parse_sections(stdout)
    nginx_v = sections.get("nginx_v", "")
    nginx_version = nginx_v.split("nginx/")[-1].split()[0] if "nginx/" in nginx_v else None
    nginx_ui_active = sections.get("nginx_ui", "").strip() == "active"

    conf_test_raw = sections.get("nginx_conf_test", "")
    config_test_ok = "syntax is ok" in conf_test_raw.lower() and "test is successful" in conf_test_raw.lower()

    ini = sections.get("nginx_ui_ini", "")
    nginx_ui_host, nginx_ui_port = _parse_nginx_ui_ini(ini)
    nginx_ui_binds_all = _binds_all_interfaces(nginx_ui_host) if ini else None
    public_ip = (sections.get("public_ip") or "").strip() or None

    findings: list[ForensicFinding] = []

    for section_key, source in (
        ("malicious_grep", "config"),
        ("external_return", "config"),
    ):
        for line in sections.get(section_key, "").splitlines():
            finding = _classify_line(line, source=source)
            if finding:
                findings.append(finding)

    if not config_test_ok and conf_test_raw.strip():
        findings.append(
            ForensicFinding(
                severity="medium",
                category="config_test_failed",
                source="config",
                file_path="/etc/nginx",
                line_number=None,
                matched_line=conf_test_raw.splitlines()[-1][:240] if conf_test_raw else "nginx -t failed",
                description="nginx configuration test failed — config may be broken or tampered",
            )
        )

    log_grep_findings = _parse_log_grep(sections.get("nginx_access_suspicious", ""), "/var/log/nginx/access.log")
    log_grep_findings += _parse_log_grep(sections.get("nginx_error_suspicious", ""), "/var/log/nginx/error.log")
    findings.extend(log_grep_findings)

    syslog_events, syslog_findings = _parse_syslog_timeline(sections.get("nginx_ui_syslog", ""))
    findings.extend(syslog_findings)

    auth_events, auth_findings = _parse_auth_timeline(sections.get("auth_accepted", ""), failed=False)
    failed_events, failed_findings = _parse_auth_timeline(sections.get("auth_failed", ""), failed=True)
    findings.extend(auth_findings)
    findings.extend(failed_findings)

    db_timeline, db_findings, db_checks = _parse_nginx_ui_db(sections.get("nginx_ui_db", ""))
    findings.extend(db_findings)

    if nginx_ui_active and nginx_ui_public_reachable:
        findings.append(
            ForensicFinding(
                severity="high",
                category="nginx_ui_public_exposure",
                source="network",
                file_path="/usr/local/etc/nginx-ui/app.ini",
                line_number=None,
                matched_line=f"Public probe: {nginx_ui_public_probe or 'reachable'}",
                description="nginx-ui panel reachable from NetTools via server public IP",
            )
        )

    findings = _dedupe_findings(findings)

    timeline: list[TimelineEvent] = []
    timeline.extend(db_timeline)
    timeline.extend(_parse_conf_mtime(sections.get("conf_mtime", "")))
    timeline.extend(syslog_events)
    timeline.extend(auth_events[-5:])
    timeline.extend(failed_events[-5:])

    scan_areas = _build_scan_areas(
        findings,
        nginx_ui_active=nginx_ui_active,
        db_checks=db_checks,
        config_test_ok=config_test_ok if conf_test_raw.strip() else None,
        nginx_ui_public_reachable=nginx_ui_public_reachable,
    )

    clean_scope: list[str] = []
    for area in scan_areas:
        if area.status == "clean":
            clean_scope.append(f"{area.label}: {area.summary}")
        elif area.status == "skipped":
            clean_scope.append(f"{area.label}: skipped")

    recommendations = _build_recommendations(
        findings,
        nginx_ui_active,
        nginx_ui_binds_all,
        nginx_ui_public_reachable,
        nginx_ui_port,
        public_ip,
        timeline,
    )

    return NginxSecurityScanResult(
        server_id=server.id,
        server_name=server.name,
        hostname=sections.get("hostname") or server.hostname,
        private_ip=server.ip,
        public_ip=public_ip,
        nginx_version=nginx_version,
        nginx_ui_active=nginx_ui_active,
        nginx_ui_port=nginx_ui_port,
        nginx_ui_binds_all=nginx_ui_binds_all,
        nginx_ui_exposed=nginx_ui_public_reachable,
        nginx_ui_public_probe=nginx_ui_public_probe,
        findings=findings,
        timeline=timeline,
        recommendations=recommendations,
        scan_areas=scan_areas,
        clean_scope=clean_scope,
        overall_severity=_overall_severity(findings),
        scanned_at=datetime.now(timezone.utc),
        raw_log=stdout + ("\n" + stderr if stderr else ""),
    )


async def run_nginx_security_scan(server: Server) -> NginxSecurityScanResult:
    if not server.ssh_key_path:
        raise SSHError(f"No SSH key configured for server {server.name}")

    settings = get_settings()
    key_path = settings.resolve_path(server.ssh_key_path)
    if not key_path.exists():
        raise SSHError(f"SSH key not found: {key_path}")

    code, stdout, stderr = await run_ssh_command(
        server.ip,
        FORENSIC_SCRIPT,
        user=server.ssh_user,
        key_path=key_path,
        timeout=180,
    )
    if code != 0 and not stdout.strip():
        raise SSHError(stderr or f"Security scan failed with exit code {code}")

    sections = _parse_sections(stdout)
    ini = sections.get("nginx_ui_ini", "")
    _, nginx_ui_port = _parse_nginx_ui_ini(ini)
    public_ip = (sections.get("public_ip") or "").strip() or None
    nginx_ui_active = sections.get("nginx_ui", "").strip() == "active"

    public_reachable: bool | None = None
    public_probe: str | None = None
    if nginx_ui_active and public_ip:
        public_reachable, public_probe = await _probe_public_nginx_ui(public_ip, nginx_ui_port or 9000)

    return _parse_forensic_output(
        server,
        stdout,
        stderr,
        nginx_ui_public_reachable=public_reachable,
        nginx_ui_public_probe=public_probe,
    )
