from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: SecretStr = SecretStr("")
    ai_provider: Literal["mock", "meta"] = "mock"
    model_api_key: SecretStr = SecretStr("")
    meta_timeout_seconds: float = Field(default=30, gt=0, le=120)
    meta_enabled: bool = False
    meta_model: str = Field(default="muse-spark-1.3", min_length=1, max_length=100)
    # Open-set strategy for /identify. "verify" (v2) chosen on the development set and
    # confirmed on the frozen independent set (30-10-2026); "baseline" restores the old prompt.
    identify_strategy: Literal["baseline", "abstain", "comparators", "verify"] = "verify"
    sam_enabled: bool = False
    sam_model: str = Field(default="sam-3.1", min_length=1, max_length=100)
    meta_access_token: SecretStr = SecretStr("")
    meta_min_interval_seconds: float = Field(default=60, ge=1, le=3600)
    forest_manifest: str = ""
    service_mode: Literal["local", "demo"] = "local"
    demo_tokens: dict[str, SecretStr] = Field(default_factory=dict, repr=False)
    budget_requests: int = Field(default=20, ge=1, le=10000)
    budget_requests_per_identity: int = Field(default=5, ge=1, le=1000)
    budget_units: int = Field(default=0, ge=0)
    budget_lifetime_units: int = Field(default=0, ge=0)
    meta_reservation_units: int = Field(default=0, ge=0)
    voice_reservation_units: int = Field(default=0, ge=0)
    guide_reservation_units: int = Field(default=0, ge=0)
    # Lifetime microUSD cap per stable identity (0 = off). Sessions share their identity's cap.
    budget_identity_units: int = Field(default=0, ge=0)
    budget_concurrency: int = Field(default=1, ge=1, le=8)
    # Only an explicit research campaign may disable the daily request counter;
    # monetary, lifetime, identity-cap and concurrency limits always apply.
    budget_daily_requests_enabled: bool = True
    observation_retention_days: int = Field(default=30, ge=1, le=365)
    raster_timeout_seconds: float = Field(default=15, gt=0, le=60)
    cors_origins: list[str] = ["http://localhost:3000"]
    # When set (cloud), every request except /health must carry X-Bosque-Origin with this
    # value. Only the Cloudflare Worker adds it, so the public run.app URL cannot bypass it.
    origin_auth_token: SecretStr = Field(default=SecretStr(""), repr=False)
    # Closed beta (migration 005): DEMO_TOKENS names allowed to create invitations.
    admin_identities: list[str] = Field(default_factory=list)
    session_ttl_minutes: int = Field(default=60, ge=5, le=240)
    session_requests_per_minute: int = Field(default=60, ge=1, le=1000)
    exchange_failures_per_ip: int = Field(default=10, ge=1, le=100)
