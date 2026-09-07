from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, sourced from environment variables / .env.

    Every field has a sane local-dev default so the app (and the test suite)
    can boot without a running Postgres or Redis instance -- routers in this
    phase serve tests/attempts/results from in-memory fixtures, and OTP uses
    its own in-memory store, so no I/O happens at import/startup time.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    database_url: str = "postgresql+asyncpg://tslprb:tslprb@localhost:5442/tslprb"
    redis_url: str = "redis://localhost:6379/0"

    # Explicit dev origins by default -- never "*" together with credentials
    # (see app/main.py: allow_credentials is only enabled when this list
    # does not contain "*", since Starlette would otherwise reflect any
    # Origin header back with credentials allowed).
    cors_origins: str = "http://localhost:8081,http://localhost:19006,http://localhost:3000"

    env: str = "dev"

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
