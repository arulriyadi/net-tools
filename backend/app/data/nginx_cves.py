"""Known NGINX CVEs and version targets for assessment."""

NGINX_STABLE_TARGET = "1.30.2"
NGINX_MAINLINE_TARGET = "1.31.1"

# Ubuntu package revisions that backport specific CVEs on 1.18.x jammy
UBUNTU_BACKPORTS = {
    "CVE-2026-42945": 14.11,
}

KNOWN_CVES = [
    {
        "cve_id": "CVE-2026-42945",
        "module": "ngx_http_rewrite_module",
        "severity": "HIGH / CRITICAL",
        "description": "Heap buffer overflow in rewrite module (unnamed PCRE capture + ? in replacement)",
        "fixed_stable": "1.30.2",
        "fixed_mainline": "1.31.1",
        "affected_branches": "1.30.x, 1.31.x (unpatched); may apply to older with backport gaps",
    },
    {
        "cve_id": "CVE-2026-9256",
        "module": "ngx_http_rewrite_module",
        "severity": "HIGH / CRITICAL",
        "description": "Heap buffer overflow with overlapping PCRE captures in rewrite",
        "fixed_stable": "1.30.2",
        "fixed_mainline": "1.31.1",
        "affected_branches": "1.30.x, 1.31.x (unpatched)",
    },
    {
        "cve_id": "CVE-2026-27651",
        "module": "ngx_mail_auth_http_module",
        "severity": "MEDIUM",
        "description": "Process crash in mail auth module",
        "fixed_stable": "1.30.2",
        "fixed_mainline": "1.31.1",
        "affected_branches": "Ubuntu backport only on older branches",
    },
]
