from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+asyncpg://nettools:nettools_dev@127.0.0.1:5432/nettools"
    app_host: str = "0.0.0.0"
    app_port: int = 8080
    app_debug: bool = True
    ssh_keys_dir: Path = Path("/opt/nettools/data/keys")
    reports_dir: Path = BASE_DIR / "data" / "reports"
    credentials_key: str = ""

    @property
    def base_dir(self) -> Path:
        return BASE_DIR

    @property
    def workspace_root(self) -> Path:
        """cursor-ide root (parent of Jabar/)."""
        return BASE_DIR.parent.parent.parent

    def resolve_path(self, path: str | Path) -> Path:
        p = Path(path)
        if p.is_absolute():
            return p
        return self.workspace_root / p


@lru_cache
def get_settings() -> Settings:
    return Settings()
