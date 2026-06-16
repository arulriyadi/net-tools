import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings


def _fernet() -> Fernet:
    settings = get_settings()
    raw = settings.credentials_key.strip()
    if raw:
        key = raw.encode() if isinstance(raw, str) else raw
    else:
        digest = hashlib.sha256(settings.database_url.encode()).digest()
        key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt_secret(value: str) -> str:
    try:
        return _fernet().decrypt(value.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Failed to decrypt stored credential") from exc
