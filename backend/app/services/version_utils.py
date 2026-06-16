"""Version parsing and comparison helpers."""

import re

from app.data.nginx_cves import UBUNTU_BACKPORTS


def parse_version(version: str | None) -> tuple[int, int, int] | None:
    if not version:
        return None
    match = re.search(r"(\d+)\.(\d+)\.(\d+)", version)
    if not match:
        return None
    return int(match.group(1)), int(match.group(2)), int(match.group(3))


def version_lt(current: str | None, target: str) -> bool:
    cur = parse_version(current)
    tgt = parse_version(target)
    if not cur or not tgt:
        return False
    return cur < tgt


def parse_ubuntu_revision(package: str | None) -> float | None:
    """Extract 14.11 from '1.18.0-6ubuntu14.11'."""
    if not package:
        return None
    match = re.search(r"ubuntu(\d+)\.(\d+)", package)
    if not match:
        return None
    return float(f"{match.group(1)}.{match.group(2)}")


def is_ubuntu_backport_patched(cve_id: str, package: str | None) -> bool:
    required = UBUNTU_BACKPORTS.get(cve_id)
    if required is None:
        return False
    rev = parse_ubuntu_revision(package)
    return rev is not None and rev >= required
