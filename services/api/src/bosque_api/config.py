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
    # Open-set strategy for /identify; "baseline" keeps the pre-open-set prompt.
    identify_strategy: Literal["baseline", "abstain", "comparators", "verify"] = "baseline"
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
    budget_concurrency: int = Field(default=1, ge=1, le=8)
    observation_retention_days: int = Field(default=30, ge=1, le=365)
    raster_timeout_seconds: float = Field(default=15, gt=0, le=60)
    cors_origins: list[str] = ["http://localhost:3000"]
