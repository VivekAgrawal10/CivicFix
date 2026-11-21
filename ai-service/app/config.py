"""Runtime settings loaded from environment variables or a local .env file."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration shared by HTTP, logging, and future model modules."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="CIVICFIX_",
        extra="ignore",
    )

    environment: str = Field(default="development")
    log_level: str = Field(default="INFO")
    service_name: str = Field(default="civicfix-ai-service")
    api_prefix: str = Field(default="/api/v1")
    model_artifact_dir: Path = Field(default=Path("artifacts/models"))
    # Browsers talk to the Node backend, not this service; CORS only matters for the AI Lab page.
    cors_origins: list[str] = Field(default=["http://localhost:3000", "http://localhost:5173", "http://localhost:5000"])


@lru_cache
def get_settings() -> Settings:
    """Return one immutable settings instance per process."""

    return Settings()
