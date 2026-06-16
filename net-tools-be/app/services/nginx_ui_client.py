import base64
import json
import time
from dataclasses import dataclass
from typing import Any

import httpx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding


class NginxUiApiError(Exception):
    pass


@dataclass
class NginxUiLoginResult:
    token: str
    secure_session_id: str | None = None


def _normalize_base_url(panel_url: str) -> str:
    return panel_url.rstrip("/")


async def _fetch_public_key(client: httpx.AsyncClient, base_url: str) -> str:
    resp = await client.post(
        f"{base_url}/api/crypto/public_key",
        json={"timestamp": int(time.time()), "fingerprint": "nettools"},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    public_key = data.get("public_key")
    if not public_key:
        raise NginxUiApiError("nginx-ui did not return a public key")
    return public_key


def _encrypt_params(public_key_pem: str, payload: dict[str, Any]) -> str:
    public_key = serialization.load_pem_public_key(public_key_pem.encode())
    encrypted = public_key.encrypt(json.dumps(payload).encode(), padding.PKCS1v15())
    return base64.b64encode(encrypted).decode()


async def login(panel_url: str, username: str, password: str) -> NginxUiLoginResult:
    base_url = _normalize_base_url(panel_url)
    async with httpx.AsyncClient(follow_redirects=True) as client:
        public_key = await _fetch_public_key(client, base_url)
        encrypted_params = _encrypt_params(
            public_key,
            {
                "name": username,
                "password": password,
                "otp": "",
                "recovery_code": "",
            },
        )
        resp = await client.post(
            f"{base_url}/api/login",
            json={"encrypted_params": encrypted_params},
            timeout=20,
        )
        if resp.status_code >= 400:
            raise NginxUiApiError(f"Login failed (HTTP {resp.status_code})")

        data = resp.json()
        code = data.get("code")
        if code == 199:
            raise NginxUiApiError("Account requires 2FA — use a service account without 2FA for NetTools")
        if code == 4291:
            raise NginxUiApiError("Too many login attempts — try again later")

        token = data.get("token")
        if not token and isinstance(data.get("AccessTokenPayload"), dict):
            token = data["AccessTokenPayload"].get("token")
        if not token:
            message = data.get("message") or data.get("errorMessage") or data.get("error") or "Login failed"
            raise NginxUiApiError(str(message))

        return NginxUiLoginResult(
            token=token,
            secure_session_id=data.get("secure_session_id") or data.get("SecureSessionID"),
        )


async def verify_connection(panel_url: str, username: str, password: str) -> NginxUiLoginResult:
    return await login(panel_url, username, password)


async def fetch_sites(panel_url: str, token: str) -> list[dict[str, Any]]:
    base_url = _normalize_base_url(panel_url)
    async with httpx.AsyncClient(follow_redirects=True) as client:
        resp = await client.get(
            f"{base_url}/api/sites",
            headers={"Authorization": token},
            timeout=30,
        )
        if resp.status_code >= 400:
            raise NginxUiApiError(f"Failed to load sites (HTTP {resp.status_code})")

        data = resp.json()
        if isinstance(data, dict):
            sites = data.get("data")
            if isinstance(sites, list):
                return sites
        raise NginxUiApiError("Unexpected sites response from nginx-ui")


async def fetch_certs(panel_url: str, token: str) -> list[dict[str, Any]]:
    base_url = _normalize_base_url(panel_url)
    certs: list[dict[str, Any]] = []
    page = 1
    page_size = 100

    async with httpx.AsyncClient(follow_redirects=True) as client:
        while True:
            resp = await client.get(
                f"{base_url}/api/certs",
                params={"page": page, "page_size": page_size},
                headers={"Authorization": token},
                timeout=30,
            )
            if resp.status_code >= 400:
                raise NginxUiApiError(f"Failed to load certificates (HTTP {resp.status_code})")

            data = resp.json()
            if not isinstance(data, dict):
                raise NginxUiApiError("Unexpected certificates response from nginx-ui")

            batch = data.get("data")
            if not isinstance(batch, list):
                raise NginxUiApiError("Unexpected certificates response from nginx-ui")

            certs.extend(item for item in batch if isinstance(item, dict))

            pagination = data.get("pagination") or {}
            total_pages = int(pagination.get("total_pages") or 0)
            if total_pages <= page:
                break
            page += 1

    return certs


async def fetch_detail_status(panel_url: str, token: str) -> dict[str, Any]:
    base_url = _normalize_base_url(panel_url)
    async with httpx.AsyncClient(follow_redirects=True) as client:
        resp = await client.get(
            f"{base_url}/api/nginx/detail_status",
            headers={"Authorization": token},
            timeout=30,
        )
        if resp.status_code >= 400:
            raise NginxUiApiError(f"Failed to load nginx metrics (HTTP {resp.status_code})")

        data = resp.json()
        if not isinstance(data, dict):
            raise NginxUiApiError("Unexpected metrics response from nginx-ui")
        return data

